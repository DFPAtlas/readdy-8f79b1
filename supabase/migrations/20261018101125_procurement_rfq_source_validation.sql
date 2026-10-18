-- Validate source ownership and request only quantities not reserved by another order.
CREATE OR REPLACE FUNCTION procurement_private.rfq_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
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
 IF p_action IN ('create_rfq','update_rfq','open_rfq','award_rfq') AND v_req.job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_req.job_id AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'The requisition needs an active job in this company'; END IF;
 IF p_action='create_rfq' AND ((SELECT count(*) FROM public.requisition_lines WHERE requisition_id=v_source) NOT BETWEEN 1 AND 100 OR EXISTS(
   SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=v_source AND (l.quantity<=0 OR l.quantity>1000000 OR length(btrim(l.description)) NOT BETWEEN 1 AND 500 OR length(btrim(l.unit_of_measure)) NOT BETWEEN 1 AND 30 OR (l.material_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.material_catalogue_items m WHERE m.id=l.material_item_id AND m.organisation_id=p_org)))
 )) THEN RAISE EXCEPTION 'The requisition has invalid material lines'; END IF;
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
       SELECT v_id,l.line_number,l.id,l.material_item_id,l.description,l.quantity-reserved.quantity,l.unit_of_measure,l.notes
       FROM public.requisition_lines l CROSS JOIN LATERAL (
         SELECT COALESCE(sum(pl.quantity),0) AS quantity FROM public.purchase_order_lines pl JOIN public.purchase_orders po ON po.id=pl.purchase_order_id
         WHERE pl.requisition_line_id=l.id AND po.status NOT IN ('cancelled','superseded')
       ) reserved WHERE l.requisition_id=v_source AND l.quantity>reserved.quantity;
     IF NOT FOUND THEN RAISE EXCEPTION 'There are no unreserved materials left on this requisition'; END IF;
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
