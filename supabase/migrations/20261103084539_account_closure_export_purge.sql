-- BuildNerve account closure is deliberately staged. This migration records a
-- deletion deadline from the verified Stripe access-end state; it does not
-- delete workspace rows or Storage objects. Those operations must not run until
-- the customer export and complete retention/exclusion inventory are in place.

CREATE TABLE public.organisation_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL UNIQUE
    REFERENCES public.organisations(id) ON DELETE RESTRICT,
  stripe_subscription_id text NOT NULL UNIQUE,
  source text NOT NULL
    CHECK (source IN ('stripe_cancel_at_period_end', 'stripe_subscription_ended')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'purging', 'blocked', 'completed')),
  access_ends_at timestamptz NOT NULL,
  purge_after timestamptz NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  cancelled_at timestamptz,
  purge_started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failure_code text,
  legal_hold boolean NOT NULL DEFAULT false,
  legal_hold_reason text,
  legal_hold_set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  legal_hold_set_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT organisation_deletion_legal_hold_details CHECK (
    (legal_hold AND legal_hold_reason IS NOT NULL AND legal_hold_set_at IS NOT NULL)
    OR (NOT legal_hold AND legal_hold_reason IS NULL AND legal_hold_set_at IS NULL)
  ),
  CONSTRAINT organisation_deletion_terminal_dates CHECK (
    (status <> 'completed' OR completed_at IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
  )
);

CREATE INDEX organisation_deletion_due_idx
  ON public.organisation_deletion_requests (purge_after)
  WHERE status = 'scheduled' AND legal_hold = false;

ALTER TABLE public.organisation_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisation_deletion_owner_read
  ON public.organisation_deletion_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.organisation_members m
    WHERE m.organisation_id = organisation_deletion_requests.organisation_id
      AND m.user_id = (SELECT auth.uid())
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin')
  ));

REVOKE ALL ON public.organisation_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organisation_deletion_requests TO authenticated;
GRANT ALL ON public.organisation_deletion_requests TO service_role;

-- Stripe's webhook updates the subscription snapshot. This trigger records or
-- withdraws the pending deletion schedule in the same transaction, so event
-- retries and subscription reversals cannot leave a stale deadline behind.
CREATE OR REPLACE FUNCTION procurement_private.sync_organisation_deletion_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_access_ends_at timestamptz;
  v_source text;
BEGIN
  IF NEW.stripe_subscription_id IS NULL THEN
    v_access_ends_at := NULL;
  ELSIF NEW.status = 'canceled' THEN
    v_access_ends_at := COALESCE(NEW.ended_at, NEW.current_period_end);
    v_source := 'stripe_subscription_ended';
  ELSIF NEW.cancel_at_period_end AND NEW.status IN ('active', 'trialing') THEN
    v_access_ends_at := NEW.current_period_end;
    v_source := 'stripe_cancel_at_period_end';
  END IF;

  IF v_access_ends_at IS NULL THEN
    UPDATE public.organisation_deletion_requests
    SET status = 'cancelled',
        cancelled_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE organisation_id = NEW.organisation_id
      AND status = 'scheduled';
    RETURN NEW;
  END IF;

  INSERT INTO public.organisation_deletion_requests (
    organisation_id,
    stripe_subscription_id,
    source,
    status,
    access_ends_at,
    purge_after,
    cancelled_at,
    requested_at,
    updated_at
  ) VALUES (
    NEW.organisation_id,
    NEW.stripe_subscription_id,
    v_source,
    'scheduled',
    v_access_ends_at,
    v_access_ends_at + interval '7 days',
    NULL,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (organisation_id) DO UPDATE
  SET stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      source = EXCLUDED.source,
      status = 'scheduled',
      access_ends_at = EXCLUDED.access_ends_at,
      purge_after = EXCLUDED.purge_after,
      cancelled_at = NULL,
      requested_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE public.organisation_deletion_requests.status IN ('scheduled', 'cancelled');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION procurement_private.sync_organisation_deletion_request()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_sync_organisation_deletion_request
  AFTER INSERT OR UPDATE OF status, cancel_at_period_end, current_period_end, ended_at
  ON public.organisation_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION procurement_private.sync_organisation_deletion_request();
