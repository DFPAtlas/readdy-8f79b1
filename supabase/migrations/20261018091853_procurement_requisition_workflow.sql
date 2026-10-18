ALTER TABLE public.purchase_requisitions ADD COLUMN revision integer NOT NULL DEFAULT 1,
 ADD COLUMN currency text NOT NULL DEFAULT 'GBP', ADD COLUMN review_steps jsonb NOT NULL DEFAULT '[]';
UPDATE public.purchase_requisitions r SET currency=COALESCE(NULLIF(upper(o.default_currency),''),'GBP') FROM public.organisations o WHERE o.id=r.organisation_id;
ALTER TABLE public.procurement_approvals ADD COLUMN action text NOT NULL DEFAULT 'legacy',
 ADD COLUMN requisition_revision integer, ADD COLUMN review_snapshot jsonb NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX purchase_requisition_reference_normalized ON public.purchase_requisitions(organisation_id,lower(btrim(reference)));
-- Rules cannot be rewritten by an ordinary member to bypass their own approval requirements.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.purchase_requisitions,public.requisition_lines,public.procurement_approvals,public.procurement_approval_rules FROM PUBLIC,anon,authenticated;

CREATE FUNCTION procurement_private.requisition_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid(); v_role text; v_existing procurement_private.requests;
 v_req public.purchase_requisitions; v_id uuid; v_job uuid; v_lines jsonb; v_item jsonb;
 v_n integer:=0; v_qty numeric; v_price bigint; v_total bigint:=0; v_line_total bigint; v_supplier uuid; v_material uuid;
 v_steps jsonb; v_rule public.procurement_approval_rules; v_step jsonb; v_next integer; v_allowed boolean:=false;
 v_reason text:=NULLIF(btrim(p_data->>'decision_reason'),''); v_decision public.approval_decision:='pending';
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request'; END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager','site_supervisor') THEN RAISE EXCEPTION 'Requisition permission required' USING ERRCODE='42501'; END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('create_requisition','update_requisition','submit_requisition','approve_requisition','reject_requisition','request_requisition_changes','cancel_requisition') THEN RAISE EXCEPTION 'Unknown requisition action'; END IF;
 IF length(COALESCE(v_reason,''))>4000 THEN RAISE EXCEPTION 'Decision reason is too long'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data'; END IF;
   RETURN v_existing.result_id;
 END IF;
 IF p_action<>'create_requisition' THEN
   SELECT * INTO v_req FROM public.purchase_requisitions WHERE id=(p_data->>'requisition_id')::uuid AND organisation_id=p_org FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Requisition not found in this company'; END IF;
   IF (p_data->>'revision')::integer IS DISTINCT FROM v_req.revision THEN RAISE EXCEPTION 'This requisition changed. Reload it before making changes'; END IF;
   v_id:=v_req.id;
 END IF;
 IF p_action IN ('create_requisition','update_requisition') THEN
   IF p_action='update_requisition' AND (v_req.status NOT IN ('draft','changes_requested') OR (v_req.requester_id<>v_actor AND v_role NOT IN ('owner','admin'))) THEN RAISE EXCEPTION 'Only the requester, owner or admin can edit a draft or returned requisition' USING ERRCODE='42501'; END IF;
   v_job:=NULLIF(p_data->>'job_id','')::uuid;
   IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose a job in this company'; END IF;
   IF length(btrim(COALESCE(p_data->>'reference',''))) NOT BETWEEN 1 AND 80 OR length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter a reference and reason'; END IF;
   IF COALESCE(p_data->>'priority','normal') NOT IN ('normal','urgent') THEN RAISE EXCEPTION 'Choose normal or urgent priority'; END IF;
   v_lines:=p_data->'lines';
   IF jsonb_typeof(v_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(v_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 material lines'; END IF;
   IF p_action='create_requisition' THEN
     INSERT INTO public.purchase_requisitions(organisation_id,requester_id,reference,reason,currency)
       VALUES(p_org,v_actor,btrim(p_data->>'reference'),btrim(p_data->>'reason'),(SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') FROM public.organisations WHERE id=p_org)) RETURNING id INTO v_id;
   ELSE
     DELETE FROM public.requisition_lines WHERE requisition_id=v_id;
   END IF;
   FOR v_item IN SELECT value FROM jsonb_array_elements(v_lines) LOOP
     v_n:=v_n+1; v_qty:=(v_item->>'quantity')::numeric; v_price:=(v_item->>'estimated_unit_price_pence')::bigint;
     v_supplier:=NULLIF(v_item->>'suggested_supplier_id','')::uuid; v_material:=NULLIF(v_item->>'material_item_id','')::uuid;
     IF v_qty IS NULL OR v_qty<=0 OR v_qty>1000000 OR v_qty<>round(v_qty,4) OR v_price IS NULL OR v_price<0 OR v_price>100000000 OR length(btrim(COALESCE(v_item->>'description',''))) NOT BETWEEN 1 AND 500 OR length(btrim(COALESCE(v_item->>'unit_of_measure',''))) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Invalid quantity, estimate, description or unit on line %',v_n; END IF;
     IF v_supplier IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers WHERE id=v_supplier AND organisation_id=p_org AND archived_at IS NULL AND status='active') THEN RAISE EXCEPTION 'Choose an active supplier in this company'; END IF;
     IF v_material IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.material_catalogue_items WHERE id=v_material AND organisation_id=p_org AND is_active) THEN RAISE EXCEPTION 'Choose an active material in this company'; END IF;
     v_line_total:=round(v_qty*v_price); v_total:=v_total+v_line_total;
     IF v_total>2147483647 THEN RAISE EXCEPTION 'Estimated total is too large'; END IF;
     INSERT INTO public.requisition_lines(requisition_id,line_number,material_item_id,description,quantity,unit_of_measure,suggested_supplier_id,estimated_unit_price_pence,estimated_line_total_pence,cost_code,notes)
       VALUES(v_id,v_n,v_material,btrim(v_item->>'description'),v_qty,btrim(v_item->>'unit_of_measure'),v_supplier,v_price,v_line_total,NULLIF(btrim(v_item->>'cost_code'),''),NULLIF(btrim(v_item->>'notes'),''));
   END LOOP;
   UPDATE public.purchase_requisitions SET reference=btrim(p_data->>'reference'),reason=btrim(p_data->>'reason'),job_id=v_job,
     required_by_date=NULLIF(p_data->>'required_by_date','')::date,delivery_location=NULLIF(btrim(p_data->>'delivery_location'),''),priority=COALESCE(p_data->>'priority','normal'),cost_code=NULLIF(btrim(p_data->>'cost_code'),''),
     task_or_phase=NULLIF(btrim(p_data->>'task_or_phase'),''),estimated_cost_pence=v_total,updated_at=now(),revision=CASE WHEN p_action='create_requisition' THEN 1 ELSE revision+1 END WHERE id=v_id;
 ELSIF p_action='submit_requisition' THEN
   IF v_req.status NOT IN ('draft','changes_requested') OR (v_req.requester_id<>v_actor AND v_role NOT IN ('owner','admin')) THEN RAISE EXCEPTION 'Only the requester, owner or admin can submit a draft or returned requisition' USING ERRCODE='42501'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.requisition_lines WHERE requisition_id=v_id) OR v_req.estimated_cost_pence IS NULL THEN RAISE EXCEPTION 'Add and save estimated material lines before submitting'; END IF;
   IF v_req.job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_req.job_id AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Edit and save a valid company job before submitting'; END IF;
   IF EXISTS(SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=v_id AND
      (l.quantity<=0 OR l.quantity>1000000 OR l.estimated_unit_price_pence IS NULL OR l.estimated_unit_price_pence<0 OR l.estimated_unit_price_pence>100000000
       OR l.estimated_line_total_pence IS DISTINCT FROM round(l.quantity*l.estimated_unit_price_pence)
       OR (l.suggested_supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.suppliers s WHERE s.id=l.suggested_supplier_id AND s.organisation_id=p_org AND s.status='active' AND s.archived_at IS NULL))
       OR (l.material_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.material_catalogue_items m WHERE m.id=l.material_item_id AND m.organisation_id=p_org AND m.is_active))))
      OR v_req.estimated_cost_pence IS DISTINCT FROM (SELECT sum(estimated_line_total_pence) FROM public.requisition_lines WHERE requisition_id=v_id)
      THEN RAISE EXCEPTION 'Edit and save valid material estimates before submitting'; END IF;
   v_steps:='[]';
   FOR v_rule IN SELECT r.* FROM public.procurement_approval_rules r WHERE r.organisation_id=p_org AND r.is_active
     AND r.min_value_pence<=v_req.estimated_cost_pence AND (r.max_value_pence IS NULL OR r.max_value_pence>=v_req.estimated_cost_pence)
     AND (r.job_id IS NULL OR r.job_id=v_req.job_id)
     AND (r.cost_code IS NULL OR r.cost_code=v_req.cost_code OR EXISTS(SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=v_id AND l.cost_code=r.cost_code))
     AND (r.supplier_id IS NULL OR EXISTS(SELECT 1 FROM public.requisition_lines l WHERE l.requisition_id=v_id AND l.suggested_supplier_id=r.supplier_id)) ORDER BY r.approval_order,r.id LOOP
     IF v_rule.approver_role NOT IN ('owner','admin','finance','project_manager','site_supervisor') THEN RAISE EXCEPTION 'An approval rule has an unsupported role. Ask an administrator to correct it'; END IF;
     v_steps:=v_steps||jsonb_build_array(jsonb_build_object('rule_id',v_rule.id,'name',v_rule.rule_name,'roles',jsonb_build_array(v_rule.approver_role),'order',v_rule.approval_order,'prevent_self',v_rule.prevent_self_approval,'decision','pending'));
   END LOOP;
   IF jsonb_array_length(v_steps)=0 THEN v_steps:=jsonb_build_array(jsonb_build_object('name','Standard approval','roles',jsonb_build_array('owner','admin','finance'),'order',1,'prevent_self',false,'decision','pending')); END IF;
   UPDATE public.purchase_requisitions SET status='submitted',submitted_at=now(),approved_at=NULL,review_steps=v_steps,revision=revision+1,updated_at=now() WHERE id=v_id;
 ELSIF p_action='cancel_requisition' THEN
   IF v_req.status NOT IN ('draft','changes_requested','submitted','under_review') OR (v_req.requester_id<>v_actor AND v_role NOT IN ('owner','admin')) THEN RAISE EXCEPTION 'Only the requester, owner or admin can cancel an open requisition' USING ERRCODE='42501'; END IF;
   UPDATE public.purchase_requisitions SET status='cancelled',revision=revision+1,updated_at=now() WHERE id=v_id;
 ELSE
   IF v_req.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'Only a submitted requisition can be reviewed'; END IF;
   IF jsonb_array_length(v_req.review_steps)=0 THEN RAISE EXCEPTION 'This older requisition must be cancelled and recreated with approval requirements'; END IF;
   SELECT min((x->>'order')::integer) INTO v_next FROM jsonb_array_elements(v_req.review_steps) x WHERE x->>'decision'='pending';
   SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(v_req.review_steps) x WHERE x->>'decision'='pending' AND (x->>'order')::integer=v_next AND (x->'roles') ? v_role AND (NOT (x->>'prevent_self')::boolean OR v_req.requester_id<>v_actor)) INTO v_allowed;
   IF NOT v_allowed THEN RAISE EXCEPTION 'The current approval step requires a different role or prevents self-approval' USING ERRCODE='42501'; END IF;
   IF p_action IN ('reject_requisition','request_requisition_changes') AND v_reason IS NULL THEN RAISE EXCEPTION 'Give a reason for rejection or requested changes'; END IF;
   IF p_action='approve_requisition' THEN
     v_steps:='[]';
     FOR v_step IN SELECT value FROM jsonb_array_elements(v_req.review_steps) LOOP
       IF v_step->>'decision'='pending' AND (v_step->>'order')::integer=v_next AND (v_step->'roles') ? v_role AND (NOT (v_step->>'prevent_self')::boolean OR v_req.requester_id<>v_actor) THEN
         v_step:=v_step||jsonb_build_object('decision','approved','actor_id',v_actor,'decided_at',now());
       END IF;
       v_steps:=v_steps||jsonb_build_array(v_step);
     END LOOP;
     v_decision:='approved';
     UPDATE public.purchase_requisitions SET review_steps=v_steps,status=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(v_steps) x WHERE x->>'decision'='pending') THEN 'under_review'::public.requisition_status ELSE 'approved'::public.requisition_status END,
       approved_at=CASE WHEN NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_steps) x WHERE x->>'decision'='pending') THEN now() ELSE NULL END,revision=revision+1,updated_at=now() WHERE id=v_id;
   ELSE
     v_decision:='rejected';
     UPDATE public.purchase_requisitions SET status=CASE WHEN p_action='reject_requisition' THEN 'rejected'::public.requisition_status ELSE 'changes_requested'::public.requisition_status END,revision=revision+1,updated_at=now() WHERE id=v_id;
   END IF;
 END IF;
 INSERT INTO public.procurement_approvals(requisition_id,approver_id,decision,decision_reason,decided_at,action,requisition_revision,review_snapshot)
 SELECT id,v_actor,v_decision,v_reason,now(),p_action,revision,review_steps FROM public.purchase_requisitions WHERE id=v_id;
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.requisition_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.requisition_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_requisition_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.requisition_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_requisition_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_requisition_write(uuid,uuid,text,jsonb) TO authenticated;
