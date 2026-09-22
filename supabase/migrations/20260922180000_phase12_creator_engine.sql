-- ============================================================================
-- SoloOS Phase 12: Creator Distribution Engine
-- Migration: 20260922180000_phase12_creator_engine.sql
-- ============================================================================
-- Architecture principles:
--   1. Phase 11 workspace referrals (/r/...) are UNTOUCHED.
--   2. Creator program uses /c/... routes exclusively.
--   3. creator_id + campaign_id are authoritative FKs on referral_attributions.
--      Public handles/codes are resolution identifiers only.
--   4. Commission records snapshot the rule at time of creation.
--      Changing future rules never alters historical commissions.
--   5. Commission generation is SECURITY DEFINER, idempotent, server-only.
--   6. Creators cannot modify attribution, commissions, or payout status.
-- ============================================================================

-- ===== 1. creator_profiles =====

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email              TEXT        NOT NULL CHECK (length(btrim(email)) >= 5),
  display_name       TEXT        NOT NULL CHECK (length(btrim(display_name)) >= 1 AND length(display_name) <= 100),
  public_handle      TEXT        NOT NULL UNIQUE CHECK (
    public_handle ~ '^[a-z0-9][a-z0-9\-]{2,46}[a-z0-9]$'
  ),
  referral_code      TEXT        NOT NULL UNIQUE CHECK (
    referral_code ~ '^[a-z0-9][a-z0-9\-]{2,46}[a-z0-9]$'
  ),
  bio                TEXT        CHECK (bio IS NULL OR length(bio) <= 500),
  website_url        TEXT        CHECK (website_url IS NULL OR length(website_url) <= 500),
  primary_platform   TEXT        CHECK (primary_platform IN (
    'tiktok','instagram','youtube','linkedin','x','facebook',
    'newsletter','blog','podcast','community','other'
  )),
  application_status TEXT        NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending','approved','rejected')),
  creator_status     TEXT        CHECK (creator_status IN ('active','suspended','closed')),
  application_note   TEXT        CHECK (application_note IS NULL OR length(application_note) <= 1000),
  admin_note         TEXT        CHECK (admin_note IS NULL OR length(admin_note) <= 500),
  approved_at        TIMESTAMPTZ,
  approved_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at        TIMESTAMPTZ,
  suspended_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id
  ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_referral_code
  ON public.creator_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_application_status
  ON public.creator_profiles(application_status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_creator_status
  ON public.creator_profiles(creator_status);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;

DROP TRIGGER IF EXISTS creator_profiles_updated_at ON public.creator_profiles;
CREATE TRIGGER creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: creator_profiles
-- Creators can see and update their own profile.
-- Platform admins can see and manage all.
-- Anonymous users can resolve a creator by referral_code (for /c/ landing route).
DROP POLICY IF EXISTS "creator_profiles_select_own" ON public.creator_profiles;
CREATE POLICY "creator_profiles_select_own" ON public.creator_profiles
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "creator_profiles_select_anon_resolve" ON public.creator_profiles;
CREATE POLICY "creator_profiles_select_anon_resolve" ON public.creator_profiles
  FOR SELECT USING (true);  -- public handle lookup is intentionally readable

DROP POLICY IF EXISTS "creator_profiles_insert" ON public.creator_profiles;
CREATE POLICY "creator_profiles_insert" ON public.creator_profiles
  FOR INSERT WITH CHECK (
    -- Users can submit their own application
    user_id = auth.uid()
    -- Admins can insert on behalf
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "creator_profiles_update_own" ON public.creator_profiles;
CREATE POLICY "creator_profiles_update_own" ON public.creator_profiles
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));


-- ===== 2. creator_channels =====

CREATE TABLE IF NOT EXISTS public.creator_channels (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  platform       TEXT        NOT NULL CHECK (platform IN (
    'tiktok','instagram','youtube','linkedin','x','facebook',
    'newsletter','blog','podcast','community','other'
  )),
  handle         TEXT        CHECK (handle IS NULL OR length(handle) <= 200),
  url            TEXT        CHECK (url IS NULL OR length(url) <= 500),
  follower_count INT         CHECK (follower_count IS NULL OR follower_count >= 0),
  is_verified    BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_channels_creator
  ON public.creator_channels(creator_id);

ALTER TABLE public.creator_channels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_channels TO authenticated;
GRANT ALL ON public.creator_channels TO service_role;

DROP POLICY IF EXISTS "creator_channels_own" ON public.creator_channels;
CREATE POLICY "creator_channels_own" ON public.creator_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );


