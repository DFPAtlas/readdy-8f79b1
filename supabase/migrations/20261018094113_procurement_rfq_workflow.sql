ALTER TABLE public.requests_for_quotation ADD COLUMN source_requisition_id uuid REFERENCES public.purchase_requisitions(id),
 ADD COLUMN currency text NOT NULL DEFAULT 'GBP', ADD COLUMN revision integer NOT NULL DEFAULT 1,
 ADD COLUMN awarded_quote_id uuid REFERENCES public.supplier_quote_responses(id), ADD COLUMN purchase_order_id uuid REFERENCES public.purchase_orders(id), ADD COLUMN cancellation_reason text;
ALTER TABLE public.rfq_lines ADD COLUMN requisition_line_id uuid REFERENCES public.requisition_lines(id);
ALTER TABLE public.supplier_quote_responses ADD COLUMN quote_reference text, ADD COLUMN recorded_by uuid,
 ADD COLUMN net_total_pence integer NOT NULL DEFAULT 0, ADD COLUMN tax_total_pence integer NOT NULL DEFAULT 0,
 ADD COLUMN gross_total_pence integer NOT NULL DEFAULT 0, ADD COLUMN delivery_tax_rate numeric(6,4) NOT NULL DEFAULT 0.2;
ALTER TABLE public.supplier_quote_lines ADD COLUMN tax_rate numeric(6,4) NOT NULL DEFAULT 0.2;
CREATE UNIQUE INDEX rfq_reference_normalized ON public.requests_for_quotation(organisation_id,lower(btrim(reference)));
CREATE UNIQUE INDEX quote_response_version_unique ON public.supplier_quote_responses(rfq_supplier_id,version);
CREATE UNIQUE INDEX quote_response_line_unique ON public.supplier_quote_lines(quote_response_id,rfq_line_id);
CREATE INDEX rfq_source_requisition ON public.requests_for_quotation(source_requisition_id);
CREATE INDEX po_line_requisition ON public.purchase_order_lines(requisition_line_id);
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.requests_for_quotation,public.rfq_lines,public.rfq_suppliers,public.supplier_quote_responses,public.supplier_quote_lines FROM PUBLIC,anon,authenticated;

