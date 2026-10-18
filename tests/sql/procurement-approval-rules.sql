-- Development-only transaction; all rules, fixtures, roles and billing changes roll back.
BEGIN;
UPDATE public.procurement_approval_rules SET is_active=false WHERE organisation_id=current_setting('test.organisation_id')::uuid;
INSERT INTO public.jobs(organisation_id,reference,project_name) VALUES(current_setting('test.organisation_id')::uuid,'RULE-ROLLBACK-JOB','Rule rollback job');
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;rule uuid;stage2 uuid;other_currency uuid;job uuid;supplier uuid;req uuid;req2 uuid;payload jsonb;req_payload jsonb;snapshot jsonb;request uuid:=gen_random_uuid();failed boolean;n integer;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO STRICT job FROM public.jobs WHERE organisation_id=org AND reference='RULE-ROLLBACK-JOB';
 supplier:=public.procurement_write(org,gen_random_uuid(),'create_supplier','{"trading_name":"Approval rule rollback supplier"}');
 payload:=jsonb_build_object('name','Approval rule rollback finance','currency','GBP','min_value_pence',500,'max_value_pence',500,'approval_order',1,'approver_role','finance','job_id',null,'supplier_id',null,'cost_code',null,'prevent_self_approval',false,'is_active',true,'reason','Initial rule');
 rule:=public.procurement_approval_rule_write(org,request,payload);
 IF public.procurement_approval_rule_write(org,request,payload)<>rule OR (SELECT count(*) FROM public.procurement_rule_history WHERE rule_id=rule)<>1 THEN RAISE EXCEPTION 'Rule replay duplicated history';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,request,payload||'{"name":"changed"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Changed request replay accepted';END IF;
 stage2:=public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('name','Approval rule rollback job/supplier','approval_order',2,'approver_role','owner','job_id',job,'supplier_id',supplier,'cost_code','ELEC'));
 other_currency:=public.procurement_approval_rule_write(org,gen_random_uuid(),payload||'{"name":"Approval rule rollback euro","currency":"EUR"}');
 req_payload:=jsonb_build_object('reference','RULE-REQ-'||gen_random_uuid(),'reason','Approval rule test','job_id',job,'lines',jsonb_build_array(jsonb_build_object('description','Materials','quantity',1,'unit_of_measure','each','estimated_unit_price_pence',500,'suggested_supplier_id',supplier,'cost_code','ELEC')));
 req:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',req_payload);
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req,'revision',1));
 SELECT review_steps INTO snapshot FROM public.purchase_requisitions WHERE id=req;
 IF jsonb_array_length(snapshot)<>2 OR snapshot->0->>'rule_id'<>rule::text OR snapshot->1->>'rule_id'<>stage2::text THEN RAISE EXCEPTION 'Currency, inclusive boundary, stage or scope matching wrong';END IF;
 -- Changing rules never rewrites already submitted requisition steps.
 PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('rule_id',rule,'revision',1,'name','Approval rule rollback revised','approver_role','admin','prevent_self_approval',true,'min_value_pence',600,'max_value_pence',null,'reason','Raise threshold and protect self approval'));
 IF (SELECT review_steps FROM public.purchase_requisitions WHERE id=req)<>snapshot THEN RAISE EXCEPTION 'Pending approval changed with rule';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.procurement_rule_history WHERE rule_id=rule AND before_record->>'revision'='1' AND after_record->>'revision'='2' AND actor_id=actor AND reason='Raise threshold and protect self approval') THEN RAISE EXCEPTION 'Audit values missing';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('rule_id',rule,'revision',1));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stale rule update accepted';END IF;
 SELECT count(*) INTO n FROM public.procurement_rule_history WHERE organisation_id=org;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||'{"max_value_pence":499}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Inverted value band accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('job_id',gen_random_uuid()));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Foreign job accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('supplier_id',gen_random_uuid()));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Foreign supplier accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||'{"approver_role":"viewer"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed OR (SELECT count(*) FROM public.procurement_rule_history WHERE organisation_id=org)<>n THEN RAISE EXCEPTION 'Invalid role accepted or failed save left audit records';END IF;
 -- A later submission uses current rules, not the previous finance requirement.
 req2:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',req_payload||jsonb_build_object('reference','RULE-REQ-'||gen_random_uuid()));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req2,'revision',1));
 IF (SELECT jsonb_array_length(review_steps) FROM public.purchase_requisitions WHERE id=req2)<>1 THEN RAISE EXCEPTION 'Updated threshold not used';END IF;
 PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('rule_id',stage2,'revision',1,'is_active',false,'reason','Disable scoped rule'));
 req2:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',req_payload||jsonb_build_object('reference','RULE-REQ-'||gen_random_uuid()));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req2,'revision',1));
 IF (SELECT review_steps->0->>'name' FROM public.purchase_requisitions WHERE id=req2)<>'Standard approval' THEN RAISE EXCEPTION 'No-match fallback changed';END IF;
 -- Reactivate revised rule at this amount with self-approval restriction.
 PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload||jsonb_build_object('rule_id',rule,'revision',2,'approver_role','owner','prevent_self_approval',true,'reason','Require independent owner approval'));
 req2:=public.procurement_requisition_write(org,gen_random_uuid(),'create_requisition',req_payload||jsonb_build_object('reference','RULE-REQ-'||gen_random_uuid()));
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'submit_requisition',jsonb_build_object('requisition_id',req2,'revision',1));
 failed:=false;BEGIN PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',req2,'revision',2));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Configured self approval bypassed';END IF;
 PERFORM set_config('test.rule_id',rule::text,true);PERFORM set_config('test.rule_req',req::text,true);
 IF has_table_privilege('authenticated','public.procurement_approval_rules','UPDATE') OR has_table_privilege('authenticated','public.procurement_rule_history','INSERT') OR has_table_privilege('authenticated','public.procurement_rule_history','DELETE') THEN RAISE EXCEPTION 'Direct rule/audit writes allowed';END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.procurement_approval_rules WHERE id=rule) OR EXISTS(SELECT 1 FROM public.procurement_rule_history WHERE rule_id=rule) THEN RAISE EXCEPTION 'Other identity reads rules/history';END IF;
 failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload);EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Other identity wrote rule';END IF;
 PERFORM set_config('request.jwt.claims','{}',true);failed:=false;BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Null auth bypass';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='finance' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;org uuid:=current_setting('test.organisation_id')::uuid;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_approval_rule_write(org,gen_random_uuid(),'{}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Finance changed approval rules';END IF;
 IF EXISTS(SELECT 1 FROM public.procurement_rule_history WHERE rule_id=current_setting('test.rule_id')::uuid) THEN RAISE EXCEPTION 'Finance read admin-only history';END IF;
 -- Original finance snapshot remains usable after rule edits/deactivation.
 PERFORM public.procurement_requisition_write(org,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',current_setting('test.rule_req'),'revision',2));
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
 PERFORM public.procurement_requisition_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'approve_requisition',jsonb_build_object('requisition_id',current_setting('test.rule_req'),'revision',3));
 IF NOT EXISTS(SELECT 1 FROM public.purchase_requisitions WHERE id=current_setting('test.rule_req')::uuid AND status='approved') THEN RAISE EXCEPTION 'Original staged approval failed';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_approval_rule_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'{}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Read-only rule write permitted';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
