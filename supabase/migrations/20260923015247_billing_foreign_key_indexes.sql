CREATE INDEX IF NOT EXISTS idx_billing_checkout_attempts_plan
  ON public.billing_checkout_attempts(plan_id);

CREATE INDEX IF NOT EXISTS idx_billing_status_history_subscription
  ON public.billing_status_history(subscription_id);

CREATE INDEX IF NOT EXISTS idx_billing_trial_history_plan
  ON public.billing_trial_history(plan_id);

CREATE INDEX IF NOT EXISTS idx_billing_trial_history_conversion_plan
  ON public.billing_trial_history(conversion_plan_id);
