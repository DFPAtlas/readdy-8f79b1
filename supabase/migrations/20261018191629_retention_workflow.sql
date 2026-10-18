-- Contract terms are entered explicitly; legacy rows require configuration before release.
ALTER TABLE public.retention_records
 ADD COLUMN reference text,
 ADD COLUMN counterparty text,
 ADD COLUMN currency text,
 ADD COLUMN pc_share_bps integer,
 ADD COLUMN pc_due_date date,
 ADD COLUMN defects_due_date date,
 ADD COLUMN pc_completed_date date,
 ADD COLUMN defects_completed_date date,
 ADD COLUMN revision integer NOT NULL DEFAULT 1,
 ADD COLUMN voided_at timestamptz,
 ADD CONSTRAINT retention_money_valid CHECK (withheld_pence>=0 AND released_pence>=0 AND released_pence<=withheld_pence),
 ADD CONSTRAINT retention_share_valid CHECK (pc_share_bps BETWEEN 0 AND 10000),
 ADD CONSTRAINT retention_currency_valid CHECK(currency IN ('GBP','EUR','USD','AUD','CAD','NZD'));
CREATE UNIQUE INDEX retention_reference_unique ON public.retention_records(organisation_id,lower(reference)) WHERE reference IS NOT NULL;
CREATE TABLE public.retention_release_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 retention_id uuid NOT NULL REFERENCES public.retention_records(id),
 stage text NOT NULL CHECK(stage IN ('pc','defects')),
 amount_pence integer NOT NULL CHECK(amount_pence>0),
 settled_pence integer NOT NULL DEFAULT 0 CHECK(settled_pence>=0 AND settled_pence<=amount_pence),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','partially_settled','settled','cancelled')),
 requested_by uuid NOT NULL, approved_by uuid, approved_at timestamptz,
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.retention_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 retention_id uuid NOT NULL REFERENCES public.retention_records(id),
 release_id uuid REFERENCES public.retention_release_requests(id),
 actor_id uuid NOT NULL,
 action text NOT NULL,
 reason text NOT NULL,
 amount_pence integer,
 payment_reference text,
 effective_date date,
 reverses_id uuid REFERENCES public.retention_history(id),
 before_record jsonb,
 after_record jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX retention_single_reversal ON public.retention_history(reverses_id) WHERE reverses_id IS NOT NULL;