CREATE FUNCTION procurement_private.rfq_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid(); v_role text; v_existing procurement_private.requests;
 v_req public.purchase_requisitions; v_rfq public.requests_for_quotation; v_quote public.supplier_quote_responses;
 v_line record; v_quote_line public.supplier_quote_lines; v_supplier uuid; v_selection uuid; v_id uuid; v_source uuid;
 v_items jsonb; v_item jsonb; v_n integer:=0; v_price bigint; v_rate numeric; v_amount bigint; v_net bigint:=0; v_tax bigint:=0;
 v_delivery bigint; v_delivery_rate numeric; v_version integer; v_reserved numeric; v_order uuid;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request'; END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager') THEN RAISE EXCEPTION 'RFQ permission required' USING ERRCODE='42501'; END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('create_rfq','update_rfq','open_rfq','record_quote','close_rfq','cancel_rfq','award_rfq') THEN RAISE EXCEPTION 'Unknown RFQ action'; END IF;
 IF p_action='award_rfq' AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Only an owner, admin or finance user can accept a quote' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data'; END IF;
   RETURN v_existing.result_id;
 END IF;
 IF p_action='create_rfq' THEN v_source:=(p_data->>'source_requisition_id')::uuid;
 ELSE SELECT source_requisition_id INTO v_source FROM public.requests_for_quotation WHERE id=(p_data->>'rfq_id')::uuid AND organisation_id=p_org;
 END IF;
 -- Source lock serializes awards across different RFQs for the same requisition.
 IF v_source IS NOT NULL THEN
   SELECT * INTO v_req FROM public.purchase_requisitions WHERE id=v_source AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Requisition not found in this company'; END IF;
 ELSIF p_action<>'cancel_rfq' THEN RAISE EXCEPTION 'Choose an approved requisition; older RFQs must be recreated'; END IF;
 IF p_action<>'create_rfq' THEN
   SELECT * INTO v_rfq FROM public.requests_for_quotation WHERE id=(p_data->>'rfq_id')::uuid AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'RFQ not found in this company'; END IF;
   IF (p_data->>'revision')::integer IS DISTINCT FROM v_rfq.revision THEN RAISE EXCEPTION 'This RFQ changed. Reload before making changes'; END IF;
   v_id:=v_rfq.id;
 END IF;
 IF p_action IN ('create_rfq','update_rfq') THEN
   IF v_req.status NOT IN ('approved','partially_ordered') THEN RAISE EXCEPTION 'Choose an approved requisition with materials still to order'; END IF;
   IF p_action='update_rfq' AND v_rfq.status<>'draft' THEN RAISE EXCEPTION 'Only draft RFQs can be edited'; END IF;
   IF length(btrim(COALESCE(p_data->>'reference',''))) NOT BETWEEN 1 AND 80 OR length(btrim(COALESCE(p_data->>'description',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter an RFQ reference and description'; END IF;
   v_items:=p_data->'supplier_ids';
   IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Select 1 to 50 suppliers'; END IF;
   IF (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(v_items))<>jsonb_array_length(v_items) THEN RAISE EXCEPTION 'A supplier cannot be selected twice'; END IF;
   IF NULLIF(p_data->>'response_deadline','')::timestamptz<=now() THEN RAISE EXCEPTION 'Choose a future response deadline'; END IF;
   IF p_action='create_rfq' THEN
     INSERT INTO public.requests_for_quotation(organisation_id,reference,created_by,source_requisition_id,job_id,currency)
       VALUES(p_org,btrim(p_data->>'reference'),v_actor,v_source,v_req.job_id,v_req.currency) RETURNING id INTO v_id;
     INSERT INTO public.rfq_lines(rfq_id,line_number,requisition_line_id,material_item_id,description,quantity,unit_of_measure,notes)
       SELECT v_id,line_number,id,material_item_id,description,quantity,unit_of_measure,notes FROM public.requisition_lines WHERE requisition_id=v_source;
     IF NOT FOUND THEN RAISE EXCEPTION 'Requisition has no material lines'; END IF;
   ELSE DELETE FROM public.rfq_suppliers WHERE rfq_id=v_id;
   END IF;
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
     v_supplier:=(v_item#>>'{}')::uuid;
     IF NOT EXISTS(SELECT 1 FROM public.suppliers WHERE id=v_supplier AND organisation_id=p_org AND status='active' AND archived_at IS NULL) THEN RAISE EXCEPTION 'Select active suppliers in this company'; END IF;
     INSERT INTO public.rfq_suppliers(rfq_id,supplier_id) VALUES(v_id,v_supplier);
   END LOOP;
   UPDATE public.requests_for_quotation SET reference=btrim(p_data->>'reference'),description=btrim(p_data->>'description'),delivery_address=NULLIF(btrim(p_data->>'delivery_address'),''),
     required_by_date=NULLIF(p_data->>'required_by_date','')::date,response_deadline=NULLIF(p_data->>'response_deadline','')::timestamptz,
     commercial_notes=NULLIF(btrim(p_data->>'commercial_notes'),''),internal_notes=NULLIF(btrim(p_data->>'internal_notes'),''),updated_at=now(),revision=CASE WHEN p_action='create_rfq' THEN 1 ELSE revision+1 END WHERE id=v_id;
 ELSIF p_action='open_rfq' THEN
   IF v_rfq.status<>'draft' OR v_req.status NOT IN ('approved','partially_ordered') THEN RAISE EXCEPTION 'Only draft RFQs for approved requisitions can collect quotes'; END IF;
   IF v_rfq.response_deadline IS NOT NULL AND v_rfq.response_deadline<=now() THEN RAISE EXCEPTION 'Update the response deadline before opening'; END IF;
   UPDATE public.requests_for_quotation SET status='issued',issued_at=now(),revision=revision+1,updated_at=now() WHERE id=v_id;
 ELSIF p_action='close_rfq' THEN
   IF v_rfq.status NOT IN ('issued','partially_responded') THEN RAISE EXCEPTION 'Only open quote collection can be closed'; END IF;
   UPDATE public.requests_for_quotation SET status='closed',closed_at=now(),revision=revision+1,updated_at=now() WHERE id=v_id;
 ELSIF p_action='cancel_rfq' THEN
   IF v_rfq.status NOT IN ('draft','issued','partially_responded','closed') THEN RAISE EXCEPTION 'This RFQ cannot be cancelled'; END IF;
   IF length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Give a cancellation reason'; END IF;
   UPDATE public.requests_for_quotation SET status='cancelled',cancellation_reason=btrim(p_data->>'reason'),closed_at=now(),revision=revision+1,updated_at=now() WHERE id=v_id;
 ELSIF p_action='record_quote' THEN
   IF v_rfq.status NOT IN ('issued','partially_responded') THEN RAISE EXCEPTION 'Open quote collection before recording a quote'; END IF;
   SELECT rs.id,rs.supplier_id INTO v_selection,v_supplier FROM public.rfq_suppliers rs JOIN public.suppliers s ON s.id=rs.supplier_id
     WHERE rs.id=(p_data->>'rfq_supplier_id')::uuid AND rs.rfq_id=v_id AND s.organisation_id=p_org AND s.status='active' AND s.archived_at IS NULL;
   IF v_selection IS NULL THEN RAISE EXCEPTION 'Choose a selected, active supplier in this company'; END IF;
   IF length(btrim(COALESCE(p_data->>'quote_reference',''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Enter the supplier quote reference'; END IF;
   v_items:=p_data->'lines';
   IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items)<>(SELECT count(*) FROM public.rfq_lines WHERE rfq_id=v_id) THEN RAISE EXCEPTION 'Quote every RFQ line'; END IF;
   IF (SELECT count(DISTINCT value->>'rfq_line_id') FROM jsonb_array_elements(v_items))<>jsonb_array_length(v_items) THEN RAISE EXCEPTION 'A quote line cannot appear twice'; END IF;
   v_delivery:=COALESCE((p_data->>'delivery_charge_pence')::bigint,0); v_delivery_rate:=COALESCE((p_data->>'delivery_tax_rate')::numeric,0.2);
   IF v_delivery<0 OR v_delivery>100000000 OR v_delivery_rate NOT IN (0,0.05,0.2) OR COALESCE((p_data->>'lead_time_days')::integer,0) NOT BETWEEN 0 AND 3650 THEN RAISE EXCEPTION 'Invalid delivery charge, VAT or lead time'; END IF;
   SELECT COALESCE(max(version),0)+1 INTO v_version FROM public.supplier_quote_responses WHERE rfq_supplier_id=v_selection;
   INSERT INTO public.supplier_quote_responses(rfq_supplier_id,version,quote_reference,recorded_by,delivery_charge_pence,delivery_tax_rate,lead_time_days,validity_date,questions_text,status,submitted_at)
     VALUES(v_selection,v_version,btrim(p_data->>'quote_reference'),v_actor,v_delivery,v_delivery_rate,NULLIF(p_data->>'lead_time_days','')::integer,NULLIF(p_data->>'validity_date','')::date,NULLIF(btrim(p_data->>'notes'),''),'submitted',now()) RETURNING id INTO v_id;
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
     SELECT * INTO v_line FROM public.rfq_lines WHERE id=(v_item->>'rfq_line_id')::uuid AND rfq_id=v_rfq.id;
     IF NOT FOUND THEN RAISE EXCEPTION 'Quote line does not belong to this RFQ'; END IF;
     v_price:=(v_item->>'unit_price_pence')::bigint; v_rate:=(v_item->>'tax_rate')::numeric;
     IF v_price IS NULL OR v_price<0 OR v_price>100000000 OR v_rate IS NULL OR v_rate NOT IN (0,0.05,0.2) THEN RAISE EXCEPTION 'Invalid quoted price or VAT'; END IF;
     v_amount:=round(v_line.quantity*v_price);v_net:=v_net+v_amount;v_tax:=v_tax+round(v_amount*v_rate);
     IF v_net+v_tax+v_delivery+round(v_delivery*v_delivery_rate)>2147483647 THEN RAISE EXCEPTION 'Quoted total is too large'; END IF;
     INSERT INTO public.supplier_quote_lines(quote_response_id,rfq_line_id,unit_price_pence,tax_rate,availability,notes)
       VALUES(v_id,v_line.id,v_price,v_rate,NULLIF(btrim(v_item->>'availability'),''),NULLIF(btrim(v_item->>'notes'),''));
   END LOOP;
   v_net:=v_net+v_delivery;v_tax:=v_tax+round(v_delivery*v_delivery_rate);
   UPDATE public.supplier_quote_responses SET net_total_pence=v_net,tax_total_pence=v_tax,gross_total_pence=v_net+v_tax WHERE id=v_id;
   UPDATE public.rfq_suppliers SET response_received=true,response_at=now() WHERE id=v_selection;
   UPDATE public.requests_for_quotation SET status='partially_responded',revision=revision+1,updated_at=now() WHERE id=v_rfq.id;
 ELSE
   IF v_rfq.status NOT IN ('issued','partially_responded','closed') OR v_req.status NOT IN ('approved','partially_ordered') THEN RAISE EXCEPTION 'This RFQ cannot be awarded'; END IF;
   SELECT q.* INTO v_quote FROM public.supplier_quote_responses q JOIN public.rfq_suppliers rs ON rs.id=q.rfq_supplier_id JOIN public.suppliers s ON s.id=rs.supplier_id
     WHERE q.id=(p_data->>'quote_response_id')::uuid AND rs.rfq_id=v_id AND s.organisation_id=p_org AND s.status='active' AND s.archived_at IS NULL;
   IF NOT FOUND OR v_quote.status<>'submitted' THEN RAISE EXCEPTION 'Choose a recorded supplier quote for this RFQ'; END IF;
   IF v_quote.validity_date<CURRENT_DATE THEN RAISE EXCEPTION 'The supplier quote has expired'; END IF;
   IF v_quote.version<>(SELECT max(version) FROM public.supplier_quote_responses WHERE rfq_supplier_id=v_quote.rfq_supplier_id) THEN RAISE EXCEPTION 'Choose the latest version of this supplier quote'; END IF;
   IF length(btrim(COALESCE(p_data->>'po_number',''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Enter a purchase order reference'; END IF;
   IF (SELECT count(*) FROM public.supplier_quote_lines WHERE quote_response_id=v_quote.id)<>(SELECT count(*) FROM public.rfq_lines WHERE rfq_id=v_id) THEN RAISE EXCEPTION 'The quote is incomplete'; END IF;
   SELECT supplier_id INTO v_supplier FROM public.rfq_suppliers WHERE id=v_quote.rfq_supplier_id;
   INSERT INTO public.purchase_orders(organisation_id,po_number,supplier_id,job_id,requested_by,status,order_date,required_delivery_date,delivery_address,supplier_quote_reference,currency)
     VALUES(p_org,btrim(p_data->>'po_number'),v_supplier,v_req.job_id,v_actor,'draft',CURRENT_DATE,v_rfq.required_by_date,v_rfq.delivery_address,v_quote.quote_reference,v_rfq.currency) RETURNING id INTO v_order;
   FOR v_line IN SELECT r.*,q.unit_price_pence,q.tax_rate,q.availability FROM public.rfq_lines r JOIN public.supplier_quote_lines q ON q.rfq_line_id=r.id AND q.quote_response_id=v_quote.id WHERE r.rfq_id=v_id ORDER BY r.line_number LOOP
     IF NOT EXISTS(SELECT 1 FROM public.requisition_lines l WHERE l.id=v_line.requisition_line_id AND l.requisition_id=v_source AND l.quantity>=v_line.quantity) THEN RAISE EXCEPTION 'RFQ line no longer matches its requisition'; END IF;
     SELECT COALESCE(sum(pl.quantity),0) INTO v_reserved FROM public.purchase_order_lines pl JOIN public.purchase_orders po ON po.id=pl.purchase_order_id WHERE pl.requisition_line_id=v_line.requisition_line_id AND po.status NOT IN ('cancelled','superseded');
     IF v_reserved+v_line.quantity>(SELECT quantity FROM public.requisition_lines WHERE id=v_line.requisition_line_id) THEN RAISE EXCEPTION 'These materials are already reserved by another purchase order'; END IF;
     v_n:=v_n+1;v_amount:=round(v_line.quantity*v_line.unit_price_pence);v_net:=v_net+v_amount;v_tax:=v_tax+round(v_amount*v_line.tax_rate);
     INSERT INTO public.purchase_order_lines(purchase_order_id,line_number,requisition_line_id,material_item_id,description,quantity,unit_of_measure,unit_price_pence,line_total_pence,tax_rate,notes)
       VALUES(v_order,v_n,v_line.requisition_line_id,v_line.material_item_id,v_line.description,v_line.quantity,v_line.unit_of_measure,v_line.unit_price_pence,v_amount,v_line.tax_rate,v_line.availability);
   END LOOP;
   IF v_quote.delivery_charge_pence>0 THEN
     v_amount:=v_quote.delivery_charge_pence;v_net:=v_net+v_amount;v_tax:=v_tax+round(v_amount*v_quote.delivery_tax_rate);
     INSERT INTO public.purchase_order_lines(purchase_order_id,line_number,description,quantity,unit_of_measure,unit_price_pence,line_total_pence,tax_rate)
       VALUES(v_order,v_n+1,'Supplier delivery charge',1,'service',v_amount,v_amount,v_quote.delivery_tax_rate);
   END IF;
   IF v_net IS DISTINCT FROM v_quote.net_total_pence OR v_tax IS DISTINCT FROM v_quote.tax_total_pence OR v_net+v_tax IS DISTINCT FROM v_quote.gross_total_pence THEN RAISE EXCEPTION 'Quote totals require review; record a new version'; END IF;
   UPDATE public.purchase_orders SET net_total_pence=v_net,tax_total_pence=v_tax,gross_total_pence=v_net+v_tax WHERE id=v_order;
   UPDATE public.requests_for_quotation SET status='awarded',awarded_at=now(),awarded_quote_id=v_quote.id,purchase_order_id=v_order,revision=revision+1,updated_at=now() WHERE id=v_id;
   v_id:=v_order;
 END IF;
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.rfq_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.rfq_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_rfq_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.rfq_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_rfq_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_rfq_write(uuid,uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION procurement_private.write_operation(p_org uuid, p_request uuid, p_action text, p_data jsonb)
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
    INSERT INTO public.purchase_orders(organisation_id,po_number,supplier_id,job_id,requested_by,status,order_date,required_delivery_date,delivery_address,instructions,currency)
      VALUES(p_org,btrim(p_data->>'po_number'),v_supplier,v_job,v_actor,'draft',CURRENT_DATE,NULLIF(p_data->>'required_delivery_date','')::date,NULLIF(btrim(p_data->>'delivery_address'),''),NULLIF(btrim(p_data->>'instructions'),''),(SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') FROM public.organisations WHERE id=p_org)) RETURNING id INTO v_id;
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
      -- Draft orders reserve quantities; requisition ordering status changes only on PO approval.
      PERFORM 1 FROM public.purchase_requisitions r WHERE r.id IN (
        SELECT l.requisition_id FROM public.requisition_lines l JOIN public.purchase_order_lines pl ON pl.requisition_line_id=l.id WHERE pl.purchase_order_id=v_order.id
      ) ORDER BY r.id FOR UPDATE;
      UPDATE public.purchase_requisitions r SET status=CASE WHEN NOT EXISTS(
        SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=r.id AND l.quantity>(
          SELECT COALESCE(sum(pl.quantity),0) FROM public.purchase_order_lines pl JOIN public.purchase_orders po ON po.id=pl.purchase_order_id
          WHERE pl.requisition_line_id=l.id AND po.status NOT IN ('draft','awaiting_approval','cancelled','superseded')
        )) THEN 'fully_ordered'::public.requisition_status ELSE 'partially_ordered'::public.requisition_status END,
        revision=r.revision+1,updated_at=now()
        WHERE r.organisation_id=p_org AND r.status IN ('approved','partially_ordered','fully_ordered') AND r.id IN (
          SELECT l.requisition_id FROM public.requisition_lines l JOIN public.purchase_order_lines pl ON pl.requisition_line_id=l.id WHERE pl.purchase_order_id=v_order.id);
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
