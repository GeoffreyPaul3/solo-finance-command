-- ============================================================================
-- SoloOS Phase 11: Distribution Engine
-- Migration: 20260921130000_phase11_distribution_engine.sql
-- ============================================================================
-- Architecture principles:
--   1. Authoritative financial truth remains untouched (Phase 1-10 ledgers).
--   2. Every shareable artifact is an immutable, redacted representation.
--   3. Visibility modes: 'workspace_only' vs 'unlisted'.
--   4. Atomic server-side view increments.
--   5. First-touch referral attribution with deterministic conversion states.
--   6. Workspace isolation and strict RLS policies.
-- ============================================================================

-- ===== 1. shareable_artifacts Table =====

CREATE TABLE IF NOT EXISTS public.shareable_artifacts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_type       TEXT          NOT NULL CHECK (artifact_type IN (
    'financial_brief',
    'cashflow_report',
    'profitability_report',
    'client_report',
    'project_report',
    'tax_report',
    'invoice'
  )),
  source_entity_type  TEXT          NOT NULL CHECK (source_entity_type IN (
    'invoice',
    'client',
    'project',
    'workspace',
    'report'
  )),
  source_entity_id    TEXT          NOT NULL,
  title               TEXT          NOT NULL CHECK (length(btrim(title)) >= 1 AND length(title) <= 200),
  description         TEXT          CHECK (description IS NULL OR length(description) <= 1000),
  share_token         TEXT          NOT NULL UNIQUE,
  visibility          TEXT          NOT NULL DEFAULT 'unlisted' CHECK (visibility IN ('workspace_only', 'unlisted')),
  status              TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  snapshot_data       JSONB         NOT NULL DEFAULT '{}'::jsonb,
  access_config       JSONB         NOT NULL DEFAULT '{}'::jsonb,
  view_count          INT           NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_viewed_at      TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shareable_artifacts_workspace_status
  ON public.shareable_artifacts(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_shareable_artifacts_token
  ON public.shareable_artifacts(share_token);

CREATE INDEX IF NOT EXISTS idx_shareable_artifacts_source
  ON public.shareable_artifacts(workspace_id, source_entity_type, source_entity_id);

ALTER TABLE public.shareable_artifacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shareable_artifacts TO authenticated;
GRANT ALL ON public.shareable_artifacts TO service_role;

DROP TRIGGER IF EXISTS shareable_artifacts_updated_at ON public.shareable_artifacts;
CREATE TRIGGER shareable_artifacts_updated_at
  BEFORE UPDATE ON public.shareable_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: shareable_artifacts
DROP POLICY IF EXISTS "shareable_artifacts_select" ON public.shareable_artifacts;
CREATE POLICY "shareable_artifacts_select" ON public.shareable_artifacts
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "shareable_artifacts_insert" ON public.shareable_artifacts;
CREATE POLICY "shareable_artifacts_insert" ON public.shareable_artifacts
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "shareable_artifacts_update" ON public.shareable_artifacts;
CREATE POLICY "shareable_artifacts_update" ON public.shareable_artifacts
  FOR UPDATE
  USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  )
  WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "shareable_artifacts_delete" ON public.shareable_artifacts;
CREATE POLICY "shareable_artifacts_delete" ON public.shareable_artifacts
  FOR DELETE
  USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance']::public.app_role[]
    )
  );

-- ===== 2. workspace_referral_profiles Table =====

CREATE TABLE IF NOT EXISTS public.workspace_referral_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  referral_code TEXT        NOT NULL UNIQUE CHECK (length(referral_code) >= 4 AND length(referral_code) <= 32),
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_referral_profiles_code
  ON public.workspace_referral_profiles(referral_code);

CREATE INDEX IF NOT EXISTS idx_workspace_referral_profiles_workspace
  ON public.workspace_referral_profiles(workspace_id);

ALTER TABLE public.workspace_referral_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.workspace_referral_profiles TO authenticated;
GRANT ALL ON public.workspace_referral_profiles TO service_role;

DROP TRIGGER IF EXISTS workspace_referral_profiles_updated_at ON public.workspace_referral_profiles;
CREATE TRIGGER workspace_referral_profiles_updated_at
  BEFORE UPDATE ON public.workspace_referral_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: workspace_referral_profiles
