-- ============================================================================
-- SoloOS Phase 12: Relax referral_attributions for Creator Attribution
-- Migration: 20260922183000_phase12_attribution_relax.sql
-- ============================================================================
-- Allows referral_attributions rows to be owned by a creator (creator_id)
-- without requiring a referrer_workspace_id or referral_code.
-- ============================================================================

ALTER TABLE public.referral_attributions
  ALTER COLUMN referral_code DROP NOT NULL,
  ALTER COLUMN referrer_workspace_id DROP NOT NULL;

-- Update SELECT policy so creators can see their attributions
DROP POLICY IF EXISTS "referral_attributions_select" ON public.referral_attributions;
CREATE POLICY "referral_attributions_select" ON public.referral_attributions
  FOR SELECT USING (
    (referrer_workspace_id IS NOT NULL AND public.is_workspace_member(referrer_workspace_id))
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR (creator_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    ))
    OR public.is_platform_admin(auth.uid())
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "referral_attributions_update" ON public.referral_attributions;
CREATE POLICY "referral_attributions_update" ON public.referral_attributions
  FOR UPDATE USING (
    (referrer_workspace_id IS NOT NULL AND public.is_workspace_member(referrer_workspace_id))
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR (creator_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    ))
    OR public.is_platform_admin(auth.uid())
  ) WITH CHECK (
    (referrer_workspace_id IS NOT NULL AND public.is_workspace_member(referrer_workspace_id))
    OR (referred_workspace_id IS NOT NULL AND public.is_workspace_member(referred_workspace_id))
    OR (creator_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    ))
    OR public.is_platform_admin(auth.uid())
  );