-- ===== 3. creator_campaigns =====

CREATE TABLE IF NOT EXISTS public.creator_campaigns (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL CHECK (length(btrim(name)) >= 1 AND length(name) <= 100),
  platform         TEXT        CHECK (platform IN (
    'tiktok','instagram','youtube','linkedin','x','facebook',
    'newsletter','blog','podcast','community','other'
  )),
  campaign_code    TEXT        NOT NULL UNIQUE CHECK (
    campaign_code ~ '^[a-z0-9][a-z0-9\-]{2,62}[a-z0-9]$'
  ),
  status           TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  destination_path TEXT        NOT NULL DEFAULT '/' CHECK (length(destination_path) <= 200),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_creator_campaigns_creator
  ON public.creator_campaigns(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_campaigns_code
  ON public.creator_campaigns(campaign_code);

ALTER TABLE public.creator_campaigns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.creator_campaigns TO authenticated;
GRANT ALL ON public.creator_campaigns TO service_role;

DROP POLICY IF EXISTS "creator_campaigns_select_own" ON public.creator_campaigns;
CREATE POLICY "creator_campaigns_select_own" ON public.creator_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "creator_campaigns_insert_own" ON public.creator_campaigns;
CREATE POLICY "creator_campaigns_insert_own" ON public.creator_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id
        AND cp.user_id = auth.uid()
        AND cp.creator_status = 'active'
    )
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "creator_campaigns_update_own" ON public.creator_campaigns;
CREATE POLICY "creator_campaigns_update_own" ON public.creator_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );


-- ===== 4. creator_commission_rules =====

CREATE TABLE IF NOT EXISTS public.creator_commission_rules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL CHECK (length(btrim(name)) >= 1 AND length(name) <= 100),
  commission_rate_bps INT         NOT NULL CHECK (commission_rate_bps >= 1 AND commission_rate_bps <= 10000),
  window_months       INT         NOT NULL DEFAULT 12 CHECK (window_months >= 1 AND window_months <= 60),
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  applies_to_plan_id  TEXT        REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS creator_commission_rules_updated_at ON public.creator_commission_rules;
CREATE TRIGGER creator_commission_rules_updated_at
  BEFORE UPDATE ON public.creator_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_commission_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.creator_commission_rules TO authenticated;
GRANT ALL ON public.creator_commission_rules TO service_role;

DROP POLICY IF EXISTS "creator_commission_rules_select" ON public.creator_commission_rules;
CREATE POLICY "creator_commission_rules_select" ON public.creator_commission_rules
  FOR SELECT USING (
    is_active = true
    OR public.is_platform_admin(auth.uid())
  );

-- Seed the initial commercial rule: 20% recurring, 12-month window
INSERT INTO public.creator_commission_rules (name, commission_rate_bps, window_months, is_active)
VALUES ('Standard Creator Program', 2000, 12, true)
ON CONFLICT DO NOTHING;


-- ===== 5. creator_commissions =====

