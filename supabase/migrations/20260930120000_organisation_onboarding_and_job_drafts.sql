-- BuildNerve: organisation onboarding + persisted job drafts
-- Additive migration. Creates no destructive change and preserves existing records.
--
-- Problem 1: a brand-new user could insert an organisation (permissive INSERT policy
--            WITH CHECK (true)) but could NOT insert their own owner membership, because
--            the membership INSERT policy requires the caller to already be an owner/admin
--            of that organisation. Onboarding therefore failed silently.
-- Problem 2: job drafts were only stored in localStorage, so "Save and exit" never
--            persisted anything and drafts could not be resumed across devices/refresh.
--
-- This migration:
--   1. Adds a SECURITY DEFINER RPC that atomically creates an organisation and its
--      owner membership for the authenticated caller.
--   2. Adds a `job_drafts` table with organisation-scoped RLS.

-- ─────────────────────────────────────────────────────────────
-- 1. Secure organisation + owner membership creation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_organisation_with_owner(
  p_name TEXT,
  p_trading_name TEXT DEFAULT NULL
)
RETURNS public.organisations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org public.organisations;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Organisation name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organisations (name, trading_name, created_by)
  VALUES (btrim(p_name), NULLIF(btrim(COALESCE(p_trading_name, '')), ''), v_user)
  RETURNING * INTO v_org;

  INSERT INTO public.organisation_members (organisation_id, user_id, role, status, joined_at)
  VALUES (v_org.id, v_user, 'owner', 'active', now());

  RETURN v_org;
END;
$$;

-- Only authenticated users may call it; the function still derives identity from auth.uid().
REVOKE ALL ON FUNCTION public.create_organisation_with_owner(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organisation_with_owner(TEXT, TEXT) TO authenticated;

-- Restrictive guard: any direct client INSERT into organisations must attribute the
-- creator to the authenticated user. (Restrictive policies AND with permissive ones.)
CREATE POLICY "Organisation creation must attribute creator"
  ON public.organisations AS RESTRICTIVE FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. Job drafts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id),
  reference TEXT,
  project_name TEXT,
  current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0 AND current_step <= 6),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  converted_job_id UUID REFERENCES public.jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_drafts_org ON public.job_drafts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_job_drafts_org_status ON public.job_drafts(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_job_drafts_created_by ON public.job_drafts(created_by);

-- Keep updated_at accurate on every update
CREATE OR REPLACE FUNCTION public.touch_job_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_job_drafts_updated_at
  BEFORE UPDATE ON public.job_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_job_drafts_updated_at();

ALTER TABLE public.job_drafts ENABLE ROW LEVEL SECURITY;

-- Read: any active member of the owning organisation
CREATE POLICY "Org members can read job drafts"
  ON public.job_drafts FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Insert: owners/admins/PMs, and only for themselves
CREATE POLICY "Org managers can insert job drafts"
  ON public.job_drafts FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager'])
  );

-- Update: owners/admins/PMs of the owning organisation
CREATE POLICY "Org managers can update job drafts"
  ON public.job_drafts FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- Delete: owners/admins/PMs of the owning organisation
CREATE POLICY "Org managers can delete job drafts"
  ON public.job_drafts FOR DELETE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));