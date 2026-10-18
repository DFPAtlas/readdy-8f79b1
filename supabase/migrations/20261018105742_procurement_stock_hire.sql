ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TABLE public.stock_movements ADD COLUMN reserved_delta numeric(12,4) NOT NULL DEFAULT 0;
ALTER TABLE public.material_allocations ADD COLUMN location_id uuid REFERENCES public.inventory_locations(id);
CREATE UNIQUE INDEX stock_job_allocation ON public.material_allocations(organisation_id,location_id,material_item_id,job_id) WHERE location_id IS NOT NULL;
CREATE INDEX stock_movement_source ON public.stock_movements(reference_type,reference_id);
ALTER TABLE public.plant_hire_records ADD COLUMN revision integer NOT NULL DEFAULT 1, ADD COLUMN currency text NOT NULL DEFAULT 'GBP',
 ADD COLUMN supplier_confirmation_reference text, ADD COLUMN actual_start_date date, ADD COLUMN collected_date date, ADD COLUMN cancellation_reason text,
 ADD COLUMN dispute_from_status text, ADD COLUMN dispute_reason text, ADD COLUMN resolution_reason text, ADD COLUMN last_extension_reference text;
UPDATE public.plant_hire_records h SET currency=COALESCE(NULLIF(upper(o.default_currency),''),'GBP') FROM public.organisations o WHERE o.id=h.organisation_id;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.inventory_locations,public.inventory_balances,public.stock_movements,public.material_allocations,public.material_catalogue_items,public.plant_hire_records FROM PUBLIC,anon,authenticated;

