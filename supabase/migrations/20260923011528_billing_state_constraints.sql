-- organisation_subscriptions is the current state snapshot; lifecycle history
-- belongs in billing_status_history. Enforce one current row per organisation.
create unique index if not exists ux_organisation_subscriptions_organisation
  on public.organisation_subscriptions (organisation_id);

-- Replace the deprecated auth.role() predicate with an explicit target role.
drop policy if exists "Authenticated users can read plan prices"
  on public.billing_plan_prices;

create policy "Authenticated users can read plan prices"
  on public.billing_plan_prices
  for select
  to authenticated
  using (true);
