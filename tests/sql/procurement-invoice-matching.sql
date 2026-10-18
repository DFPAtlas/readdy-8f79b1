-- Development-only transaction tests. Requires test.actor_id and test.organisation_id settings.
-- Fixture records, role and billing changes are rolled back.
BEGIN;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 actor uuid:=current_setting('test.actor_id')::uuid; org uuid:=current_setting('test.organisation_id')::uuid;
 supplier uuid; po uuid; line uuid; inv uuid; inv2 uuid; inv3 uuid; request uuid:=gen_random_uuid();
 payload jsonb; receipt jsonb; failed boolean; before_count integer; v_status text;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 supplier:=public.procurement_write(org,gen_random_uuid(),'create_supplier',jsonb_build_object('trading_name','Invoice rollback fixture'));
 po:=public.procurement_write(org,gen_random_uuid(),'create_order',jsonb_build_object('supplier_id',supplier,'po_number','INV-TEST-'||gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('description','Materials','quantity',10,'unit_price_pence',123,'tax_rate',0.2))));
 SELECT id INTO line FROM public.purchase_order_lines WHERE purchase_order_id=po;
 payload:=jsonb_build_object('purchase_order_id',po,'invoice_number','TEST-1','invoice_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',line,'quantity',4,'unit_price_pence',123,'tax_rate',0.2)));
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,request,'create_invoice',payload); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Draft order accepted invoice'; END IF;
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));
 inv:=public.procurement_invoice_write(org,request,'create_invoice',payload);
 IF (SELECT currency FROM public.supplier_invoices WHERE id=inv) IS DISTINCT FROM (SELECT currency FROM public.purchase_orders WHERE id=po) THEN RAISE EXCEPTION 'Invoice currency does not match order'; END IF;
 IF public.procurement_invoice_write(org,request,'create_invoice',payload)<>inv THEN RAISE EXCEPTION 'Invoice replay failed'; END IF;
 IF (SELECT gross_amount_pence FROM public.supplier_invoices WHERE id=inv)<>590 THEN RAISE EXCEPTION 'Incorrect rounded total'; END IF;
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv)<>'exception' THEN RAISE EXCEPTION 'Missing receipts did not create exception'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'approve_invoice',jsonb_build_object('invoice_id',inv)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Exception invoice approved'; END IF;
 receipt:=jsonb_build_object('purchase_order_id',po,'arrival_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',line,'accepted_quantity',4,'damaged_quantity',1)));
 PERFORM public.procurement_write(org,gen_random_uuid(),'record_delivery',receipt);
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'recheck_invoice',jsonb_build_object('invoice_id',inv));
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv)<>'matched' THEN RAISE EXCEPTION 'Accepted delivery did not match'; END IF;
 IF (SELECT approval_status FROM public.supplier_invoices WHERE id=inv)<>'pending' THEN RAISE EXCEPTION 'Match auto-approved invoice'; END IF;
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'approve_invoice',jsonb_build_object('invoice_id',inv));
 IF NOT EXISTS(SELECT 1 FROM public.supplier_invoices WHERE id=inv AND status='approved' AND payment_status='unpaid' AND paid_at IS NULL) THEN RAISE EXCEPTION 'Approval/payment separation failed'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'cancel_invoice',jsonb_build_object('invoice_id',inv)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Approved invoice cancelled'; END IF;
 -- New invoice must count the already approved quantity; damaged goods never count as accepted.
 inv2:=public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(jsonb_set(payload,'{invoice_number}','"TEST-2"'),'{lines,0,quantity}','1'));
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv2)<>'exception' THEN RAISE EXCEPTION 'Cumulative quantity or damaged receipt bypass'; END IF;
 PERFORM public.procurement_write(org,gen_random_uuid(),'record_delivery',jsonb_set(jsonb_set(receipt,'{lines,0,accepted_quantity}','6'),'{lines,0,damaged_quantity}','0'));
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'recheck_invoice',jsonb_build_object('invoice_id',inv2));
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv2)<>'matched' THEN RAISE EXCEPTION 'Partial invoice did not match after delivery'; END IF;
 -- Case-insensitive, whitespace-normalized duplicate reference is blocked.
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(payload,'{invoice_number}','" test-2 "')); EXCEPTION WHEN unique_violation THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Duplicate invoice reference accepted'; END IF;
 inv3:=public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(jsonb_set(jsonb_set(payload,'{invoice_number}','"TEST-3"'),'{lines,0,unit_price_pence}','124'),'{lines,0,tax_rate}','0.05'));
 IF NOT EXISTS(SELECT 1 FROM public.invoice_matches WHERE supplier_invoice_id=inv3 AND NOT price_match AND NOT tax_match) THEN RAISE EXCEPTION 'Price/VAT discrepancy not flagged'; END IF;
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'cancel_invoice',jsonb_build_object('invoice_id',inv3));
 -- Correct an unapproved invoice while retaining its cancelled history.
 inv3:=public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(payload,'{invoice_number}','"TEST-3"'));
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv3)<>'matched' THEN RAISE EXCEPTION 'Cancelled invoice still reserved quantity'; END IF;
 -- Oversized invoices remain visible as exceptions and cannot be approved, even if a stale UI showed a match before.
 inv3:=public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(jsonb_set(payload,'{invoice_number}','"OVER"'),'{lines,0,quantity}','2'));
 IF (SELECT status FROM public.supplier_invoices WHERE id=inv3)<>'exception' THEN RAISE EXCEPTION 'Over-invoicing accepted as matched'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'approve_invoice',jsonb_build_object('invoice_id',inv2)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Approval trusted stale matching'; END IF;
 PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'cancel_invoice',jsonb_build_object('invoice_id',inv3));
 SELECT count(*) INTO before_count FROM public.supplier_invoices WHERE organisation_id=org;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(jsonb_set(payload,'{invoice_number}','"INVALID"'),'{lines,0,quantity}','-1')); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed OR (SELECT count(*) FROM public.supplier_invoices WHERE organisation_id=org)<>before_count THEN RAISE EXCEPTION 'Invalid invoice not rolled back'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'create_invoice',jsonb_set(jsonb_set(payload,'{invoice_number}','"FOREIGN-LINE"'),'{lines,0,purchase_order_line_id}',to_jsonb(gen_random_uuid()))); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Unrelated order line accepted'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,request,'create_invoice',payload||'{"notes":"changed"}'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Changed replay allowed'; END IF;
 IF has_table_privilege('authenticated','public.supplier_invoices','TRUNCATE') OR has_table_privilege('authenticated','public.supplier_invoice_lines','TRUNCATE') OR has_table_privilege('authenticated','public.invoice_matches','TRUNCATE') THEN RAISE EXCEPTION 'Truncate bypass granted'; END IF;
 failed:=false; BEGIN UPDATE public.supplier_invoices SET status='paid' WHERE id=inv; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct header write allowed'; END IF;
 failed:=false; BEGIN UPDATE public.supplier_invoice_lines SET quantity=0 WHERE supplier_invoice_id=inv; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct line write allowed'; END IF;
 failed:=false; BEGIN UPDATE public.invoice_matches SET quantity_match=true WHERE supplier_invoice_id=inv; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct match write allowed'; END IF;
 PERFORM set_config('test.invoice_id',inv2::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.supplier_invoices WHERE id=inv) OR EXISTS(SELECT 1 FROM public.supplier_invoice_lines WHERE supplier_invoice_id=inv) OR EXISTS(SELECT 1 FROM public.invoice_matches WHERE supplier_invoice_id=inv) THEN RAISE EXCEPTION 'Other identity can read invoice data'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'recheck_invoice',jsonb_build_object('invoice_id',inv2)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Other identity can write'; END IF;
 PERFORM set_config('request.jwt.claims','{}',true);
 failed:=false; BEGIN PERFORM public.procurement_invoice_write(org,gen_random_uuid(),'recheck_invoice',jsonb_build_object('invoice_id',inv2)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Null auth bypass'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='project_manager' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_invoice_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'approve_invoice',jsonb_build_object('invoice_id',current_setting('test.invoice_id'))); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Project manager approved invoice'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_invoice_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'recheck_invoice',jsonb_build_object('invoice_id',current_setting('test.invoice_id'))); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Read-only workspace can write'; END IF;
END $test$;
ROLLBACK;