CREATE TABLE IF NOT EXISTS public.creator_commissions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id               UUID        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  attribution_id           UUID        NOT NULL REFERENCES public.referral_attributions(id) ON DELETE RESTRICT,
  subscription_payment_id  UUID        NOT NULL REFERENCES public.subscription_payments(id) ON DELETE RESTRICT,
  referred_workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  commission_rule_id       UUID        REFERENCES public.creator_commission_rules(id) ON DELETE SET NULL,
  -- Rule snapshot at time of creation (immutable — changing rules never alters history)
  billing_period_label     TEXT        NOT NULL CHECK (billing_period_label ~ '^\d{4}-\d{2}$'),
  gross_amount_cents       BIGINT      NOT NULL CHECK (gross_amount_cents >= 0),
  commission_rate_bps      INT         NOT NULL CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  window_months_snapshot   INT         NOT NULL CHECK (window_months_snapshot >= 1),
  commission_amount_cents  BIGINT      NOT NULL CHECK (commission_amount_cents >= 0),
  currency                 TEXT        NOT NULL CHECK (length(currency) = 3),
  status                   TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','reversed','ineligible')),
  flags                    JSONB       NOT NULL DEFAULT '{}',
  approved_at              TIMESTAMPTZ,
  approved_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at                  TIMESTAMPTZ,
  reversed_at              TIMESTAMPTZ,
  reversal_reason          TEXT        CHECK (reversal_reason IS NULL OR length(reversal_reason) <= 500),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Idempotency: exactly one commission per (creator, payment)
  CONSTRAINT uq_creator_commission_payment UNIQUE (creator_id, subscription_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_commissions_creator_status
  ON public.creator_commissions(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_attribution
  ON public.creator_commissions(attribution_id);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_payment
  ON public.creator_commissions(subscription_payment_id);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_currency
  ON public.creator_commissions(currency, status);

DROP TRIGGER IF EXISTS creator_commissions_updated_at ON public.creator_commissions;
CREATE TRIGGER creator_commissions_updated_at
  BEFORE UPDATE ON public.creator_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_commissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.creator_commissions TO authenticated;
GRANT ALL ON public.creator_commissions TO service_role;

DROP POLICY IF EXISTS "creator_commissions_select" ON public.creator_commissions;
CREATE POLICY "creator_commissions_select" ON public.creator_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );
-- No INSERT/UPDATE policy for authenticated — only service_role and SECURITY DEFINER function


-- ===== 6. creator_payouts =====

CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  currency         TEXT        NOT NULL CHECK (length(currency) = 3),
  amount_cents     BIGINT      NOT NULL CHECK (amount_cents > 0),
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid','failed','cancelled')),
  payout_reference TEXT,
  commission_ids   UUID[]      NOT NULL DEFAULT '{}',
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at      TIMESTAMPTZ,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at          TIMESTAMPTZ,
  failed_at        TIMESTAMPTZ,
  failure_reason   TEXT        CHECK (failure_reason IS NULL OR length(failure_reason) <= 500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_status
  ON public.creator_payouts(creator_id, status);

DROP TRIGGER IF EXISTS creator_payouts_updated_at ON public.creator_payouts;
CREATE TRIGGER creator_payouts_updated_at
  BEFORE UPDATE ON public.creator_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.creator_payouts TO authenticated;
GRANT ALL ON public.creator_payouts TO service_role;

DROP POLICY IF EXISTS "creator_payouts_select" ON public.creator_payouts;
CREATE POLICY "creator_payouts_select" ON public.creator_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );


-- ===== 7. creator_assets =====

CREATE TABLE IF NOT EXISTS public.creator_assets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL CHECK (length(btrim(title)) >= 1 AND length(title) <= 200),
  description TEXT        CHECK (description IS NULL OR length(description) <= 1000),
  asset_type  TEXT        NOT NULL CHECK (asset_type IN (
    'logo','screenshot','social_graphic','video',
    'copy_template','content_idea','product_description','campaign_asset'
  )),
  url         TEXT        NOT NULL CHECK (length(url) >= 1 AND length(url) <= 1000),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS creator_assets_updated_at ON public.creator_assets;
CREATE TRIGGER creator_assets_updated_at
  BEFORE UPDATE ON public.creator_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.creator_assets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.creator_assets TO authenticated, anon;
GRANT ALL ON public.creator_assets TO service_role;

DROP POLICY IF EXISTS "creator_assets_select_active" ON public.creator_assets;
CREATE POLICY "creator_assets_select_active" ON public.creator_assets
  FOR SELECT USING (
    status = 'active'
    OR public.is_platform_admin(auth.uid())
  );


-- ===== 8. Extend referral_attributions =====
-- Add creator_id and campaign_id as authoritative FKs.
-- These are NULLABLE — existing workspace referral rows will have NULL.

ALTER TABLE public.referral_attributions
  ADD COLUMN IF NOT EXISTS creator_id  UUID REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.creator_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referral_attributions_creator
  ON public.referral_attributions(creator_id);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_campaign
  ON public.referral_attributions(campaign_id);


-- ===== 9. SECURITY DEFINER: generate_creator_commission =====
-- Called server-side only. Idempotent via unique constraint.
-- All inputs are validated. No client trust.

CREATE OR REPLACE FUNCTION public.generate_creator_commission(
  p_subscription_payment_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment         RECORD;
  v_attribution     RECORD;
  v_creator         RECORD;
  v_rule            RECORD;
  v_commission_cents BIGINT;
  v_billing_label   TEXT;
  v_commission_id   UUID;
  v_window_cutoff   TIMESTAMPTZ;
BEGIN
  -- 1. Validate input
  IF p_subscription_payment_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Fetch payment — must be successful
  SELECT sp.id, sp.workspace_id, sp.verified_amount_cents, sp.verified_currency,
         sp.status, sp.verified_at, sp.plan_id
  INTO v_payment
  FROM public.subscription_payments sp
  WHERE sp.id = p_subscription_payment_id;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_payment.status <> 'successful' THEN RETURN NULL; END IF;
  IF v_payment.verified_amount_cents IS NULL OR v_payment.verified_amount_cents <= 0 THEN RETURN NULL; END IF;
  IF v_payment.verified_currency IS NULL THEN RETURN NULL; END IF;

  -- 3. Find creator attribution for this workspace
  SELECT ra.id, ra.creator_id, ra.campaign_id, ra.status,
         ra.converted_at, ra.landing_at, ra.referred_workspace_id
  INTO v_attribution
  FROM public.referral_attributions ra
  WHERE ra.referred_workspace_id = v_payment.workspace_id
    AND ra.creator_id IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_attribution.status <> 'converted' THEN RETURN NULL; END IF;

  -- 4. Fetch creator — must be active
  SELECT cp.id, cp.user_id, cp.creator_status
  INTO v_creator
  FROM public.creator_profiles cp
  WHERE cp.id = v_attribution.creator_id;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_creator.creator_status <> 'active' THEN RETURN NULL; END IF;

  -- 5. Self-referral check: creator cannot earn on their own workspace
  IF v_creator.user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = v_payment.workspace_id
        AND wm.user_id = v_creator.user_id
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- 6. Fetch active commission rule (most specific first, then general)
  SELECT ccr.id, ccr.commission_rate_bps, ccr.window_months
  INTO v_rule
  FROM public.creator_commission_rules ccr
  WHERE ccr.is_active = true
    AND (ccr.applies_to_plan_id = v_payment.plan_id OR ccr.applies_to_plan_id IS NULL)
  ORDER BY ccr.applies_to_plan_id NULLS LAST, ccr.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- 7. Check commission window (from conversion date)
  v_window_cutoff := v_attribution.converted_at + (v_rule.window_months || ' months')::INTERVAL;
  IF v_payment.verified_at IS NULL OR v_payment.verified_at > v_window_cutoff THEN
    RETURN NULL;
  END IF;

  -- 8. Compute commission using integer arithmetic (no floating point)
  v_commission_cents := (v_payment.verified_amount_cents * v_rule.commission_rate_bps) / 10000;

  -- 9. Billing period label (YYYY-MM from payment verification date)
  v_billing_label := to_char(v_payment.verified_at, 'YYYY-MM');

  -- 10. Insert idempotently — ON CONFLICT returns NULL if already exists
  INSERT INTO public.creator_commissions (
    creator_id,
    attribution_id,
    subscription_payment_id,
    referred_workspace_id,
    commission_rule_id,
    billing_period_label,
    gross_amount_cents,
    commission_rate_bps,
    window_months_snapshot,
    commission_amount_cents,
    currency,
    status,
    flags
  ) VALUES (
    v_attribution.creator_id,
    v_attribution.id,
    p_subscription_payment_id,
    v_payment.workspace_id,
    v_rule.id,
    v_billing_label,
    v_payment.verified_amount_cents,
    v_rule.commission_rate_bps,
    v_rule.window_months,
    v_commission_cents,
    v_payment.verified_currency,
    'pending',
    '{}'::jsonb
  )
  ON CONFLICT (creator_id, subscription_payment_id) DO NOTHING
  RETURNING id INTO v_commission_id;

  RETURN v_commission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_creator_commission(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_creator_commission(UUID) TO service_role;

-- ===== 10. SECURITY DEFINER: resolve_creator_by_code =====
-- Used by the /c/ landing route to safely look up a creator + campaign.
-- Returns minimal public info only. No internal state exposed.

CREATE OR REPLACE FUNCTION public.resolve_creator_by_code(
  p_referral_code TEXT,
  p_campaign_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  creator_id       UUID,
  display_name     TEXT,
  primary_platform TEXT,
  campaign_id      UUID,
  campaign_name    TEXT,
  destination_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF p_referral_code IS NULL OR NOT (p_referral_code ~ '^[a-z0-9][a-z0-9\-]{2,46}[a-z0-9]$') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cp.id                                             AS creator_id,
    cp.display_name,
    cp.primary_platform,
    cc.id                                             AS campaign_id,
    cc.name                                           AS campaign_name,
    COALESCE(cc.destination_path, '/')               AS destination_path
  FROM public.creator_profiles cp
  LEFT JOIN public.creator_campaigns cc
    ON cc.creator_id = cp.id
    AND cc.campaign_code = p_campaign_code
    AND cc.status = 'active'
  WHERE cp.referral_code = p_referral_code
    AND cp.creator_status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_creator_by_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_creator_by_code(TEXT, TEXT)
  TO authenticated, anon, service_role;
