-- Development integration checks. Every fixture, role and billing change is rolled back.
-- Run with test.actor_id/test.organisation_id set by a database test administrator.
BEGIN;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;
 supplier uuid;req uuid;rfq uuid;selected uuid;rfq_line uuid;quote uuid;po uuid;manual_po uuid;po_line uuid;invoice uuid;
 request uuid:=gen_random_uuid();payload jsonb;rfq_payload jsonb;stamp timestamptz;failed boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 supplier:=public.procurement_write(org,gen_random_uuid(),'create_supplier','{"trading_name":"Cancellation rollback supplier"}');
 req:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_build_object('reference','CANCEL-REQ-ROLLBACK-'||gen_random_uuid(),'reason','Cancellation fixture','lines',jsonb_build_array(jsonb_build_object('description','Materials','quantity',10,'unit_of_measure','each','estimated_unit_price_pence',100))));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req,'revision',1));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',req,'revision',2));
 rfq_payload:=jsonb_build_object('reference','CANCEL-RFQ-ROLLBACK-'||gen_random_uuid(),'description','Cancellation fixture RFQ','source_requisition_id',req,'supplier_ids',jsonb_build_array(supplier));
 rfq:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',rfq_payload);
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',1));
 SELECT id INTO selected FROM public.rfq_suppliers WHERE rfq_id=rfq;
 SELECT id INTO rfq_line FROM public.rfq_lines WHERE rfq_id=rfq;
 quote:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_build_object('rfq_id',rfq,'revision',2,'rfq_supplier_id',selected,'quote_reference','CANCEL-Q','lines',jsonb_build_array(jsonb_build_object('rfq_line_id',rfq_line,'unit_price_pence',100,'tax_rate',0.2))));
 po:=public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',3,'quote_response_id',quote,'po_number','CANCEL-PO-ROLLBACK-'||gen_random_uuid()));
 SELECT updated_at INTO stamp FROM public.purchase_orders WHERE id=po;
 payload:=jsonb_build_object('purchase_order_id',po,'expected_updated_at',stamp,'reason','Replacement supplier needed','cancelled_by',gen_random_uuid());
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),payload||jsonb_build_object('expected_updated_at',stamp-interval '1 second'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Stale cancellation allowed';END IF;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),payload||'{"reason":"   "}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Cancellation without reason allowed';END IF;
 IF public.procurement_cancel_order(org,request,payload)<>po OR public.procurement_cancel_order(org,request,payload)<>po THEN RAISE EXCEPTION 'Cancellation replay failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.purchase_orders WHERE id=po AND status='cancelled' AND cancelled_by=actor AND cancelled_at IS NOT NULL AND cancellation_reason='Replacement supplier needed') THEN RAISE EXCEPTION 'Cancellation audit fields missing or actor spoofed';END IF;
 IF (SELECT count(*) FROM public.purchase_order_lines WHERE purchase_order_id=po)<>1 THEN RAISE EXCEPTION 'Order lines were deleted';END IF;
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'approved' THEN RAISE EXCEPTION 'Cancelled draft changed approved request incorrectly';END IF;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,request,payload||'{"reason":"changed"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Changed replay accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Already cancelled order cancelled again';END IF;
 failed:=false;BEGIN PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Cancelled order approved';END IF;
 SELECT id INTO po_line FROM public.purchase_order_lines WHERE purchase_order_id=po;
 failed:=false;BEGIN PERFORM public.procurement_write(org,gen_random_uuid(),'record_delivery',jsonb_build_object('purchase_order_id',po,'arrival_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',po_line,'accepted_quantity',1))));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Cancelled order received a delivery';END IF;
 -- Full reservation must be available to a new RFQ after cancellation.
 rfq:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',rfq_payload||jsonb_build_object('reference','CANCEL-RFQ-ROLLBACK-'||gen_random_uuid()));
 IF (SELECT quantity FROM public.rfq_lines WHERE rfq_id=rfq)<>10 THEN RAISE EXCEPTION 'Cancelled draft still reserves quantity';END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',1));
 SELECT id INTO selected FROM public.rfq_suppliers WHERE rfq_id=rfq;SELECT id INTO rfq_line FROM public.rfq_lines WHERE rfq_id=rfq;
 quote:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_build_object('rfq_id',rfq,'revision',2,'rfq_supplier_id',selected,'quote_reference','REPLACEMENT-Q','lines',jsonb_build_array(jsonb_build_object('rfq_line_id',rfq_line,'unit_price_pence',100,'tax_rate',0.2))));
 po:=public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',3,'quote_response_id',quote,'po_number','CANCEL-PO-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'fully_ordered' THEN RAISE EXCEPTION 'Replacement approval did not mark ordered';END IF;
 PERFORM set_config('test.cancel_approved_po',po::text,true);PERFORM set_config('test.cancel_req',req::text,true);PERFORM set_config('test.cancel_supplier',supplier::text,true);
 -- A rejected/damaged receipt still blocks cancellation even when accepted quantity is zero.
 manual_po:=public.procurement_write(org,gen_random_uuid(),'create_order',jsonb_build_object('supplier_id',supplier,'po_number','CANCEL-PO-ROLLBACK-'||gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('description','Delivery evidence','quantity',10,'unit_price_pence',100,'tax_rate',0.2))));
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',manual_po));
 SELECT id INTO po_line FROM public.purchase_order_lines WHERE purchase_order_id=manual_po;
 PERFORM public.procurement_write(org,gen_random_uuid(),'record_delivery',jsonb_build_object('purchase_order_id',manual_po,'arrival_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',po_line,'accepted_quantity',0,'damaged_quantity',1))));
 SELECT updated_at INTO stamp FROM public.purchase_orders WHERE id=manual_po;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),jsonb_build_object('purchase_order_id',manual_po,'expected_updated_at',stamp,'reason','Must be blocked'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed OR (SELECT status FROM public.purchase_orders WHERE id=manual_po)='cancelled' THEN RAISE EXCEPTION 'Order with receipt cancelled';END IF;
 -- Active invoice exceptions also block cancellation; cancelling an unpaid unapproved invoice permits it.
 manual_po:=public.procurement_write(org,gen_random_uuid(),'create_order',jsonb_build_object('supplier_id',supplier,'po_number','CANCEL-PO-ROLLBACK-'||gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('description','Invoice evidence','quantity',10,'unit_price_pence',100,'tax_rate',0.2))));
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',manual_po));
 SELECT id INTO po_line FROM public.purchase_order_lines WHERE purchase_order_id=manual_po;
 invoice:=public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_build_object('purchase_order_id',manual_po,'invoice_number','CANCEL-INV','invoice_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',po_line,'quantity',1,'unit_price_pence',100,'tax_rate',0.2))));
 SELECT updated_at INTO stamp FROM public.purchase_orders WHERE id=manual_po;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),jsonb_build_object('purchase_order_id',manual_po,'expected_updated_at',stamp,'reason','Must be blocked'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Order with active invoice cancelled';END IF;
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'cancel_invoice',jsonb_build_object('invoice_id',invoice));
 PERFORM public.procurement_cancel_order(org,gen_random_uuid(),jsonb_build_object('purchase_order_id',manual_po,'expected_updated_at',stamp,'reason','Incorrect invoice cancelled first'));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.purchase_orders WHERE id=po) THEN RAISE EXCEPTION 'Other identity can read order';END IF;
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),payload);EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Other identity can cancel order';END IF;
 PERFORM set_config('request.jwt.claims','{}',true);
 failed:=false;BEGIN PERFORM public.procurement_cancel_order(org,gen_random_uuid(),payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Null auth bypass';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='project_manager' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_cancel_order(current_setting('test.organisation_id')::uuid,gen_random_uuid(),jsonb_build_object('purchase_order_id',current_setting('test.cancel_approved_po'),'reason','No permission'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Project manager cancelled order';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
-- Model an existing partial order using only this transaction's fixture order.
UPDATE public.purchase_order_lines SET quantity=4,line_total_pence=400 WHERE purchase_order_id=current_setting('test.cancel_approved_po')::uuid;
UPDATE public.purchase_orders SET net_total_pence=400,tax_total_pence=80,gross_total_pence=480 WHERE id=current_setting('test.cancel_approved_po')::uuid;
UPDATE public.purchase_requisitions SET status='partially_ordered' WHERE id=current_setting('test.cancel_req')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;req uuid:=current_setting('test.cancel_req')::uuid;rfq uuid;selected uuid;line uuid;quote uuid;po uuid;stamp timestamptz;
BEGIN
 rfq:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',jsonb_build_object('reference','CANCEL-RFQ-ROLLBACK-'||gen_random_uuid(),'description','Remaining six materials','source_requisition_id',req,'supplier_ids',jsonb_build_array(current_setting('test.cancel_supplier'))));
 IF (SELECT quantity FROM public.rfq_lines WHERE rfq_id=rfq)<>6 THEN RAISE EXCEPTION 'Partial reservation count incorrect';END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',1));
 SELECT id INTO selected FROM public.rfq_suppliers WHERE rfq_id=rfq;SELECT id INTO line FROM public.rfq_lines WHERE rfq_id=rfq;
 quote:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_build_object('rfq_id',rfq,'revision',2,'rfq_supplier_id',selected,'quote_reference','PARTIAL-Q','lines',jsonb_build_array(jsonb_build_object('rfq_line_id',line,'unit_price_pence',100,'tax_rate',0.2))));
 po:=public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',3,'quote_response_id',quote,'po_number','CANCEL-PO-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));
 SELECT updated_at INTO stamp FROM public.purchase_orders WHERE id=current_setting('test.cancel_approved_po')::uuid;
 PERFORM public.procurement_cancel_order(org,gen_random_uuid(),jsonb_build_object('purchase_order_id',current_setting('test.cancel_approved_po'),'expected_updated_at',stamp,'reason','Cancel four, retain six'));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'partially_ordered' THEN RAISE EXCEPTION 'Other approved order was ignored';END IF;
 SELECT updated_at INTO stamp FROM public.purchase_orders WHERE id=po;
 PERFORM public.procurement_cancel_order(org,gen_random_uuid(),jsonb_build_object('purchase_order_id',po,'expected_updated_at',stamp,'reason','Cancel remaining six'));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'approved' THEN RAISE EXCEPTION 'Requisition did not reopen for ordering';END IF;
 rfq:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',jsonb_build_object('reference','CANCEL-RFQ-ROLLBACK-'||gen_random_uuid(),'description','All materials released','source_requisition_id',req,'supplier_ids',jsonb_build_array(current_setting('test.cancel_supplier'))));
 IF (SELECT quantity FROM public.rfq_lines WHERE rfq_id=rfq)<>10 THEN RAISE EXCEPTION 'Approved cancellation did not release reservations';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_cancel_order(current_setting('test.organisation_id')::uuid,gen_random_uuid(),jsonb_build_object('purchase_order_id',current_setting('test.cancel_approved_po'),'reason','No write access'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Read-only cancellation allowed';END IF;
END $test$;
ROLLBACK;
