-- Invoice writes use the same private, atomic request ledger as orders and receipts.
CREATE UNIQUE INDEX supplier_invoice_reference_normalized
  ON public.supplier_invoices(organisation_id,supplier_id,lower(btrim(invoice_number))) WHERE status<>'cancelled';
CREATE INDEX supplier_invoice_lines_order_line ON public.supplier_invoice_lines(purchase_order_line_id);

CREATE FUNCTION procurement_private.check_invoice(p_invoice uuid,p_actor uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_invoice public.supplier_invoices; v_line record; v_other numeric; v_received numeric;
 v_price boolean:=true; v_quantity boolean:=true; v_tax boolean:=true; v_exceptions jsonb:='[]';
BEGIN
 SELECT * INTO STRICT v_invoice FROM public.supplier_invoices WHERE id=p_invoice;
 IF NOT EXISTS(SELECT 1 FROM public.supplier_invoice_lines WHERE supplier_invoice_id=p_invoice) THEN
   v_quantity:=false; v_exceptions:=v_exceptions || jsonb_build_array('Invoice has no lines');
 END IF;
 FOR v_line IN SELECT il.*,pl.unit_price_pence AS ordered_price,pl.tax_rate AS ordered_tax,pl.quantity AS ordered_quantity,
   pl.purchase_order_id AS line_order FROM public.supplier_invoice_lines il
   LEFT JOIN public.purchase_order_lines pl ON pl.id=il.purchase_order_line_id WHERE il.supplier_invoice_id=p_invoice LOOP
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
     WHERE il.purchase_order_line_id=v_line.purchase_order_line_id AND i.id<>p_invoice AND i.status<>'cancelled';
   SELECT COALESCE(sum(rl.accepted_quantity),0) INTO v_received FROM public.goods_receipt_lines rl
     JOIN public.goods_receipts r ON r.id=rl.goods_receipt_id
     WHERE rl.purchase_order_line_id=v_line.purchase_order_line_id AND r.organisation_id=v_invoice.organisation_id AND r.purchase_order_id=v_invoice.purchase_order_id;
   IF v_line.quantity IS NULL OR v_line.quantity<=0 OR v_line.quantity+v_other>v_line.ordered_quantity OR v_line.quantity+v_other>v_received THEN
     v_quantity:=false; v_exceptions:=v_exceptions || jsonb_build_array('Line '||v_line.line_number||': cumulative invoiced quantity exceeds ordered or accepted delivery quantity');
   END IF;
 END LOOP;
 INSERT INTO public.invoice_matches(supplier_invoice_id,purchase_order_id,match_type,price_match,quantity_match,tax_match,exceptions,matched_by,matched_at,notes)
 VALUES(p_invoice,v_invoice.purchase_order_id,'three_way',v_price,v_quantity,v_tax,v_exceptions,p_actor,now(),'Checked against order lines and cumulative accepted deliveries; not payment approval')
 ON CONFLICT(supplier_invoice_id) DO UPDATE SET purchase_order_id=EXCLUDED.purchase_order_id,goods_receipt_id=NULL,
 match_type=EXCLUDED.match_type,price_match=EXCLUDED.price_match,quantity_match=EXCLUDED.quantity_match,tax_match=EXCLUDED.tax_match,
 exceptions=EXCLUDED.exceptions,matched_by=p_actor,matched_at=now(),notes=EXCLUDED.notes;
 UPDATE public.supplier_invoices SET status=CASE WHEN v_price AND v_quantity AND v_tax THEN 'matched'::public.supplier_invoice_status ELSE 'exception'::public.supplier_invoice_status END,updated_at=now() WHERE id=p_invoice;
 RETURN v_price AND v_quantity AND v_tax;
END $$;
REVOKE ALL ON FUNCTION procurement_private.check_invoice(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION procurement_private.invoice_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
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
   v_id:=v_invoice.id;
   IF v_invoice.status NOT IN ('received','pending_match','matched','exception','draft') OR v_invoice.approval_status='approved' OR v_invoice.payment_status IS DISTINCT FROM 'unpaid' THEN RAISE EXCEPTION 'Only an unpaid, unapproved invoice can be changed'; END IF;
   IF p_action='cancel_invoice' THEN
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
REVOKE ALL ON FUNCTION procurement_private.invoice_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.invoice_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_invoice_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.invoice_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_invoice_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_invoice_write(uuid,uuid,text,jsonb) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.supplier_invoices,public.supplier_invoice_lines,public.invoice_matches FROM PUBLIC,anon,authenticated;
