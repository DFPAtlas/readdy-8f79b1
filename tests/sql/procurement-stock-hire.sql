-- Run with test.actor_id and test.organisation_id set to an active owner fixture.
-- All fixture, billing and role changes are rolled back.
BEGIN;
INSERT INTO public.jobs(organisation_id,reference,project_name) VALUES(current_setting('test.organisation_id')::uuid,'STOCK-ROLLBACK-A','Stock rollback A'),(current_setting('test.organisation_id')::uuid,'STOCK-ROLLBACK-B','Stock rollback B');
SET LOCAL ROLE authenticated;
DO $test$
DECLARE org uuid:=current_setting('test.organisation_id')::uuid;actor uuid:=current_setting('test.actor_id')::uuid;
 material uuid;material2 uuid;location1 uuid;location2 uuid;job1 uuid;job2 uuid;request uuid:=gen_random_uuid();movement uuid;payload jsonb;failed boolean;stamp timestamptz;supplier uuid;hire uuid;po uuid;po_line uuid;receipt uuid;receipt_line uuid;ret uuid;ret_line uuid;stock_location uuid;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO STRICT job1 FROM public.jobs WHERE organisation_id=org AND reference='STOCK-ROLLBACK-A';SELECT id INTO STRICT job2 FROM public.jobs WHERE organisation_id=org AND reference='STOCK-ROLLBACK-B';
 material:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_material','{"description":"Stock rollback material","unit":"each"}');
 material2:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_material','{"description":"Stock rollback other material","unit":"each"}');
 location1:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_location','{"name":"Stock rollback store","type":"main_store"}');
 location2:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_location',jsonb_build_object('name','Stock rollback site','type','job_site','job_id',job1));
 payload:=jsonb_build_object('material_id',material,'location_id',location1,'quantity',10,'reason','Opening count');
 movement:=public.procurement_stock_hire_write(org,request,'set_count',payload);
 IF public.procurement_stock_hire_write(org,request,'set_count',payload)<>movement OR (SELECT quantity_on_hand FROM public.inventory_balances WHERE location_id=location1 AND material_item_id=material)<>10 THEN RAISE EXCEPTION 'Count or replay incorrect';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,request,'set_count',payload||'{"quantity":11}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Altered replay accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'set_count',payload||'{"quantity":9}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stale count accepted';END IF;
 payload:=payload||jsonb_build_object('job_id',job1,'quantity',6);
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'reserve_stock',payload);
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'reserve_stock',payload||jsonb_build_object('job_id',job2,'quantity',3));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'reserve_stock',payload||'{"quantity":2}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Over-reservation accepted';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'issue_stock',payload||'{"quantity":8}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Issue took other job reservation';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'issue_stock',payload||'{"quantity":6}');
 IF NOT EXISTS(SELECT 1 FROM public.inventory_balances WHERE location_id=location1 AND material_item_id=material AND quantity_on_hand=4 AND reserved_quantity=3) THEN RAISE EXCEPTION 'Issue balance/reservation wrong';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'release_stock',payload||'{"quantity":1}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Released another job reservation';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'return_job_stock',payload||'{"quantity":2}');
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'return_job_stock',payload||'{"quantity":5}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Over-return from job accepted';END IF;
 request:=gen_random_uuid();PERFORM public.procurement_stock_hire_write(org,request,'transfer_stock',payload||jsonb_build_object('quantity',3,'destination_id',location2));
 IF (SELECT count(*) FROM public.stock_movements WHERE organisation_id=org AND reference_type='transfer' AND reference_id=request)<>2 OR (SELECT sum(quantity) FROM public.stock_movements WHERE organisation_id=org AND reference_id=request)<>0 THEN RAISE EXCEPTION 'Transfer is not paired';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'transfer_stock',payload||jsonb_build_object('quantity',1,'destination_id',location2));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Transferred reserved stock';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'transfer_stock',payload||jsonb_build_object('quantity',1,'destination_id',gen_random_uuid()));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Foreign destination accepted';END IF;
 SELECT updated_at INTO stamp FROM public.inventory_balances WHERE location_id=location1 AND material_item_id=material;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'set_count',payload||jsonb_build_object('quantity',2,'expected_updated_at',stamp));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Count below reservations accepted';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'release_stock',payload||jsonb_build_object('job_id',job2,'quantity',3));
 SELECT updated_at INTO stamp FROM public.inventory_balances WHERE location_id=location1 AND material_item_id=material;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'set_count',payload||jsonb_build_object('quantity',0,'expected_updated_at',stamp));
 -- Source document integration: accepted receipts and completed returns cannot be posted twice.
 supplier:=public.procurement_write(org,gen_random_uuid(),'create_supplier','{"trading_name":"Stock hire rollback supplier"}');
 po:=public.procurement_write(org,gen_random_uuid(),'create_order',jsonb_build_object('supplier_id',supplier,'po_number','STOCK-ROLLBACK-'||gen_random_uuid(),'lines',jsonb_build_array(jsonb_build_object('description','Material','quantity',10,'unit_price_pence',100,'tax_rate',0.2))));
 PERFORM public.procurement_write(org,gen_random_uuid(),'approve_order',jsonb_build_object('purchase_order_id',po));SELECT id INTO po_line FROM public.purchase_order_lines WHERE purchase_order_id=po;
 receipt:=public.procurement_write(org,gen_random_uuid(),'record_delivery',jsonb_build_object('purchase_order_id',po,'arrival_date',CURRENT_DATE,'lines',jsonb_build_array(jsonb_build_object('purchase_order_line_id',po_line,'accepted_quantity',6,'damaged_quantity',2))));SELECT id INTO receipt_line FROM public.goods_receipt_lines WHERE goods_receipt_id=receipt;
 stock_location:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_location','{"name":"Stock rollback receipts","type":"main_store"}');
 payload:=jsonb_build_object('material_id',material,'location_id',stock_location,'quantity',3,'reason','Post accepted goods','source_id',receipt_line);
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'receipt_stock',payload);
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'receipt_stock',payload||jsonb_build_object('material_id',material2,'quantity',1));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Receipt material remapped';END IF;
 ret:=public.procurement_return_credit_write(org,gen_random_uuid(),'create_return',jsonb_build_object('purchase_order_id',po,'reference','STOCK-RETURN-'||gen_random_uuid(),'reason','Return material','return_method','supplier_collection','lines',jsonb_build_array(jsonb_build_object('goods_receipt_line_id',receipt_line,'condition','accepted','quantity',2))));SELECT id INTO ret_line FROM public.supplier_return_lines WHERE supplier_return_id=ret;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'supplier_return_stock',payload||jsonb_build_object('source_id',ret_line,'quantity',2));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Pending return moved stock';END IF;
 PERFORM public.procurement_return_credit_write(org,gen_random_uuid(),'complete_return',jsonb_build_object('return_id',ret,'revision',1,'date',CURRENT_DATE));
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'supplier_return_stock',payload||jsonb_build_object('source_id',ret_line,'quantity',2));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'supplier_return_stock',payload||jsonb_build_object('source_id',ret_line,'quantity',1));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Return posted twice';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'receipt_stock',payload);
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'receipt_stock',payload||'{"quantity":1}');EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Over receipt posting accepted';END IF;
 IF (SELECT quantity_on_hand FROM public.inventory_balances WHERE location_id=stock_location AND material_item_id=material)<>4 THEN RAISE EXCEPTION 'Net receipt stock wrong';END IF;
 -- Hire lifecycle: version protection, actual dates, supplier references, disputes and separate collection.
 payload:=jsonb_build_object('supplier_id',supplier,'job_id',job1,'description','Stock hire rollback excavator','reference','HIRE-ROLLBACK','quantity',1,'start_date',CURRENT_DATE,'end_date',CURRENT_DATE+1,'rate_pence',10000,'deposit_pence',5000,'charging_unit','per_day');
 hire:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_hire',payload);
 PERFORM set_config('test.stock_hire_id',hire::text,true);PERFORM set_config('test.stock_material',material::text,true);PERFORM set_config('test.stock_location',location1::text,true);
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'update_hire',payload||jsonb_build_object('hire_id',hire,'revision',0));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Stale hire update accepted';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'update_hire',payload||jsonb_build_object('hire_id',hire,'revision',1));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'confirm_hire',jsonb_build_object('hire_id',hire,'revision',2));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Missing supplier confirmation accepted';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'confirm_hire',jsonb_build_object('hire_id',hire,'revision',2,'confirmation','SUP-BOOKED'));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'cancel_hire',jsonb_build_object('hire_id',hire,'revision',3,'reason','Cancelled'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Confirmed hire cancelled without supplier agreement';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'start_hire',jsonb_build_object('hire_id',hire,'revision',3,'date',CURRENT_DATE+1));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Future actual start accepted';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'start_hire',jsonb_build_object('hire_id',hire,'revision',3,'date',CURRENT_DATE));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'cancel_hire',jsonb_build_object('hire_id',hire,'revision',4,'reason','Cancelled','confirmation','x'));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Started hire cancelled';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'extend_hire',jsonb_build_object('hire_id',hire,'revision',4,'date',CURRENT_DATE+3,'confirmation','EXT-OK'));
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'dispute_hire',jsonb_build_object('hire_id',hire,'revision',5,'reason','Rate queried'));
 IF NOT EXISTS(SELECT 1 FROM public.plant_hire_records WHERE id=hire AND status='disputed' AND dispute_from_status='on_hire') THEN RAISE EXCEPTION 'Dispute lost active hire';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'resolve_hire',jsonb_build_object('hire_id',hire,'revision',6,'reason','Supplier confirmed rate'));
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'off_hire',jsonb_build_object('hire_id',hire,'revision',7,'date',CURRENT_DATE,'confirmation','OFF-OK'));
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'close_hire',jsonb_build_object('hire_id',hire,'revision',8,'date',CURRENT_DATE,'damage_pence',100));EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Unexplained damage charge accepted';END IF;
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'close_hire',jsonb_build_object('hire_id',hire,'revision',8,'date',CURRENT_DATE,'damage_pence',100,'reason','Supplier recorded damage'));
 IF NOT EXISTS(SELECT 1 FROM public.plant_hire_records WHERE id=hire AND status='closed' AND collected_date=CURRENT_DATE AND off_hire_reference='OFF-OK' AND damage_charges_pence=100 AND revision=9) THEN RAISE EXCEPTION 'Final hire record wrong';END IF;
 hire:=public.procurement_stock_hire_write(org,gen_random_uuid(),'create_hire',payload||'{"reference":"HIRE-CANCEL-ROLLBACK"}');
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'confirm_hire',jsonb_build_object('hire_id',hire,'revision',1,'confirmation','BOOKED'));
 PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'cancel_hire',jsonb_build_object('hire_id',hire,'revision',2,'reason','Supplier agreed cancellation','confirmation','CANCEL-OK'));
 IF NOT EXISTS(SELECT 1 FROM public.plant_hire_records WHERE id=hire AND status='cancelled' AND cancellation_reason='Supplier agreed cancellation') THEN RAISE EXCEPTION 'Confirmed cancellation not saved';END IF;
 IF has_table_privilege('authenticated','public.stock_movements','INSERT') OR has_table_privilege('authenticated','public.inventory_balances','UPDATE') OR has_table_privilege('authenticated','public.plant_hire_records','UPDATE') THEN RAISE EXCEPTION 'Direct writes permitted';END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.plant_hire_records WHERE id=hire) OR EXISTS(SELECT 1 FROM public.stock_movements WHERE id=movement) THEN RAISE EXCEPTION 'Other identity reads records';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'create_hire',payload);EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Other identity writes records';END IF;
 PERFORM set_config('request.jwt.claims','{}',true);failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(org,gen_random_uuid(),'create_hire',payload);EXCEPTION WHEN OTHERS THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Null auth bypass';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='site_supervisor' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.actor_id'),'role','authenticated')::text,true);
 BEGIN PERFORM public.procurement_stock_hire_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'create_location','{"name":"Forbidden","type":"main_store"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Supervisor created location';END IF;
 failed:=false;BEGIN PERFORM public.procurement_stock_hire_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'close_hire',jsonb_build_object('hire_id',current_setting('test.stock_hire_id'),'revision',9));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Supervisor closed financial hire';END IF;
END $test$;
RESET ROLE;
UPDATE public.organisation_members SET role='owner' WHERE organisation_id=current_setting('test.organisation_id')::uuid AND user_id=current_setting('test.actor_id')::uuid;
UPDATE public.organisation_subscriptions SET access_state='read_only' WHERE organisation_id=current_setting('test.organisation_id')::uuid;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.procurement_stock_hire_write(current_setting('test.organisation_id')::uuid,gen_random_uuid(),'create_material','{"description":"Forbidden","unit":"each"}');EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Read-only stock write permitted';END IF;
END $test$;
RESET ROLE;
ROLLBACK;