DROP POLICY IF EXISTS "workspace_referral_profiles_select" ON public.workspace_referral_profiles;
CREATE POLICY "workspace_referral_profiles_select" ON public.workspace_referral_profiles
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_referral_profiles_insert" ON public.workspace_referral_profiles;
CREATE POLICY "workspace_referral_profiles_insert" ON public.workspace_referral_profiles
  FOR INSERT WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin','finance','manager']::public.app_role[]
    )
  );

DROP POLICY IF EXISTS "workspace_referral_profiles_update" ON public.workspace_referral_profiles;
CREATE POLICY "workspace_referral_profiles_update" ON public.workspace_referral_profiles
  FOR UPDATE
  USING (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin']::public.app_role[]
    )
  )
  WITH CHECK (
    public.has_workspace_role(
      workspace_id,
      ARRAY['owner','admin']::public.app_role[]
    )
  );

-- ===== 3. referral_attributions Table =====

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code         TEXT        NOT NULL REFERENCES public.workspace_referral_profiles(referral_code) ON DELETE CASCADE,
  referrer_workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referred_user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_workspace_id UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL UNIQUE,
  anonymous_session_id  TEXT,
  status                TEXT        NOT NULL DEFAULT 'visited' CHECK (status IN (
    'visited',
    'signed_up',
    'activated',
    'converted'
  )),
  landing_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  signup_at             TIMESTAMPTZ,
  activated_at          TIMESTAMPTZ,
  converted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer_status
  ON public.referral_attributions(referrer_workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_code
  ON public.referral_attributions(referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referred_workspace
  ON public.referral_attributions(referred_workspace_id);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_attributions TO authenticated;
GRANT ALL ON public.referral_attributions TO service_role;

DROP TRIGGER IF EXISTS referral_attributions_updated_at ON public.referral_attributions;
CREATE TRIGGER referral_attributions_updated_at
  BEFORE UPDATE ON public.referral_attributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: referral_attributions (referrer can view their own referral stats)
DROP POLICY IF EXISTS "referral_attributions_select" ON public.referral_attributions;
CREATE POLICY "referral_attributions_select" ON public.referral_attributions
  FOR SELECT USING (
    public.is_workspace_member(referrer_workspace_id)
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR public.is_platform_admin(auth.uid())
  );

-- ===== 4. distribution_events Table =====

CREATE TABLE IF NOT EXISTS public.distribution_events (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type            TEXT        NOT NULL CHECK (event_type IN (
    'share_created',
    'share_viewed',
    'share_link_copied',
    'share_revoked',
    'share_expired',
    'share_email_sent',
    'recipient_cta_clicked',
    'referral_clicked',
    'referral_signup',
    'referral_activated',
    'referral_converted',
    'tool_used'
  )),
  artifact_id           UUID        REFERENCES public.shareable_artifacts(id) ON DELETE CASCADE,
  referral_code         TEXT,
  anonymous_session_id  TEXT,
  source                TEXT,
  metadata              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_events_workspace_type
  ON public.distribution_events(workspace_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_distribution_events_artifact
  ON public.distribution_events(artifact_id);

CREATE INDEX IF NOT EXISTS idx_distribution_events_referral
  ON public.distribution_events(referral_code);

ALTER TABLE public.distribution_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.distribution_events TO authenticated;
GRANT ALL ON public.distribution_events TO service_role;

-- RLS: distribution_events
DROP POLICY IF EXISTS "distribution_events_select" ON public.distribution_events;
CREATE POLICY "distribution_events_select" ON public.distribution_events
  FOR SELECT USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "distribution_events_insert" ON public.distribution_events;
CREATE POLICY "distribution_events_insert" ON public.distribution_events
  FOR INSERT WITH CHECK (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR public.is_platform_admin(auth.uid())
    OR auth.role() = 'anon'
  );

-- ===== 5. Atomic RPC: increment_artifact_view =====

CREATE OR REPLACE FUNCTION public.increment_artifact_view(p_share_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shareable_artifacts
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE share_token = p_share_token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_artifact_view(TEXT) TO authenticated, anon, service_role;
