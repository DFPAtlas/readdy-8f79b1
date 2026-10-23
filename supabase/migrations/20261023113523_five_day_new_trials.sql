-- Five-day trials for new signups; preserve existing trial deadlines.
UPDATE public.billing_plans SET trial_days = 5, updated_at = now()
WHERE trial_days IS NOT NULL AND trial_days > 0;

DO $migration$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.start_org_trial_for(uuid)'::regprocedure);
  IF position('interval ''14 days''' in definition) > 0 THEN
    definition := replace(definition, 'interval ''14 days''', 'interval ''5 days''');
    EXECUTE definition;
  ELSIF position('interval ''5 days''' in definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected trial initializer; review before changing';
  END IF;
END
$migration$;
