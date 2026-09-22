-- ============================================================================
-- SoloOS Phase 12: Creator Payout Details & Malawi Localization
-- Migration: 20260922220000_phase12_creator_payouts_and_malawi.sql
-- ============================================================================

-- 1. Extend creator_profiles with Malawi payout details
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'MW',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT CHECK (payout_method IS NULL OR payout_method IN ('mobile_money', 'bank')),
  ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT CHECK (mobile_money_provider IS NULL OR mobile_money_provider IN ('airtel', 'tnm')),
  ADD COLUMN IF NOT EXISTS mobile_money_number TEXT,
  ADD COLUMN IF NOT EXISTS mobile_money_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS payout_details_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_payout_method
  ON public.creator_profiles(payout_method);

-- 2. Extend creator_payouts with snapshot payout details
ALTER TABLE public.creator_payouts
  ADD COLUMN IF NOT EXISTS payout_method TEXT,
  ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Ensure platform admin write access to creator_assets
DROP POLICY IF EXISTS "creator_assets_admin_all" ON public.creator_assets;
CREATE POLICY "creator_assets_admin_all" ON public.creator_assets
  FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 4. Seed initial default SoloOS Brand & Media Kit assets if empty
INSERT INTO public.creator_assets (title, description, asset_type, url, status)
VALUES
  (
    'SoloOS Primary Logo Suite (Dark & Light Vector SVGs)',
    'High-resolution vector marks and full logotypes for video overlays, websites, and newsletter headers.',
    'logo',
    'https://solofinance.app/brand/soloos-logo-pack.svg',
    'active'
  ),
  (
    'Social Media Promo Banners (1200x630 & 1080x1080)',
    'Optimized preview graphics for X / Twitter cards, LinkedIn carousels, and Instagram stories.',
    'social_graphic',
    'https://solofinance.app/brand/soloos-social-banners.zip',
    'active'
  ),
  (
    'Video Overlay Badge ("Partnered with SoloOS")',
    'Transparent PNG badge (dark and emerald accents) designed for 1080p and 4K YouTube video corners.',
    'video',
    'https://solofinance.app/brand/soloos-partner-badge.png',
    'active'
  ),
  (
    'YouTube & Video Description Swipe Copy',
    'Tested description snippets, feature highlights, and call-to-action copy with placeholder for your /c/ link.',
    'copy_template',
    'https://solofinance.app/brand/youtube-description-template.txt',
    'active'
  ),
  (
    'Newsletter & WhatsApp Community Template',
    'Ready-to-use email newsletter section explaining SoloOS invoicing, tax calculation, and tracking for Malawian freelancers.',
    'copy_template',
    'https://solofinance.app/brand/newsletter-whatsapp-template.txt',
    'active'
  )
ON CONFLICT DO NOTHING;
