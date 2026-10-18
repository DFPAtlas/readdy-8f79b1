ALTER TABLE public.supplier_returns ADD COLUMN revision integer NOT NULL DEFAULT 1, ADD COLUMN returned_at date, ADD COLUMN currency text NOT NULL DEFAULT 'GBP';
ALTER TABLE public.supplier_return_lines ADD COLUMN return_condition text CHECK(return_condition IN ('accepted','rejected','damaged'));
ALTER TABLE public.purchase_orders ADD COLUMN returns_recorded_at timestamptz;
ALTER TABLE public.supplier_credit_notes ADD COLUMN supplier_return_id uuid REFERENCES public.supplier_returns(id), ADD COLUMN net_amount_pence integer NOT NULL DEFAULT 0,
 ADD COLUMN tax_amount_pence integer NOT NULL DEFAULT 0, ADD COLUMN recorded_by uuid, ADD COLUMN voided_by uuid, ADD COLUMN voided_at timestamptz, ADD COLUMN void_reason text;
CREATE UNIQUE INDEX supplier_return_reference_normalized ON public.supplier_returns(organisation_id,lower(btrim(return_reference)));
ALTER TABLE public.supplier_credit_notes DROP CONSTRAINT supplier_credit_notes_organisation_id_supplier_id_credit_no_key;
CREATE UNIQUE INDEX supplier_credit_reference_normalized ON public.supplier_credit_notes(organisation_id,supplier_id,lower(btrim(credit_note_number))) WHERE status IS DISTINCT FROM 'void';
CREATE INDEX return_line_source ON public.supplier_return_lines(goods_receipt_line_id);
CREATE INDEX credit_return_link ON public.supplier_credit_notes(supplier_return_id);
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.supplier_returns,public.supplier_return_lines,public.supplier_credit_notes FROM PUBLIC,anon,authenticated;

