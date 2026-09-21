-- ============================================================================
-- SoloOS Phase 11 Hardening: Corrective Migration
-- Migration: 20260921160000_harden_distribution_engine.sql
-- ============================================================================
-- Hardening goals:
--   1. Remove 'anon' direct insert path from distribution_events.
--   2. Enforce strict parameter validation in increment_artifact_view.
--   3. Add update policy and indexes for referral_attributions lifecycle.
-- ============================================================================

-- 1. Remove anon direct insert policy on distribution_events
DROP POLICY IF EXISTS "distribution_events_insert" ON public.distribution_events;
CREATE POLICY "distribution_events_insert" ON public.distribution_events
  FOR INSERT WITH CHECK (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR public.is_platform_admin(auth.uid())
  );

-- 2. Add RLS update policy for referral_attributions
DROP POLICY IF EXISTS "referral_attributions_update" ON public.referral_attributions;
CREATE POLICY "referral_attributions_update" ON public.referral_attributions
  FOR UPDATE USING (
    public.is_workspace_member(referrer_workspace_id)
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR public.is_platform_admin(auth.uid())
  ) WITH CHECK (
    public.is_workspace_member(referrer_workspace_id)
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR public.is_platform_admin(auth.uid())
  );

-- 3. Hardened atomic RPC: increment_artifact_view
CREATE OR REPLACE FUNCTION public.increment_artifact_view(p_share_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_share_token IS NULL OR length(p_share_token) < 32 OR length(p_share_token) > 128 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.shareable_artifacts
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE share_token = p_share_token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_artifact_view(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_artifact_view(TEXT) TO authenticated, anon, service_role;

-- 4. Additional attribution indexes
CREATE INDEX IF NOT EXISTS idx_referral_attributions_session_code
  ON public.referral_attributions(anonymous_session_id, referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referred_user
  ON public.referral_attributions(referred_user_id);
