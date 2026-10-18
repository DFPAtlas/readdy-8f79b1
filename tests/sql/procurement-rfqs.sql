-- Development-only transaction checks. Set test.actor_id and test.organisation_id as a test administrator.
-- Every fixture, membership and billing change is rolled back.
BEGIN;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 org uuid:=current_setting('test.organisation_id')::uuid; actor uuid:=current_setting('test.actor_id')::uuid;
 req uuid; supplier_a uuid; supplier_b uuid; rfq uuid; rfq2 uuid; cancelled uuid; line uuid; selected_a uuid; selected_b uuid; selected_second uuid;
 q_a uuid; q_a2 uuid; q_b uuid; q_second uuid; request uuid:=gen_random_uuid(); quote_request uuid:=gen_random_uuid(); payload jsonb; quote_payload jsonb; failed boolean; before_count integer;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 supplier_a:=public.procurement_write(org,gen_random_uuid(),'create_supplier','{"trading_name":"RFQ rollback supplier A"}');
 supplier_b:=public.procurement_write(org,gen_random_uuid(),'create_supplier','{"trading_name":"RFQ rollback supplier B"}');
 req:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_build_object('reference','RFQ-REQ-ROLLBACK-'||gen_random_uuid(),'reason','RFQ rollback fixture','lines',jsonb_build_array(jsonb_build_object('description','Test materials','quantity',10,'unit_of_measure','each','estimated_unit_price_pence',100))));
 payload:=jsonb_build_object('source_requisition_id',req,'reference','RFQ-ROLLBACK-'||gen_random_uuid(),'description','Test RFQ','supplier_ids',jsonb_build_array(supplier_a,supplier_b));
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,request,'create_rfq',payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Draft requisition accepted'; END IF;
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req,'revision',1));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',req,'revision',2));
 rfq:=public.procurement_rfq_write(org,request,'create_rfq',payload);
 IF public.procurement_rfq_write(org,request,'create_rfq',payload)<>rfq THEN RAISE EXCEPTION 'RFQ replay failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.requests_for_quotation WHERE id=rfq AND status='draft' AND revision=1 AND source_requisition_id=req) OR (SELECT count(*) FROM public.rfq_suppliers WHERE rfq_id=rfq)<>2 THEN RAISE EXCEPTION 'Draft/source/supplier save failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.rfq_suppliers WHERE rfq_id=rfq AND invitation_sent_at IS NOT NULL) THEN RAISE EXCEPTION 'Draft falsely marked as emailed'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,request,'create_rfq',payload||'{"description":"changed"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Changed replay accepted'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload||jsonb_build_object('reference',' '||lower(payload->>'reference')||' '));EXCEPTION WHEN unique_violation THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Normalized duplicate accepted'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload||jsonb_build_object('reference','INVALID-'||gen_random_uuid(),'supplier_ids',jsonb_build_array(gen_random_uuid())));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Foreign supplier accepted'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload||jsonb_build_object('reference','INVALID-'||gen_random_uuid(),'source_requisition_id',gen_random_uuid()));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Foreign source accepted'; END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'update_rfq',payload||jsonb_build_object('rfq_id',rfq,'revision',1,'description','Updated test RFQ'));
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',1));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Stale open accepted'; END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',2));
 SELECT id INTO line FROM public.rfq_lines WHERE rfq_id=rfq;
 SELECT id INTO selected_a FROM public.rfq_suppliers WHERE rfq_id=rfq AND supplier_id=supplier_a;
 SELECT id INTO selected_b FROM public.rfq_suppliers WHERE rfq_id=rfq AND supplier_id=supplier_b;
 quote_payload:=jsonb_build_object('rfq_id',rfq,'revision',3,'rfq_supplier_id',selected_a,'quote_reference','Q-A','delivery_charge_pence',50,'delivery_tax_rate',0.2,'validity_date',CURRENT_DATE+7,'lead_time_days',3,'lines',jsonb_build_array(jsonb_build_object('rfq_line_id',line,'unit_price_pence',123,'tax_rate',0.2)));
 q_a:=public.procurement_rfq_write(org,quote_request,'record_quote',quote_payload);
 IF public.procurement_rfq_write(org,quote_request,'record_quote',quote_payload)<>q_a THEN RAISE EXCEPTION 'Quote replay failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.supplier_quote_responses WHERE id=q_a AND version=1 AND net_total_pence=1280 AND tax_total_pence=256 AND gross_total_pence=1536 AND recorded_by=actor) THEN RAISE EXCEPTION 'Quote totals/version/actor incorrect'; END IF;
 IF EXISTS(SELECT 1 FROM public.rfq_suppliers WHERE rfq_id=rfq AND invitation_sent_at IS NOT NULL) THEN RAISE EXCEPTION 'Opening or quoting falsely marked emails sent'; END IF;
 q_b:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_set(quote_payload,'{lines,0,unit_price_pence}','100')||jsonb_build_object('revision',4,'rfq_supplier_id',selected_b,'quote_reference','Q-B','delivery_charge_pence',0));
 q_a2:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_set(quote_payload,'{lines,0,unit_price_pence}','110')||'{"revision":5,"quote_reference":"Q-A-revised"}');
 IF (SELECT version FROM public.supplier_quote_responses WHERE id=q_a2)<>2 OR NOT EXISTS(SELECT 1 FROM public.supplier_quote_responses WHERE id=q_a) THEN RAISE EXCEPTION 'Quote history lost'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',6,'quote_response_id',q_a,'po_number','OLD-VERSION'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Old quote version awarded'; END IF;
 q_b:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',quote_payload||jsonb_build_object('revision',6,'rfq_supplier_id',selected_b,'quote_reference','Q-B-expired','validity_date',CURRENT_DATE-1));
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',7,'quote_response_id',q_b,'po_number','EXPIRED'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Expired quote awarded'; END IF;
 q_b:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',quote_payload||jsonb_build_object('revision',7,'rfq_supplier_id',selected_b,'quote_reference','Q-B-current'));
 SELECT count(*) INTO before_count FROM public.supplier_quote_responses WHERE rfq_supplier_id=selected_a;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_set(quote_payload,'{lines,0,unit_price_pence}','-1')||'{"revision":8}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed OR (SELECT count(*) FROM public.supplier_quote_responses WHERE rfq_supplier_id=selected_a)<>before_count THEN RAISE EXCEPTION 'Invalid quote did not roll back'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_set(quote_payload,'{lines,0,rfq_line_id}',to_jsonb(gen_random_uuid()))||'{"revision":8}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Foreign quote line accepted'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',quote_payload||'{"revision":8,"lines":[]}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Incomplete quote accepted'; END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'close_rfq',jsonb_build_object('rfq_id',rfq,'revision',8));
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',quote_payload||'{"revision":9}');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Closed RFQ accepted new quote'; END IF;
 -- Another RFQ can be prepared before an award, but it must not duplicate order quantities later.
 rfq2:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload||jsonb_build_object('reference','RFQ-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq2,'revision',1));
 SELECT id INTO selected_second FROM public.rfq_suppliers WHERE rfq_id=rfq2 AND supplier_id=supplier_a;
 SELECT id INTO line FROM public.rfq_lines WHERE rfq_id=rfq2;
 q_second:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_set(quote_payload,'{lines,0,rfq_line_id}',to_jsonb(line))||jsonb_build_object('rfq_id',rfq2,'revision',2,'rfq_supplier_id',selected_second));
 cancelled:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload||jsonb_build_object('reference','RFQ-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'cancel_rfq',jsonb_build_object('rfq_id',cancelled,'revision',1,'reason','No longer needed'));
 IF NOT EXISTS(SELECT 1 FROM public.requests_for_quotation WHERE id=cancelled AND status='cancelled' AND cancellation_reason='No longer needed') THEN RAISE EXCEPTION 'Cancellation missing'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',cancelled,'revision',2));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Cancelled RFQ reopened'; END IF;
 failed:=false;BEGIN UPDATE public.requests_for_quotation SET status='awarded' WHERE id=rfq;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct RFQ mutation allowed'; END IF;
 failed:=false;BEGIN UPDATE public.supplier_quote_responses SET gross_total_pence=0 WHERE id=q_a2;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct quote tampering allowed'; END IF;
 IF has_table_privilege('authenticated','public.rfq_lines','INSERT') OR has_table_privilege('authenticated','public.rfq_suppliers','UPDATE') OR has_table_privilege('authenticated','public.supplier_quote_lines','DELETE') OR has_table_privilege('authenticated','public.supplier_quote_responses','TRUNCATE') THEN RAISE EXCEPTION 'Direct write bypass granted'; END IF;
 PERFORM set_config('test.rfq_id',rfq::text,true);PERFORM set_config('test.rfq_quote_id',q_a2::text,true);PERFORM set_config('test.rfq_req_id',req::text,true);PERFORM set_config('test.second_rfq_id',rfq2::text,true);PERFORM set_config('test.second_quote_id',q_second::text,true);PERFORM set_config('test.rfq_supplier_a',supplier_a::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.requests_for_quotation WHERE id=rfq) OR EXISTS(SELECT 1 FROM public.rfq_lines WHERE rfq_id=rfq) OR EXISTS(SELECT 1 FROM public.rfq_suppliers WHERE rfq_id=rfq) OR EXISTS(SELECT 1 FROM public.supplier_quote_responses WHERE id=q_a2) OR EXISTS(SELECT 1 FROM public.supplier_quote_lines WHERE quote_response_id=q_a2) THEN RAISE EXCEPTION 'Unrelated identity can read quote data'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload);EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Unrelated identity can write RFQs'; END IF;
 PERFORM set_config('request.jwt.claims','{}',true);
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Null authentication bypass'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='project_manager' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_rfq_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',current_setting('test.rfq_id'),'revision',9,'quote_response_id',current_setting('test.rfq_quote_id'),'po_number','NOT-PERMITTED'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Project manager awarded quote'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid; rfq uuid:=current_setting('test.rfq_id')::uuid; req uuid:=current_setting('test.rfq_req_id')::uuid; po uuid; request uuid:=gen_random_uuid(); payload jsonb; failed boolean; before_count integer;
BEGIN
 payload:=jsonb_build_object('rfq_id',rfq,'revision',9,'quote_response_id',current_setting('test.rfq_quote_id'),'po_number','RFQ-PO-ROLLBACK-'||gen_random_uuid(),'supplier_id',gen_random_uuid(),'status','approved','gross_total_pence',1);
 po:=public.procurement_rfq_write(org,request,'award_rfq',payload);
 IF public.procurement_rfq_write(org,request,'award_rfq',payload)<>po THEN RAISE EXCEPTION 'Award replay duplicated order'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.purchase_orders WHERE id=po AND status='draft' AND approved_by IS NULL AND gross_total_pence=1380 AND supplier_id=current_setting('test.rfq_supplier_a')::uuid) OR (SELECT count(*) FROM public.purchase_order_lines WHERE purchase_order_id=po)<>2 THEN RAISE EXCEPTION 'Draft order conversion or derived supplier/totals wrong'; END IF;
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'approved' THEN RAISE EXCEPTION 'Draft falsely marked requisition ordered'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.requests_for_quotation WHERE id=rfq AND status='awarded' AND purchase_order_id=po) THEN RAISE EXCEPTION 'Award link missing'; END IF;
 SELECT count(*) INTO before_count FROM public.purchase_orders WHERE organisation_id=org;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'RFQ awarded twice'; END IF;
 failed:=false;BEGIN PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',current_setting('test.second_rfq_id'),'revision',3,'quote_response_id',current_setting('test.second_quote_id'),'po_number','DUPLICATE-MATERIALS'));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed OR (SELECT count(*) FROM public.purchase_orders WHERE organisation_id=org)<>before_count THEN RAISE EXCEPTION 'Second RFQ double ordered materials or left a partial order'; END IF;
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=req)<>'fully_ordered' THEN RAISE EXCEPTION 'PO approval did not update requisition'; END IF;
 IF (SELECT currency FROM public.purchase_orders WHERE id=po) IS DISTINCT FROM (SELECT currency FROM public.requests_for_quotation WHERE id=rfq) THEN RAISE EXCEPTION 'Currency not preserved'; END IF;
 PERFORM set_config('test.rfq_po_id',po::text,true);
