ALTER TABLE public.billing_plan_prices
  ADD COLUMN IF NOT EXISTS unit_amount integer;

ALTER TABLE public.billing_plan_prices
  DROP CONSTRAINT IF EXISTS billing_plan_prices_unit_amount_check;

ALTER TABLE public.billing_plan_prices
  ADD CONSTRAINT billing_plan_prices_unit_amount_check
  CHECK (unit_amount IS NULL OR unit_amount >= 0);

UPDATE public.billing_plan_prices
SET unit_amount = CASE stripe_price_id
  WHEN 'price_1UIezlB5YpBF14q76PEeQIBi' THEN 3600
  WHEN 'price_1UIezmB5YpBF14q7gLzp7NUN' THEN 34800
  WHEN 'price_1UIeznB5YpBF14q7v3N7f15U' THEN 11100
  WHEN 'price_1UIeznB5YpBF14q7wDQpuG39' THEN 106800
  ELSE unit_amount
END,
updated_at = now()
WHERE stripe_price_id IN (
  'price_1UIezlB5YpBF14q76PEeQIBi',
  'price_1UIezmB5YpBF14q7gLzp7NUN',
  'price_1UIeznB5YpBF14q7v3N7f15U',
  'price_1UIeznB5YpBF14q7wDQpuG39'
);