CREATE FUNCTION procurement_private.return_credit_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid();v_role text;v_existing procurement_private.requests;v_order public.purchase_orders;v_return public.supplier_returns;
 v_invoice public.supplier_invoices;v_credit public.supplier_credit_notes;v_source uuid;v_id uuid;v_return_id uuid;v_item jsonb;v_items jsonb;v_line record;
 v_qty numeric;v_available numeric;v_condition text;v_reserved numeric;v_net bigint;v_tax bigint;v_total bigint;v_credits bigint;v_date date;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request';END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager','site_supervisor') THEN RAISE EXCEPTION 'Procurement permission required' USING ERRCODE='42501';END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';END IF;
 IF p_action IS NULL OR p_action NOT IN ('create_return','collect_return','complete_return','cancel_return','record_credit','void_credit') THEN RAISE EXCEPTION 'Unknown returns action';END IF;
 IF p_action IN ('record_credit','void_credit') AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Only owner, admin or finance users can record or void credit notes' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data';END IF;
   RETURN v_existing.result_id;
 END IF;
 IF p_action='create_return' THEN v_source:=(p_data->>'purchase_order_id')::uuid;
 ELSIF p_action IN ('collect_return','complete_return','cancel_return') THEN SELECT purchase_order_id INTO v_source FROM public.supplier_returns WHERE id=(p_data->>'return_id')::uuid AND organisation_id=p_org;
 ELSE
   IF p_action='record_credit' THEN
     SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id=(p_data->>'invoice_id')::uuid AND organisation_id=p_org;
   ELSE
     SELECT * INTO v_credit FROM public.supplier_credit_notes WHERE id=(p_data->>'credit_id')::uuid AND organisation_id=p_org;
     IF NOT FOUND THEN RAISE EXCEPTION 'Credit note not found in this company';END IF;
     SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id=v_credit.supplier_invoice_id AND organisation_id=p_org;
   END IF;
   IF v_invoice.id IS NULL THEN RAISE EXCEPTION 'Invoice not found in this company';END IF;
   v_source:=v_invoice.purchase_order_id;
 END IF;
 IF v_source IS NOT NULL THEN SELECT * INTO v_order FROM public.purchase_orders WHERE id=v_source AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in this company';END IF;
 ELSIF p_action NOT IN ('record_credit','void_credit') THEN RAISE EXCEPTION 'Return order not found in this company';END IF;
 IF p_action='create_return' THEN
   IF v_order.status IN ('draft','awaiting_approval','cancelled','superseded') THEN RAISE EXCEPTION 'Choose an order with recorded deliveries';END IF;
   IF length(btrim(COALESCE(p_data->>'reference',''))) NOT BETWEEN 1 AND 80 OR length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter a return reference and reason';END IF;
   IF p_data->>'return_method' IS NULL OR p_data->>'return_method' NOT IN ('supplier_collection','drop_off','courier') THEN RAISE EXCEPTION 'Choose a return method';END IF;
   v_items:=p_data->'lines';
   IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 return lines';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_items) x GROUP BY x->>'goods_receipt_line_id',COALESCE(x->>'condition','accepted') HAVING count(*)>1) THEN RAISE EXCEPTION 'A receipt condition cannot appear twice';END IF;
   INSERT INTO public.supplier_returns(organisation_id,return_reference,supplier_id,purchase_order_id,reason,collection_address,collection_date,return_method,created_by,currency)
     VALUES(p_org,btrim(p_data->>'reference'),v_order.supplier_id,v_order.id,btrim(p_data->>'reason'),NULLIF(btrim(p_data->>'collection_address'),''),NULLIF(p_data->>'collection_date','')::date,p_data->>'return_method',v_actor,v_order.currency) RETURNING id INTO v_id;
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
     SELECT rl.*,pl.description,pl.unit_price_pence INTO v_line FROM public.goods_receipt_lines rl JOIN public.goods_receipts r ON r.id=rl.goods_receipt_id JOIN public.purchase_order_lines pl ON pl.id=rl.purchase_order_line_id
       WHERE rl.id=(v_item->>'goods_receipt_line_id')::uuid AND r.purchase_order_id=v_order.id AND r.organisation_id=p_org AND pl.purchase_order_id=v_order.id;
     IF NOT FOUND THEN RAISE EXCEPTION 'Choose receipt lines from this order';END IF;
     IF EXISTS(SELECT 1 FROM public.supplier_return_lines l JOIN public.supplier_returns r ON r.id=l.supplier_return_id WHERE l.goods_receipt_line_id=v_line.id AND l.return_condition IS NULL AND r.status<>'cancelled') THEN RAISE EXCEPTION 'Earlier return quantities need reconciliation before another return';END IF;
     v_condition:=COALESCE(v_item->>'condition','accepted');v_qty:=(v_item->>'quantity')::numeric;
     IF v_condition NOT IN ('accepted','rejected','damaged') OR v_qty IS NULL OR v_qty<=0 OR v_qty>1000000 OR v_qty<>round(v_qty,4) THEN RAISE EXCEPTION 'Invalid return condition or quantity';END IF;
     v_available:=CASE v_condition WHEN 'accepted' THEN v_line.accepted_quantity WHEN 'rejected' THEN COALESCE(v_line.rejected_quantity,0) ELSE COALESCE(v_line.damaged_quantity,0) END;
     SELECT COALESCE(sum(l.quantity),0) INTO v_reserved FROM public.supplier_return_lines l JOIN public.supplier_returns r ON r.id=l.supplier_return_id WHERE l.goods_receipt_line_id=v_line.id AND l.return_condition=v_condition AND r.status<>'cancelled';
     IF v_qty+v_reserved>v_available THEN RAISE EXCEPTION 'Return quantity exceeds the unreserved received quantity';END IF;
     INSERT INTO public.supplier_return_lines(supplier_return_id,goods_receipt_line_id,description,quantity,unit_price_pence,reason,return_condition) VALUES(v_id,v_line.id,v_line.description,v_qty,v_line.unit_price_pence,btrim(p_data->>'reason'),v_condition);
   END LOOP;
 ELSIF p_action IN ('collect_return','complete_return','cancel_return') THEN
   SELECT * INTO v_return FROM public.supplier_returns WHERE id=(p_data->>'return_id')::uuid AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Return not found in this company';END IF;
   IF (p_data->>'revision')::integer IS DISTINCT FROM v_return.revision THEN RAISE EXCEPTION 'This return changed. Reload before making changes';END IF;
   v_id:=v_return.id;
   IF p_action='cancel_return' THEN
     IF v_return.status NOT IN ('authorised','in_progress') THEN RAISE EXCEPTION 'Collected or completed returns cannot be cancelled';END IF;
     UPDATE public.supplier_returns SET status='cancelled',revision=revision+1,updated_at=now() WHERE id=v_id;
   ELSE
     v_date:=NULLIF(p_data->>'date','')::date;
     IF v_date IS NULL OR v_date>CURRENT_DATE THEN RAISE EXCEPTION 'Enter the actual date, no later than today';END IF;
     IF p_action='collect_return' THEN
       IF v_return.status NOT IN ('authorised','in_progress') THEN RAISE EXCEPTION 'Only a pending return can be collected';END IF;
       UPDATE public.supplier_returns SET status='collected',collection_date=v_date,revision=revision+1,updated_at=now() WHERE id=v_id;
     ELSE
       IF v_return.status NOT IN ('authorised','in_progress','collected') THEN RAISE EXCEPTION 'This return is already completed or cancelled';END IF;
       IF v_return.status='collected' AND v_date<v_return.collection_date THEN RAISE EXCEPTION 'Return date cannot precede collection';END IF;
       UPDATE public.supplier_returns SET status='returned',returned_at=v_date,revision=revision+1,updated_at=now() WHERE id=v_id;
       UPDATE public.purchase_order_lines pl SET received_quantity=GREATEST(0,
         (SELECT COALESCE(sum(rl.accepted_quantity),0) FROM public.goods_receipt_lines rl JOIN public.goods_receipts r ON r.id=rl.goods_receipt_id WHERE rl.purchase_order_line_id=pl.id AND r.purchase_order_id=v_order.id AND r.organisation_id=p_org)
         -(SELECT COALESCE(sum(l.quantity),0) FROM public.supplier_return_lines l JOIN public.supplier_returns r ON r.id=l.supplier_return_id JOIN public.goods_receipt_lines rl ON rl.id=l.goods_receipt_line_id WHERE rl.purchase_order_line_id=pl.id AND r.status IN ('returned','credited') AND l.return_condition='accepted'))
         WHERE pl.purchase_order_id=v_order.id;
       UPDATE public.purchase_orders SET returns_recorded_at=clock_timestamp(),updated_at=clock_timestamp(),status=CASE WHEN status='closed' THEN status WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id AND COALESCE(received_quantity,0)<quantity) THEN 'fully_delivered'::public.purchase_order_status WHEN EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id AND received_quantity>0) THEN 'partially_delivered'::public.purchase_order_status ELSE 'approved'::public.purchase_order_status END WHERE id=v_order.id;
     END IF;
   END IF;
 ELSE
   SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id=v_invoice.id AND organisation_id=p_org FOR UPDATE;
   IF p_action='record_credit' THEN
     IF v_invoice.status IN ('draft','cancelled') THEN RAISE EXCEPTION 'Choose a recorded, non-cancelled invoice';END IF;
     v_net:=(p_data->>'net_amount_pence')::bigint;v_tax:=(p_data->>'tax_amount_pence')::bigint;v_total:=v_net+v_tax;
     IF v_net IS NULL OR v_tax IS NULL OR v_net<0 OR v_tax<0 OR v_total<=0 OR v_total>2147483647 THEN RAISE EXCEPTION 'Enter positive credit totals from the supplier document';END IF;
     IF length(btrim(COALESCE(p_data->>'reference',''))) NOT BETWEEN 1 AND 100 OR length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter the credit reference and reason';END IF;
     v_date:=NULLIF(p_data->>'date','')::date;
     IF v_date IS NULL OR v_date>CURRENT_DATE THEN RAISE EXCEPTION 'Enter the received credit note date';END IF;
     SELECT COALESCE(sum(amount_pence),0) INTO v_credits FROM public.supplier_credit_notes WHERE supplier_invoice_id=v_invoice.id AND status IS DISTINCT FROM 'void';
     IF v_credits+v_total>v_invoice.gross_amount_pence THEN RAISE EXCEPTION 'Total credits cannot exceed the invoice amount';END IF;
     v_return_id:=NULLIF(p_data->>'return_id','')::uuid;
     IF v_return_id IS NOT NULL THEN
       SELECT * INTO v_return FROM public.supplier_returns WHERE id=v_return_id AND organisation_id=p_org AND purchase_order_id=v_invoice.purchase_order_id AND supplier_id=v_invoice.supplier_id FOR UPDATE;
       IF NOT FOUND OR v_return.status NOT IN ('returned','credited') THEN RAISE EXCEPTION 'Link a completed return for the same supplier and order';END IF;
     END IF;
     INSERT INTO public.supplier_credit_notes(organisation_id,supplier_id,supplier_invoice_id,supplier_return_id,credit_note_number,credit_note_date,net_amount_pence,tax_amount_pence,amount_pence,currency,reason,recorded_by)
       VALUES(p_org,v_invoice.supplier_id,v_invoice.id,v_return_id,btrim(p_data->>'reference'),v_date,v_net,v_tax,v_total,v_invoice.currency,btrim(p_data->>'reason'),v_actor) RETURNING id INTO v_id;
   ELSE
     SELECT * INTO v_credit FROM public.supplier_credit_notes WHERE id=v_credit.id AND organisation_id=p_org FOR UPDATE;
     IF v_credit.status='void' THEN RAISE EXCEPTION 'This credit is already void';END IF;
     IF length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Give a reason for voiding the record';END IF;
     UPDATE public.supplier_credit_notes SET status='void',voided_by=v_actor,voided_at=now(),void_reason=btrim(p_data->>'reason'),updated_at=now() WHERE id=v_credit.id;
     v_id:=v_credit.id;v_return_id:=v_credit.supplier_return_id;
   END IF;
   IF v_return_id IS NOT NULL THEN
     SELECT COALESCE(sum(amount_pence),0) INTO v_credits FROM public.supplier_credit_notes WHERE supplier_return_id=v_return_id AND status IS DISTINCT FROM 'void';
     UPDATE public.supplier_returns SET credit_note_received=v_credits>0,credit_note_amount_pence=v_credits,credit_note_reference=NULL,revision=revision+1,updated_at=now() WHERE id=v_return_id;
   END IF;
 END IF;
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.return_credit_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.return_credit_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_return_credit_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.return_credit_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_return_credit_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_return_credit_write(uuid,uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION procurement_private.check_invoice(p_invoice uuid,p_actor uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_invoice public.supplier_invoices; v_line record; v_other numeric; v_received numeric;
 v_expected_net bigint:=0; v_expected_tax bigint:=0; v_expected_line bigint;
 v_price boolean:=true; v_quantity boolean:=true; v_tax boolean:=true; v_exceptions jsonb:='[]';
BEGIN
 SELECT * INTO STRICT v_invoice FROM public.supplier_invoices WHERE id=p_invoice;
 IF NOT EXISTS(SELECT 1 FROM public.supplier_invoice_lines WHERE supplier_invoice_id=p_invoice) THEN
   v_quantity:=false; v_exceptions:=v_exceptions || jsonb_build_array('Invoice has no lines');
 END IF;
 FOR v_line IN SELECT il.*,pl.unit_price_pence AS ordered_price,pl.tax_rate AS ordered_tax,pl.quantity AS ordered_quantity,
   pl.purchase_order_id AS line_order FROM public.supplier_invoice_lines il
   LEFT JOIN public.purchase_order_lines pl ON pl.id=il.purchase_order_line_id WHERE il.supplier_invoice_id=p_invoice LOOP
   v_expected_line:=round(COALESCE(v_line.quantity,0)*v_line.unit_price_pence);
   v_expected_net:=v_expected_net+v_expected_line;
   v_expected_tax:=v_expected_tax+round(v_expected_line*COALESCE(v_line.tax_rate,0));
   IF v_line.line_total_pence IS DISTINCT FROM v_expected_line THEN
     v_price:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': incorrect net amount');
   END IF;
   IF v_line.line_order IS DISTINCT FROM v_invoice.purchase_order_id OR v_line.line_order IS NULL THEN
     v_quantity:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': missing order line'); CONTINUE;
   END IF;
   IF v_line.unit_price_pence IS DISTINCT FROM v_line.ordered_price THEN
     v_price:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': unit price differs from order');
   END IF;
   IF v_line.tax_rate IS DISTINCT FROM v_line.ordered_tax OR v_line.tax_rate IS NULL THEN
     v_tax:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': VAT differs from order');
   END IF;
   SELECT COALESCE(sum(il.quantity),0) INTO v_other FROM public.supplier_invoice_lines il
     JOIN public.supplier_invoices i ON i.id=il.supplier_invoice_id
     WHERE il.purchase_order_line_id=v_line.purchase_order_line_id AND il.id<>v_line.id AND i.organisation_id=v_invoice.organisation_id AND i.status<>'cancelled';
   SELECT COALESCE(sum(rl.accepted_quantity),0) INTO v_received FROM public.goods_receipt_lines rl
     JOIN public.goods_receipts r ON r.id=rl.goods_receipt_id
     WHERE rl.purchase_order_line_id=v_line.purchase_order_line_id AND r.organisation_id=v_invoice.organisation_id AND r.purchase_order_id=v_invoice.purchase_order_id;
   v_received:=v_received-(SELECT COALESCE(sum(l.quantity),0) FROM public.supplier_return_lines l JOIN public.supplier_returns r ON r.id=l.supplier_return_id JOIN public.goods_receipt_lines rl ON rl.id=l.goods_receipt_line_id WHERE rl.purchase_order_line_id=v_line.purchase_order_line_id AND r.organisation_id=v_invoice.organisation_id AND r.status IN ('returned','credited') AND l.return_condition='accepted');
   IF v_line.quantity IS NULL OR v_line.quantity<=0 OR v_line.quantity+v_other>v_line.ordered_quantity OR v_line.quantity+v_other>v_received THEN
     v_quantity:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': cumulative invoiced quantity exceeds ordered or accepted delivery quantity');
   END IF;
 END LOOP;
 IF v_invoice.currency IS DISTINCT FROM (SELECT currency FROM public.purchase_orders WHERE id=v_invoice.purchase_order_id) OR v_invoice.net_amount_pence<>v_expected_net OR v_invoice.tax_amount_pence IS DISTINCT FROM v_expected_tax OR v_invoice.gross_amount_pence<>v_expected_net+v_expected_tax THEN
   v_price:=false; v_exceptions:=v_exceptions || jsonb_build_array('Invoice totals or currency require review');
 END IF;
 INSERT INTO public.invoice_matches(supplier_invoice_id,purchase_order_id,match_type,price_match,quantity_match,tax_match,exceptions,matched_by,matched_at,notes)
 VALUES(p_invoice,v_invoice.purchase_order_id,'three_way',v_price,v_quantity,v_tax,v_exceptions,p_actor,now(),'Checked against order lines and cumulative accepted deliveries; not payment approval')
 ON CONFLICT(supplier_invoice_id) DO UPDATE SET purchase_order_id=EXCLUDED.purchase_order_id,goods_receipt_id=NULL,
 match_type=EXCLUDED.match_type,price_match=EXCLUDED.price_match,quantity_match=EXCLUDED.quantity_match,tax_match=EXCLUDED.tax_match,
 exceptions=EXCLUDED.exceptions,matched_by=p_actor,matched_at=now(),notes=EXCLUDED.notes;
 UPDATE public.supplier_invoices SET status=CASE WHEN v_price AND v_quantity AND v_tax THEN 'matched'::public.supplier_invoice_status ELSE 'exception'::public.supplier_invoice_status END,updated_at=now() WHERE id=p_invoice;
 RETURN v_price AND v_quantity AND v_tax;