END $test$;
RESET ROLE;
-- Model an existing partially ordered requisition using only this transaction's fixture order.
UPDATE public.purchase_order_lines SET quantity=4,line_total_pence=440 WHERE purchase_order_id=current_setting('test.rfq_po_id')::uuid AND requisition_line_id IS NOT NULL;
UPDATE public.purchase_orders SET net_total_pence=490,tax_total_pence=98,gross_total_pence=588 WHERE id=current_setting('test.rfq_po_id')::uuid;
UPDATE public.purchase_requisitions SET status='partially_ordered',revision=revision+1 WHERE id=current_setting('test.rfq_req_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid; rfq uuid; selection uuid; line uuid; quote uuid; po uuid;
BEGIN
 rfq:=public.procurement_rfq_write(org,gen_random_uuid(),'create_rfq',jsonb_build_object('source_requisition_id',current_setting('test.rfq_req_id'),'reference','RFQ-ROLLBACK-'||gen_random_uuid(),'description','Remaining quantities fixture','supplier_ids',jsonb_build_array(current_setting('test.rfq_supplier_a'))));
 IF (SELECT quantity FROM public.rfq_lines WHERE rfq_id=rfq)<>6 THEN RAISE EXCEPTION 'RFQ did not request only unreserved quantities'; END IF;
 PERFORM public.procurement_rfq_write(org,gen_random_uuid(),'open_rfq',jsonb_build_object('rfq_id',rfq,'revision',1));
 SELECT id INTO selection FROM public.rfq_suppliers WHERE rfq_id=rfq;
 SELECT id INTO line FROM public.rfq_lines WHERE rfq_id=rfq;
 quote:=public.procurement_rfq_write(org,gen_random_uuid(),'record_quote',jsonb_build_object('rfq_id',rfq,'revision',2,'rfq_supplier_id',selection,'quote_reference','REMAINING','lines',jsonb_build_array(jsonb_build_object('rfq_line_id',line,'unit_price_pence',100,'tax_rate',0.2))));
 po:=public.procurement_rfq_write(org,gen_random_uuid(),'award_rfq',jsonb_build_object('rfq_id',rfq,'revision',3,'quote_response_id',quote,'po_number','RFQ-PO-ROLLBACK-'||gen_random_uuid()));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=current_setting('test.rfq_req_id')::uuid)<>'partially_ordered' THEN RAISE EXCEPTION 'Remaining draft falsely marked fully ordered'; END IF;
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));
 IF (SELECT status FROM public.purchase_requisitions WHERE id=current_setting('test.rfq_req_id')::uuid)<>'fully_ordered' THEN RAISE EXCEPTION 'Remaining order did not complete requisition'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only'  WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_rfq_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'cancel_rfq',jsonb_build_object('rfq_id',current_setting('test.second_rfq_id'),'revision',3,'reason','No access'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Read-only workspace accepted write'; END IF;
END $test$;
ROLLBACK;
