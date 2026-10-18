-- Development integration checks. Run as a database test administrator with fixture actor/org settings.
-- All inserted records and billing-state changes are rolled back.
BEGIN;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  actor uuid := current_setting('test.actor_id')::uuid; org uuid := current_setting('test.organisation_id')::uuid;
  supplier uuid; order_id uuid; receipt uuid; line_id uuid; request uuid:=gen_random_uuid();
  payload jsonb; delivery jsonb; delivery_request uuid:=gen_random_uuid(); second_request uuid:=gen_random_uuid();
  count_before integer; failed boolean; quantity numeric; state text; total integer;
BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  supplier:=public.procurement_write(org,gen_random_uuid(),'create_supplier',jsonb_build_object('trading_name','UAT rollback procurement supplier'));
  payload:=jsonb_build_object('supplier_id',supplier,'po_number','UAT-'||request,'lines',jsonb_build_array(jsonb_build_object('description','Test materials','quantity',10,'unit_price_pence',123,'tax_rate',0.2)));
  order_id:=public.procurement_write(org,request,'create_order',payload);
  IF public.procurement_write(org,request,'create_order',payload)<>order_id THEN RAISE EXCEPTION 'Order replay failed'; END IF;
  SELECT gross_total_pence,status::text INTO total,state FROM public.purchase_orders WHERE id=order_id;
  IF total<>1476 OR state<>'draft' THEN RAISE EXCEPTION 'Totals or draft state incorrect'; END IF;
  failed:=false;
  BEGIN PERFORM public.procurement_write(org,request,'create_order',payload||'{"po_number":"changed"}'::jsonb); EXCEPTION WHEN OTHERS THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Changed replay accepted'; END IF;
  SELECT count(*) INTO count_before FROM public.purchase_orders WHERE organisation_id=org;
  failed:=false;
  BEGIN PERFORM public.procurement_write(org,gen_random_uuid(),'create_order',jsonb_set(payload,'{lines,0,quantity}','-1') || jsonb_build_object('po_number','INVALID-' || gen_random_uuid())); EXCEPTION WHEN OTHERS THEN failed:=true; END;
  IF NOT failed OR (SELECT count(*) FROM public.purchase_orders WHERE organisation_id=org)<>count_before THEN RAISE EXCEPTION 'Invalid order did not roll back'; END IF;
  SELECT id INTO line_id FROM public.purchase_order_lines WHERE purchase_order_id=order_id;
  delivery:=jsonb_build_object('purchase_order_id',order_id,'arrival_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',line_id,'accepted_quantity',4,'damaged_quantity',1)));
  failed:=false;
  BEGIN PERFORM public.procurement_write(org,delivery_request,'record_delivery',delivery); EXCEPTION WHEN OTHERS THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Draft accepted delivery'; END IF;
  PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',order_id));
  receipt:=public.procurement_write(org,delivery_request,'record_delivery',delivery);
  IF public.procurement_write(org,delivery_request,'record_delivery',delivery)<>receipt THEN RAISE EXCEPTION 'Delivery replay failed'; END IF;
  SELECT received_quantity INTO quantity FROM public.purchase_order_lines WHERE id=line_id;
  SELECT status::text INTO state FROM public.purchase_orders WHERE id=order_id;
  IF quantity<>4 OR state<>'partially_delivered' THEN RAISE EXCEPTION 'Partial delivery incorrect'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.delivery_issues WHERE goods_receipt_id=receipt AND issue_type='damaged') THEN RAISE EXCEPTION 'Damage issue missing'; END IF;
  SELECT count(*) INTO count_before FROM public.goods_receipts WHERE purchase_order_id=order_id;
  delivery:=jsonb_set(delivery,'{lines,0,accepted_quantity}','7');
  failed:=false;
  BEGIN PERFORM public.procurement_write(org,second_request,'record_delivery',delivery); EXCEPTION WHEN OTHERS THEN failed:=true; END;
  IF NOT failed OR (SELECT count(*) FROM public.goods_receipts WHERE purchase_order_id=order_id)<>count_before THEN RAISE EXCEPTION 'Overreceipt not rolled back'; END IF;
  delivery:=jsonb_set(jsonb_set(delivery,'{lines,0,accepted_quantity}','6'),'{lines,0,damaged_quantity}','0');
  PERFORM public.procurement_write(org,second_request,'record_delivery',delivery);
  IF (SELECT status::text FROM public.purchase_orders WHERE id=order_id)<>'fully_delivered' THEN RAISE EXCEPTION 'Full delivery status incorrect'; END IF;
  failed:=false;
  BEGIN INSERT INTO public.purchase_orders(organisation_id,po_number,supplier_id,requested_by) VALUES(org,'bypass',supplier,actor); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Direct write bypass permitted'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  failed:=false;
  BEGIN PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',order_id)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Unrelated identity accepted'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
  BEGIN PERFORM public.procurement_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'create_supplier','{"trading_name":"Blocked supplier"}'::jsonb); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Read-only company could write'; END IF;
END $test$;
ROLLBACK;
