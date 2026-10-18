-- Entire test, including role/billing/currency changes, is rolled back.
BEGIN;
INSERT INTO public.jobs(organisation_id,reference,project_name) VALUES(current_setting('test.organisation_id')::uuid,'RETENTION-ROLLBACK','Retention rollback test');
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;job uuid;rec uuid;q uuid;q2 uuid;payment uuid;request uuid:=gen_random_uuid();payload jsonb;failed boolean;rev integer;org2 uuid:=gen_random_uuid();
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO STRICT job FROM public.jobs WHERE organisation_id=org AND reference='RETENTION-ROLLBACK';
 payload:=jsonb_build_object('job_id',job,'reference','RETENTION-ROLLBACK-1','counterparty','Rollback client','retention_type','client_held','percentage',3.5,'withheld_pence',10001,'pc_share_bps',3333,'pc_due_date',current_date,'defects_due_date',current_date,'reason','Actual withholding reference');
 rec:=public.retention_write(org,request,'create',payload);
 IF public.retention_write(org,request,'create',payload)<>rec OR (SELECT count(*) FROM public.retention_history WHERE retention_id=rec)<>1 THEN RAISE EXCEPTION 'Create replay duplicated records';END IF;
 IF EXISTS(SELECT 1 FROM public.audit_events WHERE entity_id=rec AND (note IS NOT NULL OR change_summary ? 'before' OR change_summary ? 'after')) THEN RAISE EXCEPTION 'Detailed financial history leaked into general audit';END IF;
 IF (SELECT currency FROM public.retention_records WHERE id=rec)<>'GBP' THEN RAISE EXCEPTION 'Currency not captured';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,request,'create',payload||'{"percentage":5}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Changed replay accepted';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'create',payload||jsonb_build_object('reference','RETENTION-INVALID','job_id',gen_random_uuid()));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Foreign job accepted';END IF;
 SELECT revision INTO rev FROM public.retention_records WHERE id=rec;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',3333,'reason','No milestone'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Unachieved release accepted';END IF;
 PERFORM public.retention_write(org,gen_random_uuid(),'milestone',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','effective_date',current_date,'reason','Completion certificate'));rev:=rev+1;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev-1,'stage','pc','amount_pence',1,'reason','Stale'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stale revision accepted';END IF;
 q:=public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',3333,'reason','Request agreed first stage'));rev:=rev+1;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',1,'reason','Double reservation'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stage over-reserved';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'configure',payload||jsonb_build_object('retention_id',rec,'revision',rev,'pc_share_bps',10000));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Terms changed with live release';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'settle',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',1,'amount_pence',3333,'effective_date',current_date,'payment_reference','RETENTION-PREAPPROVAL','reason','Premature settlement'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Unapproved release settled';END IF;
 PERFORM public.retention_write(org,gen_random_uuid(),'approve',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',1,'reason','Approved against contract'));rev:=rev+1;
 IF (SELECT released_pence FROM public.retention_records WHERE id=rec)<>0 THEN RAISE EXCEPTION 'Approval changed cash';END IF;
 request:=gen_random_uuid();payload:=jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',2,'amount_pence',1000,'effective_date',current_date,'payment_reference','RETENTION-PARTIAL','reason','Actual client receipt');
 PERFORM public.retention_write(org,request,'settle',payload);PERFORM public.retention_write(org,request,'settle',payload);rev:=rev+1;
 IF (SELECT released_pence FROM public.retention_records WHERE id=rec)<>1000 OR (SELECT status FROM public.retention_release_requests WHERE id=q)<>'partially_settled' THEN RAISE EXCEPTION 'Partial receipt or replay incorrect';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'settle',payload||jsonb_build_object('revision',rev,'release_revision',3,'amount_pence',2334,'payment_reference','RETENTION-OVER'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Over-settlement accepted';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'settle',payload||jsonb_build_object('revision',rev,'release_revision',3,'amount_pence',1));EXCEPTION WHEN unique_violation THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Duplicate bank reference accepted';END IF;
 SELECT id INTO STRICT payment FROM public.retention_history WHERE retention_id=rec AND action='settle';
 PERFORM public.retention_write(org,gen_random_uuid(),'reverse',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',3,'payment_id',payment,'reason','Wrong receipt allocated'));rev:=rev+1;
 IF (SELECT released_pence FROM public.retention_records WHERE id=rec)<>0 OR (SELECT status FROM public.retention_release_requests WHERE id=q)<>'approved' THEN RAISE EXCEPTION 'Reversal failed';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'reverse',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',4,'payment_id',payment,'reason','Second reversal'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Settlement reversed twice';END IF;
 PERFORM public.retention_write(org,gen_random_uuid(),'cancel',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',4,'reason','Replace request'));rev:=rev+1;
 q2:=public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',3333,'reason','Replacement using released reservation'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'approve',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q2,'release_revision',1,'reason','Approved replacement'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'settle',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q2,'release_revision',2,'amount_pence',3333,'effective_date',current_date,'payment_reference','RETENTION-PC-FULL','reason','Actual receipt'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'milestone',jsonb_build_object('retention_id',rec,'revision',rev,'stage','defects','effective_date',current_date,'reason','Defects signed off'));rev:=rev+1;
 q:=public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','defects','amount_pence',6668,'reason','Remaining stage including rounding remainder'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'approve',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',1,'reason','Approved defects'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'settle',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',2,'amount_pence',6668,'effective_date',current_date,'payment_reference','RETENTION-DEFECTS-FULL','reason','Final actual receipt'));rev:=rev+1;
 IF (SELECT released_pence FROM public.retention_records WHERE id=rec)<>10001 OR (SELECT status FROM public.retention_records WHERE id=rec)<>'fully_released' THEN RAISE EXCEPTION 'Full release or rounding mismatch';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'void',jsonb_build_object('retention_id',rec,'revision',rev,'reason','Cannot hide payments'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Settled record voided';END IF;
 failed:=false;BEGIN UPDATE public.retention_records SET released_pence=0 WHERE id=rec;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Direct mutation allowed';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org2,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',1,'reason','Other company'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Other company write allowed';END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.retention_records WHERE id=rec) OR EXISTS(SELECT 1 FROM public.retention_release_requests WHERE retention_id=rec) OR EXISTS(SELECT 1 FROM public.retention_history WHERE retention_id=rec) THEN RAISE EXCEPTION 'Other identity reads retention';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'create',payload);EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Other identity mutation allowed';END IF;
END $test$;
RESET ROLE;
-- Alternate direction, future dates, split boundaries and cancellation/void.
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;job uuid;rec uuid;q uuid;rev integer;failed boolean;payload jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO job FROM public.jobs WHERE organisation_id=org AND reference='RETENTION-ROLLBACK';
 payload:=jsonb_build_object('job_id',job,'reference','RETENTION-ROLLBACK-PAYABLE','counterparty','Rollback subcontractor','retention_type','subcontractor_held','percentage',5,'withheld_pence',500,'pc_share_bps',0,'pc_due_date',current_date+1,'defects_due_date',current_date+2,'reason','Actual subcontractor withholding');
 rec:=public.retention_write(org,gen_random_uuid(),'create',payload);SELECT revision INTO rev FROM public.retention_records WHERE id=rec;
 PERFORM public.retention_write(org,gen_random_uuid(),'milestone',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','effective_date',current_date,'reason','Completed'));rev:=rev+1;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',1,'reason','Not due'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Future or zero-share stage accepted';END IF;
 PERFORM public.retention_write(org,gen_random_uuid(),'configure',payload||jsonb_build_object('retention_id',rec,'revision',rev,'pc_share_bps',10000,'pc_due_date',current_date));rev:=rev+1;
 q:=public.retention_write(org,gen_random_uuid(),'request',jsonb_build_object('retention_id',rec,'revision',rev,'stage','pc','amount_pence',500,'reason','Entire agreed completion share'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'cancel',jsonb_build_object('retention_id',rec,'revision',rev,'release_id',q,'release_revision',1,'reason','Incorrect unused withholding'));rev:=rev+1;
 PERFORM public.retention_write(org,gen_random_uuid(),'void',jsonb_build_object('retention_id',rec,'revision',rev,'reason','Replace incorrect record'));
 IF (SELECT voided_at FROM public.retention_records WHERE id=rec) IS NULL THEN RAISE EXCEPTION 'Void missing';END IF;
END $test$;
RESET ROLE;
-- Stored currency survives later changes to company settings.
UPDATE public.organisations SET default_currency='EUR' WHERE id=current_setting('test.organisation_id')::uuid;
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM public.retention_records WHERE organisation_id=current_setting('test.organisation_id')::uuid AND reference LIKE 'RETENTION-ROLLBACK%' AND currency<>'GBP') THEN RAISE EXCEPTION 'Stored currency changed with company setting';END IF;
END $test$;
-- Role restrictions use database membership, not client claims.
UPDATE public.organisation_members SET role='project_manager' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;failed boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','user_metadata',jsonb_build_object('role','owner'))::text,true);
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'create','{"reason":"PM cannot create financial records"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'PM created financial record';END IF;
 failed:=false;BEGIN PERFORM public.retention_write(org,gen_random_uuid(),'approve','{"reason":"PM cannot approve"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'PM approved financial release';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
-- Force read-only using the same access-state mechanism used by existing transaction tests.
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 failed:=false;BEGIN PERFORM public.retention_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'create','{"reason":"Blocked read-only"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Read-only write accepted';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.retention_records WHERE reference='RETENTION-ROLLBACK-1') THEN RAISE EXCEPTION 'Read-only cannot view retention';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
