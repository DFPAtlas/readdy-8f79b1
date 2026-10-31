BEGIN;
DO $$
DECLARE request uuid:=gen_random_uuid();result jsonb;failed boolean;token text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');
BEGIN
 result:=public.demo_request_operation('create',jsonb_build_object('id',request,'name','Demo rollback','email','demo-rollback@example.invalid','company','Sample rollback','token_hash',token));
 PERFORM public.demo_request_operation('create',jsonb_build_object('id',request,'name','Demo rollback','email','demo-rollback@example.invalid','company','Sample rollback','token_hash',token));
 IF (SELECT count(*) FROM procurement_private.demo_requests WHERE id=request)<>1 THEN RAISE EXCEPTION 'Duplicate request';END IF;
 result:=public.demo_request_operation('redeem',jsonb_build_object('token_hash',token,'session_hash',repeat('a',64)));
 IF result->>'company'<>'Sample rollback' THEN RAISE EXCEPTION 'Wrong workspace';END IF;
 PERFORM public.demo_request_operation('redeem',jsonb_build_object('token_hash',token,'session_hash',repeat('a',64)));
 failed:=false;BEGIN PERFORM public.demo_request_operation('redeem',jsonb_build_object('token_hash',token,'session_hash',repeat('b',64)));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Second session accepted';END IF;
 UPDATE procurement_private.demo_requests SET expires_at=now()-interval '1 second' WHERE id=request;
 failed:=false;BEGIN PERFORM public.demo_request_operation('redeem',jsonb_build_object('token_hash',token,'session_hash',repeat('a',64)));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expired session accepted';END IF;
 IF has_function_privilege('anon','public.demo_request_operation(text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.demo_request_operation(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Privileged demo operation exposed';END IF;
END;$$;
ROLLBACK;
