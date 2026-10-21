-- Set test.organisation_id and test.actor_id to an active writable owner fixture.
BEGIN;
DO $$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;person uuid;inv uuid:=gen_random_uuid();result jsonb;failed boolean;before_members bigint;
BEGIN
 SELECT count(*) INTO before_members FROM public.organisation_members;
 INSERT INTO public.workforce_people(organisation_id,first_name,last_name,relationship,email,primary_trade) VALUES(org,'Invitation','Rollback','employee','invitation-check@example.invalid','Electrician') RETURNING id INTO person;
 result:=public.workforce_invitation_operation('create',jsonb_build_object('id',inv,'organisation_id',org,'actor_id',actor,'person_id',person,'token_hash',repeat('a',64)));
 IF result->>'email'<>'invitation-check@example.invalid' THEN RAISE EXCEPTION 'Recipient incorrect';END IF;
 PERFORM public.workforce_invitation_operation('create',jsonb_build_object('id',inv,'organisation_id',org,'actor_id',actor,'person_id',person,'token_hash',repeat('a',64)));
 IF (SELECT count(*) FROM procurement_private.workforce_invitations WHERE person_id=person)<>1 THEN RAISE EXCEPTION 'Duplicate invitation';END IF;
 failed:=false;BEGIN PERFORM public.workforce_invitation_operation('create',jsonb_build_object('id',gen_random_uuid(),'organisation_id',org,'actor_id',gen_random_uuid(),'person_id',person,'token_hash',repeat('b',64)));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Unrelated actor allowed';END IF;
 failed:=false;BEGIN PERFORM public.workforce_invitation_operation('preview','{"token_hash":"invalid"}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Invalid token allowed';END IF;
 PERFORM public.workforce_invitation_operation('accept',jsonb_build_object('token_hash',repeat('a',64)));
 PERFORM public.workforce_invitation_operation('accept',jsonb_build_object('token_hash',repeat('a',64)));
 IF (SELECT count(*) FROM public.workforce_history WHERE person_id=person AND action='invitation_accepted')<>1 OR (SELECT passport_status FROM public.workforce_people WHERE id=person)<>'in_progress' THEN RAISE EXCEPTION 'Acceptance replay or status incorrect';END IF;
 IF (SELECT count(*) FROM public.organisation_members)<>before_members THEN RAISE EXCEPTION 'Invitation granted membership';END IF;
 UPDATE procurement_private.workforce_invitations SET status='revoked' WHERE id=inv;
 failed:=false;BEGIN PERFORM public.workforce_invitation_operation('preview',jsonb_build_object('token_hash',repeat('a',64)));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Revoked invitation allowed';END IF;
 UPDATE procurement_private.workforce_invitations SET status='pending',expires_at=now()-interval '1 second' WHERE id=inv;
 failed:=false;BEGIN PERFORM public.workforce_invitation_operation('accept',jsonb_build_object('token_hash',repeat('a',64)));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expired invitation allowed';END IF;
 IF has_function_privilege('anon','public.workforce_invitation_operation(text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.workforce_invitation_operation(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Public privileged operation exposed';END IF;
END;$$;
ROLLBACK;
