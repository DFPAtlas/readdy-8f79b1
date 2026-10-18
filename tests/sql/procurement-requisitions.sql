-- Development integration checks, run with test.actor_id and test.organisation_id set by a test administrator.
-- All records, memberships, rules and billing changes are rolled back.
BEGIN;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 actor uuid:=current_setting('test.actor_id')::uuid; org uuid:=current_setting('test.organisation_id')::uuid;
 v_test_id uuid; second_id uuid; request uuid:=gen_random_uuid(); payload jsonb; failed boolean; before_count integer; before_orders integer;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 payload:=jsonb_build_object('reference','REQ-ROLLBACK-'||gen_random_uuid(),'reason','Requisition transaction fixture','priority','normal','lines',jsonb_build_array(jsonb_build_object('description','Test materials','quantity',2,'unit_of_measure','each','estimated_unit_price_pence',123)));
 v_test_id:=public.procurement_requisition_write(org,request,'create_requisition',payload);
 IF public.procurement_requisition_write(org,request,'create_requisition',payload)<>v_test_id THEN RAISE EXCEPTION 'Create replay failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id AND status='draft' AND revision=1 AND estimated_cost_pence=246 AND requester_id=actor) THEN RAISE EXCEPTION 'Draft total/state incorrect'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,request,'create_requisition',payload||'{"reason":"changed"}'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Changed replay allowed'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_set(payload,'{reference}',to_jsonb(' '||lower(payload->>'reference')||' '))); EXCEPTION WHEN unique_violation THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Normalized duplicate reference allowed'; END IF;
 SELECT count(*) INTO before_count FROM public.purchase_requisitions WHERE organisation_id=org;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_set(payload,'{lines,0,quantity}','-1')||jsonb_build_object('reference','INVALID-'||gen_random_uuid())); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed OR (SELECT count(*) FROM public.purchase_requisitions WHERE organisation_id=org)<>before_count THEN RAISE EXCEPTION 'Invalid draft not rolled back'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',payload||jsonb_build_object('job_id',gen_random_uuid(),'reference','FOREIGN-'||gen_random_uuid())); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Foreign job accepted'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_set(payload,'{lines,0,suggested_supplier_id}',to_jsonb(gen_random_uuid()))||jsonb_build_object('reference','FOREIGN-'||gen_random_uuid())); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Foreign supplier accepted'; END IF;
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',1));
 IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id AND status='submitted' AND revision=2 AND submitted_at IS NOT NULL AND jsonb_array_length(review_steps)=1) THEN RAISE EXCEPTION 'Submit or fallback approval incorrect'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',1)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Stale approval accepted'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'update_requisition',payload||jsonb_build_object('requisition_id',v_test_id,'revision',2)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Submitted draft edited'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'request_requisition_changes',jsonb_build_object('requisition_id',v_test_id,'revision',2)); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Changes without reason accepted'; END IF;
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'request_requisition_changes',jsonb_build_object('requisition_id',v_test_id,'revision',2,'decision_reason','Need three items'));
 IF NOT EXISTS(SELECT 1 FROM public.procurement_approvals WHERE requisition_id=v_test_id AND action='request_requisition_changes' AND decision_reason='Need three items' AND approver_id=actor AND requisition_revision=3) THEN RAISE EXCEPTION 'Decision history missing'; END IF;
 payload:=jsonb_set(payload,'{lines,0,quantity}','3');
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'update_requisition',payload||jsonb_build_object('requisition_id',v_test_id,'revision',3));
 IF (SELECT estimated_cost_pence FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id)<>369 OR (SELECT count(*) FROM public.requisition_lines WHERE requisition_id=v_test_id)<>1 THEN RAISE EXCEPTION 'Edited lines did not replace atomically'; END IF;
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',4));
 SELECT count(*) INTO before_orders FROM public.purchase_orders WHERE organisation_id=org;
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',5));
 IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id AND status='approved' AND revision=6 AND approved_at IS NOT NULL) OR (SELECT count(*) FROM public.purchase_orders WHERE organisation_id=org)<>before_orders THEN RAISE EXCEPTION 'Approval state or order separation failed'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'cancel_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',6)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Approved request cancelled'; END IF;
 second_id:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',payload||jsonb_build_object('reference','REQ-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',second_id,'revision',1));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'reject_requisition',jsonb_build_object('requisition_id',second_id,'revision',2,'decision_reason','Not required'));
 IF (SELECT status FROM public.purchase_requisitions WHERE purchase_requisitions.id=second_id)<>'rejected' THEN RAISE EXCEPTION 'Rejection failed'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',second_id,'revision',3)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Rejected request resubmitted'; END IF;
 second_id:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',payload||jsonb_build_object('reference','REQ-ROLLBACK-'||gen_random_uuid()));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'cancel_requisition',jsonb_build_object('requisition_id',second_id,'revision',1,'decision_reason','Fixture no longer needed'));
 IF (SELECT status FROM public.purchase_requisitions WHERE purchase_requisitions.id=second_id)<>'cancelled' THEN RAISE EXCEPTION 'Cancellation failed'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',second_id,'revision',2)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Cancelled request submitted'; END IF;
 failed:=false; BEGIN UPDATE public.purchase_requisitions SET status='approved' WHERE purchase_requisitions.id=v_test_id; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct approval bypass'; END IF;
 failed:=false; BEGIN UPDATE public.requisition_lines SET quantity=100 WHERE requisition_id=v_test_id; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct line edit allowed'; END IF;
 failed:=false; BEGIN UPDATE public.procurement_approvals SET approver_id=gen_random_uuid() WHERE requisition_id=v_test_id; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Audit edit allowed'; END IF;
 failed:=false; BEGIN INSERT INTO public.procurement_approval_rules(organisation_id,rule_name,approver_role) VALUES(org,'bypass','site_supervisor'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Member can rewrite approval rules'; END IF;
 IF has_table_privilege('authenticated','public.purchase_requisitions','TRUNCATE') OR has_table_privilege('authenticated','public.procurement_approvals','TRUNCATE') THEN RAISE EXCEPTION 'Truncate bypass allowed'; END IF;
 PERFORM set_config('test.requisition_id',v_test_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id) OR EXISTS(SELECT 1 FROM public.requisition_lines WHERE requisition_id=v_test_id) OR EXISTS(SELECT 1 FROM public.procurement_approvals WHERE requisition_id=v_test_id) THEN RAISE EXCEPTION 'Other identity reads company data'; END IF;
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',payload); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Other identity writes company data'; END IF;
 PERFORM set_config('request.jwt.claims','{}',true);
 failed:=false; BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',payload); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Null auth bypass'; END IF;
END $test$;
RESET ROLE;
-- Use a second existing identity only inside this rolled-back transaction to exercise independent review.
SELECT set_config('test.reviewer_id',(SELECT u.id::text FROM auth.users u WHERE u.id<>current_setting('test.actor_id')::uuid ORDER BY u.id LIMIT 1),true);
INSERT INTO public.organisation_members(organisation_id,user_id,role,status)
VALUES(current_setting('test.organisation_id')::uuid,current_setting('test.reviewer_id')::uuid,'finance','active')
ON CONFLICT(organisation_id,user_id) DO UPDATE SET role='finance',status='active';
INSERT INTO public.procurement_approval_rules(organisation_id,rule_name,approver_role,approval_order,prevent_self_approval,min_value_pence)
VALUES(current_setting('test.organisation_id')::uuid,'ROLLBACK Owner review','owner',1,false,300),
(current_setting('test.organisation_id')::uuid,'ROLLBACK Independent finance','finance',2,true,300),
(current_setting('test.organisation_id')::uuid,'ROLLBACK Out of value range','site_supervisor',1,false,10000);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid; actor uuid:=current_setting('test.actor_id')::uuid; v_test_id uuid; failed boolean:=false;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 v_test_id:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',jsonb_build_object('reference','REQ-ROLLBACK-'||gen_random_uuid(),'reason','Independent approval fixture','lines',jsonb_build_array(jsonb_build_object('description','Test material','quantity',3,'unit_of_measure','each','estimated_unit_price_pence',123))));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',1));
 IF (SELECT jsonb_array_length(review_steps) FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id)<>2 THEN RAISE EXCEPTION 'Matching approval rule selection failed'; END IF;
 PERFORM set_config('test.multistep_id',v_test_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.reviewer_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',2)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Later approval step bypassed sequence'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',2));
 IF (SELECT status FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id)<>'under_review' THEN RAISE EXCEPTION 'Partial approval marked fully approved'; END IF;
END $test$;
RESET ROLE;
-- Change the live rule after submission: the pinned review still requires independent finance.
UPDATE public.procurement_approval_rules SET approver_role='owner',prevent_self_approval=false WHERE rule_name='ROLLBACK Independent finance';
UPDATE public.organisation_members SET role='finance' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid; v_test_id uuid:=current_setting('test.multistep_id')::uuid; failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',3)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Requester bypassed pinned self-approval restriction'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.reviewer_id'),'role','authenticated')::text,true);
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',v_test_id,'revision',3));
 IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE purchase_requisitions.id=v_test_id AND status='approved' AND revision=4) THEN RAISE EXCEPTION 'Independent final approval failed'; END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_requisition_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'cancel_requisition',jsonb_build_object('requisition_id',current_setting('test.requisition_id'),'revision',6)); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Read-only workspace accepted write'; END IF;
END $test$;
ROLLBACK;