CREATE FUNCTION procurement_private.stock_hire_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=auth.uid();v_role text;v_existing procurement_private.requests;v_id uuid;v_job uuid;v_location uuid;v_destination uuid;v_material uuid;v_supplier uuid;
 v_balance public.inventory_balances;v_allocation public.material_allocations;v_hire public.plant_hire_records;v_found boolean;v_qty numeric;v_delta numeric:=0;v_reserved numeric:=0;
 v_available numeric;v_posted numeric;v_returned numeric;v_return_posted numeric;v_line record;v_source uuid;v_order uuid;v_reason text;v_date date;v_start date;v_end date;v_rate bigint;v_deposit bigint;
 v_type public.stock_movement_type;v_ref_type text;v_ref_id uuid;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid request';END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','finance','project_manager','site_supervisor') THEN RAISE EXCEPTION 'Stock or hire permission required' USING ERRCODE='42501';END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';END IF;
 IF p_action IS NULL OR p_action NOT IN ('create_material','create_location','set_count','receipt_stock','supplier_return_stock','reserve_stock','release_stock','issue_stock','return_job_stock','transfer_stock','create_hire','update_hire','confirm_hire','start_hire','extend_hire','off_hire','close_hire','cancel_hire','dispute_hire','resolve_hire') THEN RAISE EXCEPTION 'Unknown stock or hire action';END IF;
 IF p_action IN ('create_material','create_location','set_count','create_hire','update_hire','confirm_hire','extend_hire','cancel_hire') AND v_role='site_supervisor' THEN RAISE EXCEPTION 'A procurement manager must perform this action' USING ERRCODE='42501';END IF;
 IF p_action IN ('close_hire','resolve_hire') AND v_role NOT IN ('owner','admin','finance') THEN RAISE EXCEPTION 'Owner, admin or finance permission required' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
   IF v_existing.actor_id<>v_actor OR v_existing.action<>p_action OR v_existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data';END IF;
   RETURN v_existing.result_id;
 END IF;
 -- Short, organisation-local transactions serialize multi-location and job reservation changes.
 PERFORM pg_advisory_xact_lock(hashtextextended('stock-hire:'||p_org::text,0));
 v_job:=NULLIF(p_data->>'job_id','')::uuid;
 IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active job in this company';END IF;
 v_reason:=NULLIF(btrim(p_data->>'reason'),'');
 IF p_action='create_material' THEN
   IF length(btrim(COALESCE(p_data->>'description',''))) NOT BETWEEN 1 AND 500 OR length(btrim(COALESCE(p_data->>'unit',''))) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Enter a material description and unit';END IF;
   INSERT INTO public.material_catalogue_items(organisation_id,description,unit_of_measure,internal_code,is_active) VALUES(p_org,btrim(p_data->>'description'),btrim(p_data->>'unit'),NULLIF(btrim(p_data->>'code'),''),true) RETURNING id INTO v_id;
 ELSIF p_action='create_location' THEN
   IF length(btrim(COALESCE(p_data->>'name',''))) NOT BETWEEN 1 AND 200 OR COALESCE(p_data->>'type','') NOT IN ('main_store','job_site','vehicle','other') THEN RAISE EXCEPTION 'Enter a location name and type';END IF;
   IF p_data->>'type'='job_site' AND v_job IS NULL THEN RAISE EXCEPTION 'Select the location job';END IF;
   INSERT INTO public.inventory_locations(organisation_id,name,location_type,job_id,address) VALUES(p_org,btrim(p_data->>'name'),p_data->>'type',v_job,NULLIF(btrim(p_data->>'address'),'')) RETURNING id INTO v_id;
 ELSIF p_action LIKE '%hire' THEN
   IF p_action<>'create_hire' THEN
     SELECT * INTO v_hire FROM public.plant_hire_records WHERE id=(p_data->>'hire_id')::uuid AND organisation_id=p_org FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'Hire record not found in this company';END IF;
     IF (p_data->>'revision')::integer IS DISTINCT FROM v_hire.revision THEN RAISE EXCEPTION 'Hire record changed. Reload before making changes';END IF;
     v_id:=v_hire.id;
   END IF;
   IF p_action IN ('create_hire','update_hire') THEN
     IF p_action='update_hire' AND v_hire.status<>'requested' THEN RAISE EXCEPTION 'Only a requested hire can be edited';END IF;
     v_supplier:=(p_data->>'supplier_id')::uuid;
     IF NOT EXISTS(SELECT 1 FROM public.suppliers WHERE id=v_supplier AND organisation_id=p_org AND status='active' AND archived_at IS NULL) THEN RAISE EXCEPTION 'Select an active company supplier';END IF;
     v_start:=NULLIF(p_data->>'start_date','')::date;v_end:=NULLIF(p_data->>'end_date','')::date;v_rate:=(p_data->>'rate_pence')::bigint;v_deposit:=COALESCE((p_data->>'deposit_pence')::bigint,0);
     IF v_start IS NULL OR v_end<v_start OR COALESCE((p_data->>'quantity')::integer,0) NOT BETWEEN 1 AND 1000 OR v_rate IS NULL OR v_rate<0 OR v_rate>100000000 OR v_deposit<0 OR v_deposit>100000000 OR length(btrim(COALESCE(p_data->>'description',''))) NOT BETWEEN 1 AND 500 OR length(btrim(COALESCE(p_data->>'reference',''))) NOT BETWEEN 1 AND 100 OR COALESCE(p_data->>'charging_unit','') NOT IN ('per_day','per_week','per_month') THEN RAISE EXCEPTION 'Enter valid hire dates, quantity, reference and rates';END IF;
     IF p_action='create_hire' THEN
       INSERT INTO public.plant_hire_records(organisation_id,supplier_id,equipment_description,hire_reference,hire_start_date,created_by,currency) VALUES(p_org,v_supplier,btrim(p_data->>'description'),btrim(p_data->>'reference'),v_start,v_actor,(SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') FROM public.organisations WHERE id=p_org)) RETURNING id INTO v_id;
     END IF;
     UPDATE public.plant_hire_records SET supplier_id=v_supplier,job_id=v_job,equipment_description=btrim(p_data->>'description'),hire_reference=btrim(p_data->>'reference'),quantity=(p_data->>'quantity')::integer,hire_start_date=v_start,hire_end_date=v_end,rate_pence=v_rate,deposit_pence=v_deposit,charging_unit=p_data->>'charging_unit',delivery_address=NULLIF(btrim(p_data->>'address'),''),operator_required=COALESCE((p_data->>'operator_required')::boolean,false),revision=CASE WHEN p_action='create_hire' THEN 1 ELSE revision+1 END,updated_at=now() WHERE id=v_id;
   ELSE
     v_date:=NULLIF(p_data->>'date','')::date;
     IF p_action IN ('confirm_hire','off_hire','extend_hire') AND length(btrim(COALESCE(p_data->>'confirmation',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Enter the supplier confirmation reference';END IF;
     IF p_action IN ('start_hire','off_hire','close_hire') AND (v_date IS NULL OR v_date>CURRENT_DATE) THEN RAISE EXCEPTION 'Enter the actual date, no later than today';END IF;
     IF p_action='confirm_hire' THEN
       IF v_hire.status<>'requested' THEN RAISE EXCEPTION 'Only requested hires can be confirmed';END IF;
       UPDATE public.plant_hire_records SET status='confirmed',supplier_confirmation_reference=btrim(p_data->>'confirmation') WHERE id=v_id;
     ELSIF p_action='start_hire' THEN
       IF v_hire.status<>'confirmed' THEN RAISE EXCEPTION 'Confirm the supplier booking before starting hire';END IF;
       UPDATE public.plant_hire_records SET status='on_hire',actual_start_date=v_date WHERE id=v_id;
     ELSIF p_action='extend_hire' THEN
       IF v_hire.status NOT IN ('confirmed','on_hire') OR v_date IS NULL OR v_date<CURRENT_DATE OR v_date<v_hire.hire_start_date OR (v_hire.hire_end_date IS NOT NULL AND v_date<=v_hire.hire_end_date) THEN RAISE EXCEPTION 'Enter a later agreed end date for an active booking';END IF;
       UPDATE public.plant_hire_records SET hire_end_date=v_date,last_extension_reference=btrim(p_data->>'confirmation') WHERE id=v_id;
     ELSIF p_action='off_hire' THEN
       IF v_hire.status<>'on_hire' OR v_date<COALESCE(v_hire.actual_start_date,v_hire.hire_start_date) THEN RAISE EXCEPTION 'Only on-hire equipment can be off-hired after its actual start';END IF;
       UPDATE public.plant_hire_records SET status='off_hired',off_hire_reference=btrim(p_data->>'confirmation'),off_hire_date=v_date WHERE id=v_id;
     ELSIF p_action='close_hire' THEN
       IF v_hire.status<>'off_hired' OR v_date<v_hire.off_hire_date OR COALESCE((p_data->>'damage_pence')::bigint,0) NOT BETWEEN 0 AND 100000000 THEN RAISE EXCEPTION 'Record off-hire first and a valid collection date/damage charge';END IF;
       IF COALESCE((p_data->>'damage_pence')::integer,0)>0 AND v_reason IS NULL THEN RAISE EXCEPTION 'Explain the recorded damage charge';END IF;
       UPDATE public.plant_hire_records SET status='closed',collected_date=v_date,damage_charges_pence=COALESCE((p_data->>'damage_pence')::integer,0),damage_notes=v_reason WHERE id=v_id;
     ELSIF p_action='cancel_hire' THEN
       IF v_hire.status NOT IN ('requested','confirmed') OR v_reason IS NULL THEN RAISE EXCEPTION 'Only unstarted hires can be cancelled, with a reason';END IF;
       IF v_hire.status='confirmed' AND length(btrim(COALESCE(p_data->>'confirmation',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Enter the supplier cancellation confirmation';END IF;
       UPDATE public.plant_hire_records SET status='cancelled',cancellation_reason=v_reason WHERE id=v_id;
     ELSIF p_action='dispute_hire' THEN
       IF v_hire.status NOT IN ('confirmed','on_hire','off_hired') OR v_reason IS NULL THEN RAISE EXCEPTION 'Enter a reason for disputing an active hire';END IF;
       UPDATE public.plant_hire_records SET status='disputed',dispute_from_status=v_hire.status::text,dispute_reason=v_reason WHERE id=v_id;
     ELSE
       IF v_hire.status<>'disputed' OR v_hire.dispute_from_status NOT IN ('confirmed','on_hire','off_hired') OR v_reason IS NULL THEN RAISE EXCEPTION 'Enter a resolution for the recorded dispute';END IF;
       UPDATE public.plant_hire_records SET status=v_hire.dispute_from_status::public.hire_status,resolution_reason=v_reason WHERE id=v_id;
     END IF;
     UPDATE public.plant_hire_records SET revision=revision+1,updated_at=now() WHERE id=v_id;
   END IF;
 ELSE
   v_location:=(p_data->>'location_id')::uuid;v_material:=(p_data->>'material_id')::uuid;v_qty:=(p_data->>'quantity')::numeric;
   IF NOT EXISTS(SELECT 1 FROM public.inventory_locations WHERE id=v_location AND organisation_id=p_org AND is_active) OR NOT EXISTS(SELECT 1 FROM public.material_catalogue_items WHERE id=v_material AND organisation_id=p_org AND is_active AND archived_at IS NULL) THEN RAISE EXCEPTION 'Select active company material and location';END IF;
   IF v_qty IS NULL OR v_qty<0 OR (v_qty=0 AND p_action<>'set_count') OR v_qty>1000000 OR v_qty<>round(v_qty,4) OR v_reason IS NULL THEN RAISE EXCEPTION 'Enter a valid quantity and reason';END IF;
   SELECT * INTO v_balance FROM public.inventory_balances WHERE organisation_id=p_org AND location_id=v_location AND material_item_id=v_material FOR UPDATE;v_found:=FOUND;
   IF NOT v_found THEN INSERT INTO public.inventory_balances(organisation_id,location_id,material_item_id) VALUES(p_org,v_location,v_material) RETURNING * INTO v_balance;END IF;
   IF p_action IN ('reserve_stock','release_stock','issue_stock','return_job_stock') THEN
     IF v_job IS NULL THEN RAISE EXCEPTION 'Choose a company job';END IF;
     INSERT INTO public.material_allocations(organisation_id,location_id,material_item_id,job_id) VALUES(p_org,v_location,v_material,v_job) ON CONFLICT(organisation_id,location_id,material_item_id,job_id) WHERE location_id IS NOT NULL DO NOTHING;
     SELECT * INTO v_allocation FROM public.material_allocations WHERE organisation_id=p_org AND location_id=v_location AND material_item_id=v_material AND job_id=v_job FOR UPDATE;
   END IF;
   v_ref_type:=p_action;v_ref_id:=p_request;v_type:='adjustment';
   IF p_action='set_count' THEN
     IF v_found AND NULLIF(p_data->>'expected_updated_at','')::timestamptz IS DISTINCT FROM v_balance.updated_at THEN RAISE EXCEPTION 'Stock count changed. Reload before counting';END IF;
     IF v_qty<COALESCE(v_balance.reserved_quantity,0) THEN RAISE EXCEPTION 'A count cannot be below reserved stock';END IF;
     v_delta:=v_qty-v_balance.quantity_on_hand;
     UPDATE public.inventory_balances SET last_counted_date=now() WHERE id=v_balance.id;
   ELSIF p_action='reserve_stock' THEN
     IF v_qty>v_balance.quantity_on_hand-COALESCE(v_balance.reserved_quantity,0) THEN RAISE EXCEPTION 'Insufficient unreserved stock';END IF;
     v_reserved:=v_qty;UPDATE public.material_allocations SET quantity_allocated=COALESCE(quantity_allocated,0)+v_qty,allocated_by=v_actor,allocated_at=now() WHERE id=v_allocation.id;
   ELSIF p_action='release_stock' THEN
     IF v_qty>COALESCE(v_allocation.quantity_allocated,0) THEN RAISE EXCEPTION 'Cannot release another job reservation';END IF;
     v_reserved:=-v_qty;UPDATE public.material_allocations SET quantity_allocated=quantity_allocated-v_qty WHERE id=v_allocation.id;
   ELSIF p_action='issue_stock' THEN
     v_reserved:=-LEAST(v_qty,COALESCE(v_allocation.quantity_allocated,0));
     IF v_qty>v_balance.quantity_on_hand-COALESCE(v_balance.reserved_quantity,0)-v_reserved THEN RAISE EXCEPTION 'Insufficient stock after protecting other jobs reservations';END IF;
     v_delta:=-v_qty;v_type:='job_issue';UPDATE public.material_allocations SET quantity_allocated=quantity_allocated+v_reserved,quantity_used=COALESCE(quantity_used,0)+v_qty WHERE id=v_allocation.id;
   ELSIF p_action='return_job_stock' THEN
     IF v_qty>COALESCE(v_allocation.quantity_used,0)-COALESCE(v_allocation.quantity_returned,0) THEN RAISE EXCEPTION 'Cannot return more than issued to this job from this location';END IF;
     v_delta:=v_qty;v_type:='return_from_job';UPDATE public.material_allocations SET quantity_returned=COALESCE(quantity_returned,0)+v_qty WHERE id=v_allocation.id;
   ELSIF p_action='transfer_stock' THEN
     v_destination:=(p_data->>'destination_id')::uuid;
     IF v_destination=v_location OR NOT EXISTS(SELECT 1 FROM public.inventory_locations WHERE id=v_destination AND organisation_id=p_org AND is_active) THEN RAISE EXCEPTION 'Choose a different active company destination';END IF;
     IF v_qty>v_balance.quantity_on_hand-COALESCE(v_balance.reserved_quantity,0) THEN RAISE EXCEPTION 'Insufficient unreserved stock to transfer';END IF;
     IF EXISTS(SELECT 1 FROM public.inventory_balances WHERE location_id=v_destination AND material_item_id=v_material AND (organisation_id<>p_org OR quantity_on_hand+v_qty>10000000)) THEN RAISE EXCEPTION 'Invalid destination balance';END IF;
     INSERT INTO public.inventory_balances(organisation_id,location_id,material_item_id,quantity_on_hand) VALUES(p_org,v_destination,v_material,v_qty) ON CONFLICT(location_id,material_item_id) DO UPDATE SET quantity_on_hand=public.inventory_balances.quantity_on_hand+v_qty,updated_at=clock_timestamp();
     INSERT INTO public.stock_movements(organisation_id,location_id,material_item_id,movement_type,quantity,reference_type,reference_id,performed_by,reason) VALUES(p_org,v_destination,v_material,'transfer',v_qty,'transfer',p_request,v_actor,v_reason);
     v_delta:=-v_qty;v_type:='transfer';v_ref_type:='transfer';
   ELSE
     IF p_action='receipt_stock' THEN
       SELECT rl.*,pl.material_item_id,gr.purchase_order_id INTO v_line FROM public.goods_receipt_lines rl JOIN public.goods_receipts gr ON gr.id=rl.goods_receipt_id JOIN public.purchase_order_lines pl ON pl.id=rl.purchase_order_line_id WHERE rl.id=(p_data->>'source_id')::uuid AND gr.organisation_id=p_org AND pl.purchase_order_id=gr.purchase_order_id;
       IF NOT FOUND OR (v_line.material_item_id IS NOT NULL AND v_line.material_item_id<>v_material) THEN RAISE EXCEPTION 'Choose a matching company receipt line';END IF;
       v_source:=v_line.id;v_order:=v_line.purchase_order_id;
     ELSE
       SELECT rl.*,sr.status,grl.id AS source_receipt,grl.purchase_order_line_id,sr.purchase_order_id INTO v_line FROM public.supplier_return_lines rl JOIN public.supplier_returns sr ON sr.id=rl.supplier_return_id JOIN public.goods_receipt_lines grl ON grl.id=rl.goods_receipt_line_id WHERE rl.id=(p_data->>'source_id')::uuid AND sr.organisation_id=p_org;
       IF NOT FOUND OR v_line.status NOT IN ('returned','credited') OR v_line.return_condition IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'Choose a completed accepted-goods return';END IF;
       v_source:=v_line.source_receipt;v_order:=v_line.purchase_order_id;
     END IF;
     PERFORM 1 FROM public.purchase_orders WHERE id=v_order AND organisation_id=p_org FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'Source order does not belong to this company';END IF;
     IF EXISTS(SELECT 1 FROM public.stock_movements WHERE organisation_id=p_org AND reference_type='goods_receipt_line' AND reference_id=v_source AND material_item_id<>v_material) THEN RAISE EXCEPTION 'This receipt is mapped to another catalogue material';END IF;
     SELECT COALESCE(sum(quantity),0) INTO v_posted FROM public.stock_movements WHERE organisation_id=p_org AND reference_type='goods_receipt_line' AND reference_id=v_source;
     SELECT COALESCE(-sum(m.quantity),0) INTO v_return_posted FROM public.stock_movements m JOIN public.supplier_return_lines l ON l.id=m.reference_id WHERE m.organisation_id=p_org AND m.reference_type='supplier_return_line' AND l.goods_receipt_line_id=v_source;
     IF p_action='receipt_stock' THEN
       SELECT COALESCE(sum(l.quantity),0) INTO v_returned FROM public.supplier_return_lines l JOIN public.supplier_returns r ON r.id=l.supplier_return_id WHERE r.organisation_id=p_org AND l.goods_receipt_line_id=v_source AND l.return_condition='accepted' AND r.status IN ('returned','credited');
       v_available:=v_line.accepted_quantity-v_returned+v_return_posted-v_posted;
       IF v_qty>v_available THEN RAISE EXCEPTION 'Receipt quantity is already posted, returned or was not accepted';END IF;
       v_delta:=v_qty;v_type:='receipt';v_ref_type:='goods_receipt_line';v_ref_id:=v_source;
     ELSE
       SELECT COALESCE(-sum(quantity),0) INTO v_returned FROM public.stock_movements WHERE organisation_id=p_org AND reference_type='supplier_return_line' AND reference_id=v_line.id;
       IF v_qty>v_line.quantity-v_returned OR v_qty>v_posted-v_return_posted OR v_qty>v_balance.quantity_on_hand-COALESCE(v_balance.reserved_quantity,0) THEN RAISE EXCEPTION 'Return exceeds unreserved stock or unposted return quantity';END IF;
       v_delta:=-v_qty;v_type:='supplier_return';v_ref_type:='supplier_return_line';v_ref_id:=v_line.id;
     END IF;
   END IF;
   IF v_balance.quantity_on_hand+v_delta<0 OR v_balance.quantity_on_hand+v_delta>10000000 OR COALESCE(v_balance.reserved_quantity,0)+v_reserved<0 THEN RAISE EXCEPTION 'Invalid resulting stock balance';END IF;
   UPDATE public.inventory_balances SET quantity_on_hand=quantity_on_hand+v_delta,reserved_quantity=COALESCE(reserved_quantity,0)+v_reserved,updated_at=clock_timestamp() WHERE id=v_balance.id;
   INSERT INTO public.stock_movements(organisation_id,location_id,material_item_id,movement_type,quantity,reserved_delta,reference_type,reference_id,job_id,performed_by,reason)
     VALUES(p_org,v_location,v_material,v_type,v_delta,v_reserved,v_ref_type,v_ref_id,v_job,v_actor,v_reason) RETURNING id INTO v_id;
 END IF;
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,p_action,p_data,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.stock_hire_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.stock_hire_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.procurement_stock_hire_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.stock_hire_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.procurement_stock_hire_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.procurement_stock_hire_write(uuid,uuid,text,jsonb) TO authenticated;
