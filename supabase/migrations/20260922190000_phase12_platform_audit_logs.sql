-- ============================================================
-- Phase 12: Platform Audit Logs
-- Purpose: Record platform-level admin actions (creator program,
--          payouts, commissions) without requiring a workspace_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast actor lookups
CREATE INDEX IF NOT EXISTS platform_audit_logs_actor_id_idx
  ON public.platform_audit_logs (actor_id);

-- Index for entity lookups
CREATE INDEX IF NOT EXISTS platform_audit_logs_entity_idx
  ON public.platform_audit_logs (entity_type, entity_id);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS platform_audit_logs_created_at_idx
  ON public.platform_audit_logs (created_at DESC);

-- RLS: only platform admins can read; no direct client writes
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_can_read_platform_audit_logs"
  ON public.platform_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_roles
      WHERE user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies — only written via service role (supabaseAdmin)