END $$;

CREATE OR REPLACE FUNCTION procurement_private.invoice_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid(); v_role text; v_existing procurement_private.requests; v_id uuid;
 v_order public.purchase_orders; v_invoice public.supplier_invoices; v_line public.purchase_order_lines;
 v_lines jsonb; v_item jsonb; v_n integer:=0; v_qty numeric; v_price bigint; v_rate numeric;
 v_net bigint:=0; v_tax bigint:=0; v_total bigint; v_match boolean;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request'; END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager') THEN RAISE EXCEPTION 'Invoice permission required' USING ERRCODE='42501'; END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501'; END IF;
 IF p_action NOT IN ('create_invoice','recheck_invoice','approve_invoice','cancel_invoice') OR p_action IS NULL THEN RAISE EXCEPTION 'Unknown invoice action'; END IF;
 IF p_action IN ('approve_invoice','cancel_invoice') AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Only an owner, admin or finance user can approve or cancel invoices' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data'; END IF;
   RETURN v_existing.result_id;
 END IF;
 IF p_action='create_invoice' THEN
   SELECT * INTO v_order FROM public.purchase_orders WHERE id=(p_data->>'purchase_order_id')::uuid AND organisation_id=p_org FOR UPDATE;
 ELSE
   -- Lock the order before the invoice, consistently with delivery and other invoice saves.
   SELECT po.* INTO v_order FROM public.purchase_orders po JOIN public.supplier_invoices i ON i.purchase_order_id=po.id
     WHERE i.id=(p_data->>'invoice_id')::uuid AND i.organisation_id=p_org AND po.organisation_id=p_org FOR UPDATE OF po;
 END IF;
 IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found in this company'; END IF;
 IF p_action='create_invoice' THEN
   IF v_order.status NOT IN ('approved','issued','acknowledged','partially_delivered','fully_delivered','closed') THEN RAISE EXCEPTION 'Choose an approved order'; END IF;
   IF length(btrim(COALESCE(p_data->>'invoice_number',''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Enter an invoice reference of 1 to 100 characters'; END IF;
   IF NULLIF(p_data->>'invoice_date','') IS NULL THEN RAISE EXCEPTION 'Enter the invoice date'; END IF;
   IF NULLIF(p_data->>'due_date','')::date < (p_data->>'invoice_date')::date THEN RAISE EXCEPTION 'Due date cannot precede invoice date'; END IF;
   v_lines:=p_data->'lines';
   IF jsonb_typeof(v_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(v_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 invoice lines'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_lines) x GROUP BY x->>'purchase_order_line_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'An order line cannot appear twice'; END IF;
   INSERT INTO public.supplier_invoices(organisation_id,supplier_id,purchase_order_id,job_id,invoice_number,invoice_date,due_date,currency,status,approval_status,payment_status,notes)
   VALUES(p_org,v_order.supplier_id,v_order.id,v_order.job_id,btrim(p_data->>'invoice_number'),(p_data->>'invoice_date')::date,NULLIF(p_data->>'due_date','')::date,v_order.currency,'pending_match','pending','unpaid',NULLIF(btrim(p_data->>'notes'),'')) RETURNING id INTO v_id;
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
     SELECT * INTO v_line FROM public.purchase_order_lines WHERE id=(v_item->>'purchase_order_line_id')::uuid AND purchase_order_id=v_order.id;
     IF NOT FOUND THEN RAISE EXCEPTION 'Invoice line does not belong to this order'; END IF;
     v_n:=v_n+1; v_qty:=(v_item->>'quantity')::numeric; v_price:=(v_item->>'unit_price_pence')::bigint; v_rate:=(v_item->>'tax_rate')::numeric;
     IF v_qty IS NULL OR v_qty<=0 OR v_qty>1000000 OR v_qty<>round(v_qty,4) OR v_price IS NULL OR v_price<0 OR v_price>100000000 OR v_rate IS NULL OR v_rate NOT IN (0,0.05,0.2) THEN RAISE EXCEPTION 'Invalid quantity, price or VAT on line %',v_n; END IF;
     v_total:=round(v_qty*v_price); v_net:=v_net+v_total; v_tax:=v_tax+round(v_total*v_rate);
     IF v_net+v_tax>2147483647 THEN RAISE EXCEPTION 'Invoice total is too large'; END IF;
     INSERT INTO public.supplier_invoice_lines(supplier_invoice_id,line_number,description,quantity,unit_price_pence,line_total_pence,tax_rate,purchase_order_line_id)
       VALUES(v_id,v_n,v_line.description,v_qty,v_price,v_total,v_rate,v_line.id);
   END LOOP;
   UPDATE public.supplier_invoices SET net_amount_pence=v_net,tax_amount_pence=v_tax,gross_amount_pence=v_net+v_tax WHERE id=v_id;
   PERFORM procurement_private.check_invoice(v_id,v_actor);
 ELSE
   SELECT * INTO STRICT v_invoice FROM public.supplier_invoices WHERE id=(p_data->>'invoice_id')::uuid AND organisation_id=p_org FOR UPDATE;
   IF v_invoice.supplier_id IS DISTINCT FROM v_order.supplier_id OR v_invoice.job_id IS DISTINCT FROM v_order.job_id THEN RAISE EXCEPTION 'Invoice supplier or job does not match the order'; END IF;
   v_id:=v_invoice.id;
   IF v_invoice.status NOT IN ('received','pending_match','matched','exception','draft') OR v_invoice.approval_status='approved' OR v_invoice.payment_status IS DISTINCT FROM 'unpaid' THEN RAISE EXCEPTION 'Only an unpaid, unapproved invoice can be changed'; END IF;
   IF p_action='cancel_invoice' THEN
     IF EXISTS(SELECT 1 FROM public.supplier_credit_notes WHERE supplier_invoice_id=v_id AND status IS DISTINCT FROM 'void') THEN RAISE EXCEPTION 'Void credit note records before cancelling the invoice';END IF;
     UPDATE public.supplier_invoices SET status='cancelled',approval_status='cancelled',updated_at=now() WHERE id=v_id;
   ELSE
     IF v_order.status='cancelled' THEN RAISE EXCEPTION 'The order is cancelled'; END IF;
     v_match:=procurement_private.check_invoice(v_id,v_actor);
     IF p_action='approve_invoice' THEN
       IF NOT v_match THEN RAISE EXCEPTION 'Matching exceptions must be resolved before approval'; END IF;
       UPDATE public.supplier_invoices SET status='approved',approval_status='approved',updated_at=now() WHERE id=v_id;
     END IF;
   END IF;
 END IF;
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION procurement_private.cancel_order_operation(p_org uuid,p_request uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=auth.uid();v_role text;v_existing procurement_private.requests;v_order public.purchase_orders;v_reason text;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request'; END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Only an owner, admin or finance user can cancel purchase orders' USING ERRCODE='42501'; END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>'cancel_order' OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data'; END IF;
   RETURN v_existing.result_id;
 END IF;
 SELECT * INTO v_order FROM public.purchase_orders WHERE id=(p_data->>'purchase_order_id')::uuid AND organisation_id=p_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found in this company'; END IF;
 IF NULLIF(p_data->>'expected_updated_at','')::timestamptz IS DISTINCT FROM v_order.updated_at THEN RAISE EXCEPTION 'This order changed. Reload it before cancelling'; END IF;
 IF v_order.status NOT IN ('draft','awaiting_approval','approved','issued','acknowledged') THEN RAISE EXCEPTION 'Only an open, undelivered order can be cancelled'; END IF;
 v_reason:=btrim(COALESCE(p_data->>'reason',''));
 IF length(v_reason) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Give a cancellation reason of 1 to 4000 characters'; END IF;
 IF EXISTS(SELECT 1 FROM public.goods_receipts WHERE purchase_order_id=v_order.id)
    OR EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE purchase_order_id=v_order.id AND COALESCE(received_quantity,0)>0) THEN
   RAISE EXCEPTION 'This order has delivery records. Resolve it through the delivery or returns workflow';
 END IF;
 IF EXISTS(SELECT 1 FROM public.supplier_credit_notes cn JOIN public.supplier_invoices i ON i.id=cn.supplier_invoice_id WHERE i.purchase_order_id=v_order.id AND cn.status IS DISTINCT FROM 'void') THEN RAISE EXCEPTION 'This order has active credit note records';END IF;
 IF EXISTS(SELECT 1 FROM public.supplier_invoices WHERE purchase_order_id=v_order.id AND (status<>'cancelled' OR payment_status IS DISTINCT FROM 'unpaid' OR paid_at IS NOT NULL)) THEN
   RAISE EXCEPTION 'This order has invoice or payment records. Resolve those before cancelling';
 END IF;
 -- Use the same source locks as RFQ awards so released quantities cannot be reserved twice.
 PERFORM 1 FROM public.purchase_requisitions r WHERE r.id IN (
   SELECT l.requisition_id FROM public.requisition_lines l JOIN public.purchase_order_lines pl ON pl.requisition_line_id=l.id WHERE pl.purchase_order_id=v_order.id
 ) ORDER BY r.id FOR UPDATE;
 UPDATE public.purchase_orders SET status='cancelled',cancelled_by=v_actor,cancelled_at=clock_timestamp(),cancellation_reason=v_reason,updated_at=clock_timestamp() WHERE id=v_order.id;
 UPDATE public.purchase_requisitions r SET status=CASE
   WHEN NOT EXISTS(SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=r.id AND l.quantity>(
     SELECT COALESCE(sum(pl.quantity),0) FROM public.purchase_order_lines pl JOIN public.purchase_orders po ON po.id=pl.purchase_order_id
     WHERE pl.requisition_line_id=l.id AND po.status NOT IN ('draft','awaiting_approval','cancelled','superseded')
   )) THEN 'fully_ordered'::public.requisition_status
   WHEN EXISTS(SELECT 1 FROM public.requisition_lines l JOIN public.purchase_order_lines pl ON pl.requisition_line_id=l.id JOIN public.purchase_orders po ON po.id=pl.purchase_order_id
     WHERE l.requisition_id=r.id AND po.status NOT IN ('draft','awaiting_approval','cancelled','superseded')) THEN 'partially_ordered'::public.requisition_status
   ELSE 'approved'::public.requisition_status END,revision=r.revision+1,updated_at=clock_timestamp()
   WHERE r.organisation_id=p_org AND r.status IN ('approved','partially_ordered','fully_ordered') AND r.id IN (
     SELECT l.requisition_id FROM public.requisition_lines l JOIN public.purchase_order_lines pl ON pl.requisition_line_id=l.id WHERE pl.purchase_order_id=v_order.id);
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,'cancel_order',p_data,v_order.id);
 RETURN v_order.id;
END $$;
