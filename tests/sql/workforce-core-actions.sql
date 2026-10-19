-- This entire fixture, role switch and read-only test rolls back.
BEGIN;
INSERT INTO public.jobs(organisation_id,reference,project_name) VALUES(current_setting('test.organisation_id')::uuid,'WORKFORCE-ROLLBACK-A','Workforce rollback A'),(current_setting('test.organisation_id')::uuid,'WORKFORCE-ROLLBACK-B','Workforce rollback B');
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;job_a uuid;job_b uuid;person uuid;request uuid:=gen_random_uuid();payload jsonb;failed boolean;rev integer;other_org uuid:=gen_random_uuid();
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO STRICT job_a FROM public.jobs WHERE organisation_id=org AND reference='WORKFORCE-ROLLBACK-A';SELECT id INTO STRICT job_b FROM public.jobs WHERE organisation_id=org AND reference='WORKFORCE-ROLLBACK-B';
 payload:=jsonb_build_object('first_name','Workforce','last_name','Rollback','relationship','subcontractor_individual','primary_trade','Electrician','email','workforce-rollback@example.invalid','phone','012345','trading_name','Test Trades','business_type','sole_trader','current_job_id',job_a,'reason','Testing transactional workforce registration');
 person:=public.workforce_write(org,request,'create',payload);
 IF public.workforce_write(org,request,'create',payload)<>person OR (SELECT count(*) FROM public.workforce_history WHERE person_id=person AND action='create')<>1 OR (SELECT count(*) FROM public.workforce_assignments WHERE person_id=person AND job_id=job_a AND expected_finish_date IS NULL)<>1 THEN RAISE EXCEPTION 'Create replay or initial assignment failed';END IF;
 IF (SELECT business_type FROM public.workforce_people WHERE id=person)<>'sole_trader' THEN RAISE EXCEPTION 'Business type was not saved';END IF;
 failed:=false;BEGIN PERFORM public.workforce_write(org,request,'create',payload||'{"first_name":"Other"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Changed replay accepted';END IF;
 SELECT revision INTO rev FROM public.workforce_people WHERE id=person;
 failed:=false;BEGIN PERFORM public.workforce_write(org,gen_random_uuid(),'update',jsonb_build_object('person_id',person,'revision',rev,'first_name','','last_name','Rollback','relationship','employee','primary_trade','Electrician','reason','Invalid'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Invalid name accepted';END IF;
 failed:=false;BEGIN PERFORM public.workforce_write(org,gen_random_uuid(),'update',jsonb_build_object('person_id',person,'revision',rev-1,'first_name','Stale','last_name','Rollback','relationship','employee','primary_trade','Electrician','current_job_id',job_a,'reason','Stale test'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stale profile revision accepted';END IF;
 failed:=false;BEGIN PERFORM public.workforce_write(org,gen_random_uuid(),'assign',jsonb_build_object('person_id',person,'revision',rev,'job_id',gen_random_uuid(),'reason','Foreign job'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Foreign job assignment accepted';END IF;
 payload:=jsonb_build_object('person_id',person,'revision',rev,'first_name','Workforce','last_name','Rollback Edited','relationship','subcontractor_individual','primary_trade','Electrician','email','workforce-rollback@example.invalid','phone','012345','trading_name','Test Trades','current_job_id',job_b,'effective_date',current_date,'reason','Correct worker record and move to another job');
 PERFORM public.workforce_write(org,gen_random_uuid(),'update',payload);rev:=rev+1;
 IF (SELECT current_job_id FROM public.workforce_people WHERE id=person)<>job_b OR (SELECT count(*) FROM public.workforce_assignments WHERE person_id=person AND job_id=job_a AND expected_finish_date=current_date)<>1 OR (SELECT count(*) FROM public.workforce_assignments WHERE person_id=person AND job_id=job_b AND expected_finish_date IS NULL)<>1 THEN RAISE EXCEPTION 'Update and job transfer were not atomic';END IF;
 failed:=false;BEGIN INSERT INTO public.workforce_people(organisation_id,first_name,last_name,relationship) VALUES(org,'Direct','Write','employee');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Direct person insert bypassed server action';END IF;
 failed:=false;BEGIN UPDATE public.workforce_people SET first_name='Direct write' WHERE id=person;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Direct person update bypassed server action';END IF;
 failed:=false;BEGIN PERFORM public.workforce_write(other_org,gen_random_uuid(),'archive',jsonb_build_object('person_id',person,'revision',rev,'reason','Cross company'));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Cross-company action accepted';END IF;
 IF (SELECT count(*) FROM public.workforce_history WHERE person_id=person AND reason='Correct worker record and move to another job')<>1 THEN RAISE EXCEPTION 'Reason was not retained in restricted history';END IF;
 PERFORM public.workforce_write(org,gen_random_uuid(),'archive',jsonb_build_object('person_id',person,'revision',rev,'reason','End of engagement'));rev:=rev+1;
 IF (SELECT archived_at FROM public.workforce_people WHERE id=person) IS NULL OR (SELECT current_job_id FROM public.workforce_people WHERE id=person) IS NOT NULL OR (SELECT count(*) FROM public.workforce_assignments WHERE person_id=person AND expected_finish_date=current_date)<>2 THEN RAISE EXCEPTION 'Archive did not close assignment and retain record';END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.workforce_people WHERE id=person) OR EXISTS(SELECT 1 FROM public.workforce_history WHERE person_id=person) THEN RAISE EXCEPTION 'Other identity reads company workforce';END IF;
END $test$;
RESET ROLE;
-- Database membership beats a user-supplied metadata claim.
UPDATE public.organisation_members SET role='finance' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;failed boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','user_metadata',jsonb_build_object('role','owner'))::text,true);
 failed:=false;BEGIN PERFORM public.workforce_write(org,gen_random_uuid(),'create','{"reason":"Finance cannot add workforce"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Finance could create worker';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 failed:=false;BEGIN PERFORM public.workforce_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'create','{"reason":"Blocked read-only"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Read-only workforce write accepted';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workforce_people WHERE organisation_id=current_setting('test.organisation_id')::uuid) THEN RAISE EXCEPTION 'Read-only workforce list is unavailable';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
