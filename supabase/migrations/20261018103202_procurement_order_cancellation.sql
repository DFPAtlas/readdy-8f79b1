ALTER TABLE public.purchase_orders ADD COLUMN cancelled_by uuid, ADD COLUMN cancelled_at timestamptz, ADD COLUMN cancellation_reason text;
CREATE FUNCTION procurement_private.cancel_order_operation(p_org uuid,p_request uuid,p_data jsonb) RETURNS uuid
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
REVOKE ALL ON FUNCTION procurement_private.cancel_order_operation(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.cancel_order_operation(uuid,uuid,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_cancel_order(p_org uuid,p_request uuid,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.cancel_order_operation(p_org,p_request,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_cancel_order(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_cancel_order(uuid,uuid,jsonb) TO authenticated;
