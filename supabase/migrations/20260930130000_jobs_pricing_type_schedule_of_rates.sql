-- BuildNerve: allow 'schedule_of_rates' as a jobs.pricing_type value.
--
-- Additive migration. The job wizard offers "Schedule of rates" as a pricing type, but
-- the deployed jobs_pricing_type_check constraint only allowed
-- ('fixed', 'day_rate', 'cost_plus', 'estimate'). After normalising labels to canonical
-- enum values, that one option still had no permitted value and would fail with a
-- 23514 check_violation.
--
-- This only WIDENS the allowed set; it does not modify or delete any existing rows.

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pricing_type_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_pricing_type_check
  CHECK (pricing_type = ANY (ARRAY['fixed', 'day_rate', 'cost_plus', 'estimate', 'schedule_of_rates']));