CREATE UNIQUE INDEX retention_payment_reference_unique ON public.retention_history(organisation_id,lower(payment_reference)) WHERE action='settle';
CREATE INDEX retention_release_org ON public.retention_release_requests(organisation_id,retention_id);
CREATE INDEX retention_history_org ON public.retention_history(organisation_id,retention_id,created_at DESC);
ALTER TABLE public.retention_release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_history ENABLE ROW LEVEL SECURITY;
DROP POLICY "Org members can read retention" ON public.retention_records;
CREATE POLICY retention_read ON public.retention_records FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.organisation_members m WHERE m.organisation_id=retention_records.organisation_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role IN ('owner','admin','finance','project_manager')));
CREATE POLICY retention_release_read ON public.retention_release_requests FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.organisation_members m WHERE m.organisation_id=retention_release_requests.organisation_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role IN ('owner','admin','finance','project_manager')));
CREATE POLICY retention_history_read ON public.retention_history FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.organisation_members m WHERE m.organisation_id=retention_history.organisation_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role IN ('owner','admin','finance','project_manager')));
REVOKE ALL ON public.retention_records,public.retention_release_requests,public.retention_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.retention_records,public.retention_release_requests,public.retention_history TO authenticated;
CREATE FUNCTION procurement_private.retention_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid();v_role text;v_previous procurement_private.requests;v_record public.retention_records;v_release public.retention_release_requests;v_payment public.retention_history;
 v_id uuid;v_result uuid;v_job uuid;v_amount bigint;v_total bigint;v_cap bigint;v_pc bigint;v_share integer;v_percentage numeric;v_currency text;v_before jsonb;
 v_reason text:=NULLIF(btrim(p_data->>'reason'),'');v_reference text;v_counterparty text;v_stage text;v_date date;v_pc_due date;v_defects_due date;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request';END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager') THEN RAISE EXCEPTION 'Retention permission required' USING ERRCODE='42501';END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';END IF;
 IF p_action IS NULL OR p_action NOT IN ('create','configure','milestone','request','approve','cancel','settle','reverse','void') THEN RAISE EXCEPTION 'Unknown retention action';END IF;
 IF p_action IN ('create','configure','approve','settle','reverse','void') AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Finance, owner or admin permission required' USING ERRCODE='42501';END IF;
 IF v_reason IS NULL OR length(v_reason)>2000 THEN RAISE EXCEPTION 'Enter a reason or documentary reference (up to 2000 characters)';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_previous FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
  IF v_previous.actor_id<>v_actor OR v_previous.action<>'retention_'||p_action OR v_previous.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data';END IF;
  RETURN v_previous.result_id;
 END IF;
 IF p_action<>'create' THEN
  SELECT * INTO v_record FROM public.retention_records WHERE id=(p_data->>'retention_id')::uuid AND organisation_id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retention not found in this company';END IF;
  IF (p_data->>'revision')::integer IS DISTINCT FROM v_record.revision THEN RAISE EXCEPTION 'Record changed. Refresh before saving';END IF;
  IF v_record.voided_at IS NOT NULL OR v_record.status='written_off' THEN RAISE EXCEPTION 'This retention record is closed';END IF;
  v_id:=v_record.id;v_before:=to_jsonb(v_record);
 END IF;
 IF p_action IN ('create','configure') THEN
  IF p_action='configure' AND EXISTS(SELECT 1 FROM public.retention_release_requests WHERE retention_id=v_id AND status<>'cancelled') THEN RAISE EXCEPTION 'Terms cannot change while release requests exist';END IF;
  v_reference:=NULLIF(btrim(p_data->>'reference'),'');v_counterparty:=NULLIF(btrim(p_data->>'counterparty'),'');
  v_share:=(p_data->>'pc_share_bps')::integer;v_percentage:=(p_data->>'percentage')::numeric;v_amount:=(p_data->>'withheld_pence')::bigint;
  v_pc_due:=NULLIF(p_data->>'pc_due_date','')::date;v_defects_due:=NULLIF(p_data->>'defects_due_date','')::date;
  IF v_reference IS NULL OR length(v_reference)>80 OR v_counterparty IS NULL OR length(v_counterparty)>200 OR v_share IS NULL OR v_share NOT BETWEEN 0 AND 10000 OR v_percentage IS NULL OR v_percentage NOT BETWEEN 0 AND 100 OR v_percentage<>round(v_percentage,2) OR v_amount IS NULL OR v_amount NOT BETWEEN 1 AND 2147483647 THEN RAISE EXCEPTION 'Enter valid contractual terms and actual withheld amount';END IF;
  IF v_pc_due IS NOT NULL AND v_defects_due IS NOT NULL AND v_defects_due<v_pc_due THEN RAISE EXCEPTION 'Defects release date cannot precede completion release date';END IF;
  IF p_action='create' THEN
   v_job:=(p_data->>'job_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active company job';END IF;
   IF COALESCE(p_data->>'retention_type','') NOT IN ('client_held','subcontractor_held') THEN RAISE EXCEPTION 'Choose retention direction';END IF;
   SELECT upper(default_currency) INTO v_currency FROM public.organisations WHERE id=p_org;
   IF v_currency IS NULL OR v_currency NOT IN ('GBP','EUR','USD','AUD','CAD','NZD') THEN RAISE EXCEPTION 'Set a supported company currency first';END IF;
   INSERT INTO public.retention_records(organisation_id,job_id,retention_type,percentage,amount_pence,withheld_pence,currency) VALUES(p_org,v_job,p_data->>'retention_type',v_percentage,v_amount,v_amount,v_currency) RETURNING id INTO v_id;
  ELSIF v_record.released_pence<>0 OR v_record.withheld_pence<>v_amount THEN
   RAISE EXCEPTION 'The original withheld amount is immutable; void an incorrect unused entry and replace it';
  END IF;
  -- Legacy rows require explicit currency confirmation, never an inferred historical currency.
  IF p_action='configure' AND v_record.currency IS NULL THEN
   v_currency:=upper(p_data->>'currency');
   IF v_currency IS NULL OR v_currency NOT IN ('GBP','EUR','USD','AUD','CAD','NZD') THEN RAISE EXCEPTION 'Confirm the original currency';END IF;
   UPDATE public.retention_records SET currency=v_currency WHERE id=v_id;
  END IF;
  UPDATE public.retention_records SET reference=v_reference,counterparty=v_counterparty,percentage=v_percentage,pc_share_bps=v_share,pc_due_date=v_pc_due,defects_due_date=v_defects_due WHERE id=v_id;
 ELSIF p_action='void' THEN
  IF v_record.released_pence<>0 OR EXISTS(SELECT 1 FROM public.retention_release_requests WHERE retention_id=v_id AND status<>'cancelled') THEN RAISE EXCEPTION 'Cancel all unused requests before voiding; settled records cannot be voided';END IF;
  UPDATE public.retention_records SET voided_at=clock_timestamp() WHERE id=v_id;
 ELSE
  IF v_record.currency IS NULL OR v_record.pc_share_bps IS NULL OR v_record.reference IS NULL THEN RAISE EXCEPTION 'Configure original contract terms first';END IF;
  IF p_action='milestone' THEN
   v_stage:=p_data->>'stage';v_date:=NULLIF(p_data->>'effective_date','')::date;
   IF v_date IS NULL OR v_date>current_date OR v_stage IS NULL OR v_stage NOT IN ('pc','defects') THEN RAISE EXCEPTION 'Choose an achieved milestone and date no later than today';END IF;
   IF v_stage='pc' THEN
    IF v_record.pc_completed_date IS NOT NULL THEN RAISE EXCEPTION 'Completion milestone already recorded';END IF;
    UPDATE public.retention_records SET pc_completed_date=v_date WHERE id=v_id;
   ELSE
    IF v_record.pc_completed_date IS NULL OR v_date<v_record.pc_completed_date OR v_record.defects_completed_date IS NOT NULL THEN RAISE EXCEPTION 'Record completion first; defects date must follow completion and be recorded once';END IF;
    UPDATE public.retention_records SET defects_completed_date=v_date WHERE id=v_id;
   END IF;
  ELSIF p_action='request' THEN
   v_stage:=p_data->>'stage';v_amount:=(p_data->>'amount_pence')::bigint;
   IF v_stage IS NULL OR v_stage NOT IN ('pc','defects') OR v_amount IS NULL OR v_amount NOT BETWEEN 1 AND 2147483647 THEN RAISE EXCEPTION 'Choose a valid stage and amount';END IF;
   IF v_record.pc_completed_date IS NULL OR (v_stage='pc' AND (v_record.pc_due_date IS NULL OR v_record.pc_due_date>current_date)) OR (v_stage='defects' AND (v_record.defects_completed_date IS NULL OR v_record.defects_due_date IS NULL OR v_record.defects_due_date>current_date)) THEN RAISE EXCEPTION 'Record the achieved milestone and agreed release date before requesting release';END IF;
   v_pc:=round(v_record.withheld_pence::numeric*v_record.pc_share_bps/10000);
   v_cap:=CASE WHEN v_stage='pc' THEN v_pc ELSE v_record.withheld_pence-v_pc END;
   SELECT COALESCE(sum(amount_pence),0) INTO v_total FROM public.retention_release_requests WHERE retention_id=v_id AND stage=v_stage AND status<>'cancelled';
   IF v_total+v_amount>v_cap THEN RAISE EXCEPTION 'Release exceeds the unreserved contractual stage balance';END IF;
   INSERT INTO public.retention_release_requests(organisation_id,retention_id,stage,amount_pence,requested_by) VALUES(p_org,v_id,v_stage,v_amount,v_actor) RETURNING id INTO v_result;
  ELSE
   SELECT * INTO v_release FROM public.retention_release_requests WHERE id=(p_data->>'release_id')::uuid AND retention_id=v_id AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Release request not found';END IF;
   IF (p_data->>'release_revision')::integer IS DISTINCT FROM v_release.revision THEN RAISE EXCEPTION 'Release request changed. Refresh before saving';END IF;
   v_result:=v_release.id;
   IF p_action='approve' THEN
    IF v_release.status<>'requested' THEN RAISE EXCEPTION 'Only requested releases can be approved';END IF;
    UPDATE public.retention_release_requests SET status='approved',approved_by=v_actor,approved_at=clock_timestamp(),revision=revision+1 WHERE id=v_result;
   ELSIF p_action='cancel' THEN
    IF v_release.settled_pence<>0 OR v_release.status NOT IN ('requested','approved') THEN RAISE EXCEPTION 'Only unsettled active requests can be cancelled';END IF;
    IF v_role='project_manager' AND v_release.requested_by<>v_actor THEN RAISE EXCEPTION 'Only the requester or finance can cancel' USING ERRCODE='42501';END IF;
    UPDATE public.retention_release_requests SET status='cancelled',revision=revision+1 WHERE id=v_result;
   ELSIF p_action='settle' THEN
    v_amount:=(p_data->>'amount_pence')::bigint;v_date:=NULLIF(p_data->>'effective_date','')::date;v_reference:=NULLIF(btrim(p_data->>'payment_reference'),'');
    IF v_release.status NOT IN ('approved','partially_settled') OR v_amount IS NULL OR v_amount<=0 OR v_release.settled_pence+v_amount>v_release.amount_pence OR v_date IS NULL OR v_date>current_date OR v_date<v_release.approved_at::date OR v_reference IS NULL OR length(v_reference)>150 THEN RAISE EXCEPTION 'Enter an actual receipt/payment after approval, unique reference and amount within the approved balance';END IF;
    UPDATE public.retention_release_requests SET settled_pence=settled_pence+v_amount,status=CASE WHEN settled_pence+v_amount=amount_pence THEN 'settled' ELSE 'partially_settled' END,revision=revision+1 WHERE id=v_result;
    UPDATE public.retention_records SET released_pence=released_pence+v_amount WHERE id=v_id;
   ELSIF p_action='reverse' THEN
    SELECT * INTO v_payment FROM public.retention_history WHERE id=(p_data->>'payment_id')::uuid AND retention_id=v_id AND release_id=v_result AND organisation_id=p_org AND action='settle';
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.retention_history WHERE reverses_id=v_payment.id) THEN RAISE EXCEPTION 'Choose an unreversed settlement';END IF;
    v_amount:=-v_payment.amount_pence;v_date:=current_date;
    UPDATE public.retention_release_requests SET settled_pence=settled_pence+v_amount,status=CASE WHEN settled_pence+v_amount=0 THEN 'approved' ELSE 'partially_settled' END,revision=revision+1 WHERE id=v_result;
    UPDATE public.retention_records SET released_pence=released_pence+v_amount WHERE id=v_id;
   END IF;
  END IF;
 END IF;
 UPDATE public.retention_records SET revision=revision+1,updated_at=clock_timestamp(),status=CASE WHEN released_pence=withheld_pence THEN 'fully_released' WHEN released_pence>0 THEN 'partially_released' ELSE 'active' END WHERE id=v_id RETURNING * INTO v_record;
 INSERT INTO public.retention_history(organisation_id,retention_id,release_id,actor_id,action,reason,amount_pence,payment_reference,effective_date,reverses_id,before_record,after_record) VALUES(p_org,v_id,CASE WHEN p_action IN ('request','approve','cancel','settle','reverse') THEN v_result END,v_actor,p_action,v_reason,CASE WHEN p_action IN ('request','settle','reverse') THEN v_amount END,CASE WHEN p_action='settle' THEN v_reference END,v_date,CASE WHEN p_action='reverse' THEN v_payment.id END,v_before,to_jsonb(v_record)||jsonb_build_object('release',CASE WHEN v_result IS NOT NULL THEN (SELECT to_jsonb(r) FROM public.retention_release_requests r WHERE id=v_result) END));
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,note,source) VALUES(p_org,v_actor,'retention_'||p_action,'retention',v_id,jsonb_build_object('before',v_before,'after',to_jsonb(v_record)),v_reason,'retention_register');
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,'retention_'||p_action,p_data,COALESCE(v_result,v_id));
 RETURN COALESCE(v_result,v_id);
END $$;
REVOKE ALL ON FUNCTION procurement_private.retention_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.retention_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.retention_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.retention_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.retention_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.retention_write(uuid,uuid,text,jsonb) TO authenticated;
