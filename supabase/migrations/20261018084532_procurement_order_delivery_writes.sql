-- All writes are atomic, role-checked operations. Existing organisation-scoped read policies remain in force.
CREATE SCHEMA IF NOT EXISTS procurement_private;
REVOKE ALL ON SCHEMA procurement_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA procurement_private TO authenticated;
CREATE TABLE procurement_private.requests (
  organisation_id uuid NOT NULL REFERENCES public.organisations(id),
  request_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL,
  result_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, request_id)
);
ALTER TABLE procurement_private.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.requests FROM PUBLIC, anon, authenticated;

CREATE FUNCTION procurement_private.write_operation(p_org uuid, p_request uuid, p_action text, p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid(); v_role text; v_existing procurement_private.requests;
  v_id uuid; v_supplier uuid; v_job uuid; v_order public.purchase_orders; v_line public.purchase_order_lines;
  v_item jsonb; v_lines jsonb; v_number integer := 0; v_quantity numeric; v_price bigint; v_rate numeric;
  v_net bigint := 0; v_tax bigint := 0; v_total bigint; v_accepted numeric; v_rejected numeric; v_damaged numeric;
  v_remaining numeric; v_receipt_status public.goods_receipt_status; v_has_damage boolean := false; v_has_rejection boolean := false;
BEGIN
  IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Sign in and provide a valid request' USING ERRCODE = '22023';
  END IF;
  SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager','finance','site_supervisor') THEN
    RAISE EXCEPTION 'You do not have permission to change procurement records' USING ERRCODE='42501';
  END IF;
  IF NOT public.org_has_write_access(p_org) THEN
    RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';
  END IF;
  IF p_action NOT IN ('create_supplier','create_order','approve_order','record_delivery') THEN RAISE EXCEPTION 'Unknown procurement action'; END IF;
  IF p_action IN ('create_order','create_supplier') AND v_role='site_supervisor' THEN RAISE EXCEPTION 'Only procurement managers can create orders' USING ERRCODE='42501'; END IF;
  IF p_action='approve_order' AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Only an owner, admin or finance user can approve orders' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text || p_request::text,0));
  SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
  IF FOUND THEN
    IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'This submission was already used for different data'; END IF;
    RETURN v_existing.result_id;
  END IF;
  IF p_action='create_supplier' THEN
    IF length(btrim(COALESCE(p_data->>'trading_name',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Enter a supplier name of 1 to 200 characters'; END IF;
    INSERT INTO public.suppliers(organisation_id,trading_name,legal_name,payment_terms,status) VALUES(p_org,btrim(p_data->>'trading_name'),NULLIF(btrim(p_data->>'legal_name'),''),NULLIF(btrim(p_data->>'payment_terms'),''),'active') RETURNING id INTO v_id;
  ELSIF p_action='create_order' THEN
    v_supplier := (p_data->>'supplier_id')::uuid; v_job := NULLIF(p_data->>'job_id','')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.suppliers WHERE id=v_supplier AND organisation_id=p_org AND status='active' AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active supplier in this company'; END IF;
    IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose a job in this company'; END IF;
    IF length(btrim(COALESCE(p_data->>'po_number',''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Enter an order reference of 1 to 80 characters'; END IF;
    v_lines := p_data->'lines';
    IF jsonb_typeof(v_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(v_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 order lines'; END IF;
    INSERT INTO public.purchase_orders(organisation_id,po_number,supplier_id,job_id,requested_by,status,order_date,required_delivery_date,delivery_address,instructions)
      VALUES(p_org,btrim(p_data->>'po_number'),v_supplier,v_job,v_actor,'draft',CURRENT_DATE,NULLIF(p_data->>'required_delivery_date','')::date,NULLIF(btrim(p_data->>'delivery_address'),''),NULLIF(btrim(p_data->>'instructions'),'')) RETURNING id INTO v_id;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
      v_number := v_number+1; v_quantity := (v_item->>'quantity')::numeric; v_price := (v_item->>'unit_price_pence')::bigint; v_rate := (v_item->>'tax_rate')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000 OR v_quantity<>round(v_quantity,4) OR v_price IS NULL OR v_price<0 OR v_price>100000000 OR v_rate IS NULL OR v_rate NOT IN (0,0.05,0.2) OR length(btrim(COALESCE(v_item->>'description',''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid quantity, price, VAT rate or description on line %',v_number; END IF;
      v_total := round(v_quantity*v_price); v_net := v_net+v_total; v_tax := v_tax+round(v_total*v_rate);
      IF v_net+v_tax>2147483647 THEN RAISE EXCEPTION 'Order total is too large'; END IF;
      INSERT INTO public.purchase_order_lines(purchase_order_id,line_number,description,quantity,unit_of_measure,unit_price_pence,line_total_pence,tax_rate)
        VALUES(v_id,v_number,btrim(v_item->>'description'),v_quantity,COALESCE(NULLIF(btrim(v_item->>'unit_of_measure'),''),'each'),v_price,v_total,v_rate);
    END LOOP;
    UPDATE public.purchase_orders SET net_total_pence=v_net,tax_total_pence=v_tax,gross_total_pence=v_net+v_tax WHERE id=v_id;
  ELSE
    SELECT * INTO v_order FROM public.purchase_orders WHERE id=(p_data->>'purchase_order_id')::uuid AND organisation_id=p_org FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in this company'; END IF;
    IF p_action='approve_order' THEN
      IF v_order.status<>'draft' THEN RAISE EXCEPTION 'Only a draft order can be approved'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id) THEN RAISE EXCEPTION 'An empty order cannot be approved'; END IF;
      UPDATE public.purchase_orders SET status='approved',approved_by=v_actor,updated_at=now() WHERE id=v_order.id;
      v_id := v_order.id;
    ELSE
      IF v_order.status NOT IN ('approved','issued','acknowledged','partially_delivered') THEN RAISE EXCEPTION 'Only an approved, open order can receive deliveries'; END IF;
      v_lines := p_data->'lines';
      IF jsonb_typeof(v_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(v_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 delivery lines'; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_lines) x GROUP BY x->>'purchase_order_line_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'A delivery line cannot appear twice'; END IF;
      IF NULLIF(p_data->>'arrival_date','') IS NULL THEN RAISE EXCEPTION 'Enter the arrival date'; END IF;
      INSERT INTO public.goods_receipts(organisation_id,purchase_order_id,supplier_id,job_id,received_by,delivery_note_number,arrival_date,notes,status)
        VALUES(p_org,v_order.id,v_order.supplier_id,v_order.job_id,v_actor,NULLIF(btrim(p_data->>'delivery_note_number'),''),(p_data->>'arrival_date')::date,NULLIF(btrim(p_data->>'notes'),''),'partial') RETURNING id INTO v_id;
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
        SELECT * INTO v_line FROM public.purchase_order_lines WHERE id=(v_item->>'purchase_order_line_id')::uuid AND purchase_order_id=v_order.id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Delivery line does not belong to this order'; END IF;
        v_accepted := COALESCE((v_item->>'accepted_quantity')::numeric,0); v_rejected := COALESCE((v_item->>'rejected_quantity')::numeric,0); v_damaged := COALESCE((v_item->>'damaged_quantity')::numeric,0);
        v_remaining := v_line.quantity-COALESCE(v_line.received_quantity,0);
        IF v_accepted<0 OR v_rejected<0 OR v_damaged<0 OR v_accepted<>round(v_accepted,4) OR v_rejected<>round(v_rejected,4) OR v_damaged<>round(v_damaged,4) OR v_accepted+v_rejected+v_damaged<=0 OR v_accepted+v_rejected+v_damaged>v_remaining THEN RAISE EXCEPTION 'Delivered quantities must be positive and cannot exceed the outstanding quantity'; END IF;
        INSERT INTO public.goods_receipt_lines(goods_receipt_id,purchase_order_line_id,ordered_quantity,previously_received,received_now,accepted_quantity,rejected_quantity,damaged_quantity,missing_quantity,notes)
          VALUES(v_id,v_line.id,v_line.quantity,COALESCE(v_line.received_quantity,0),v_accepted+v_rejected+v_damaged,v_accepted,v_rejected,v_damaged,v_remaining-v_accepted,NULLIF(btrim(v_item->>'notes'),''));
        UPDATE public.purchase_order_lines SET received_quantity=COALESCE(received_quantity,0)+v_accepted WHERE id=v_line.id;
        v_has_damage := v_has_damage OR v_damaged>0; v_has_rejection := v_has_rejection OR v_rejected>0;
        IF v_damaged+v_rejected>0 THEN
          INSERT INTO public.delivery_issues(organisation_id,goods_receipt_id,purchase_order_id,issue_type,description,reported_by,status)
            VALUES(p_org,v_id,v_order.id,CASE WHEN v_damaged>0 THEN 'damaged' ELSE 'rejected' END,v_line.description || ': ' || v_damaged || ' damaged; ' || v_rejected || ' rejected. ' || COALESCE(v_item->>'notes',''),v_actor,'open');
        END IF;
      END LOOP;
      IF NOT EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id AND COALESCE(received_quantity,0)<quantity) THEN
        UPDATE public.purchase_orders SET status='fully_delivered',updated_at=now() WHERE id=v_order.id;
        v_receipt_status := 'complete';
      ELSE
        IF EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id AND received_quantity>0) THEN UPDATE public.purchase_orders SET status='partially_delivered',updated_at=now() WHERE id=v_order.id; END IF;
        v_receipt_status := 'partial';
      END IF;
      IF v_has_damage THEN v_receipt_status:='damaged'; ELSIF v_has_rejection THEN v_receipt_status:='rejected'; END IF;
      UPDATE public.goods_receipts SET status=v_receipt_status WHERE id=v_id;
    END IF;
  END IF;
  INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.write_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.write_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_write(p_org uuid,p_request uuid,p_action text,p_data jsonb)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.write_operation(p_org,p_request,p_action,p_data); $$;
REVOKE ALL ON FUNCTION public.procurement_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_write(uuid,uuid,text,jsonb) TO authenticated;
-- Keep reads under existing RLS; prevent direct API writes bypassing business validation.
REVOKE INSERT,UPDATE,DELETE ON public.purchase_orders,public.purchase_order_lines,public.goods_receipts,public.goods_receipt_lines FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
