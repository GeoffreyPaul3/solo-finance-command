-- ============================================================================
-- SoloOS Phase 8: AI CFO Interactions History
-- Migration: 20260915120000_phase8_ai_cfo.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_cfo_interactions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID         NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question          TEXT         NOT NULL,
  response          JSONB        NOT NULL,
  context_snapshot  JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cfo_interactions_workspace_created
  ON public.ai_cfo_interactions(workspace_id, created_at DESC);

ALTER TABLE public.ai_cfo_interactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_cfo_interactions' AND policyname = 'ai_cfo_interactions_select_member'
  ) THEN
    CREATE POLICY ai_cfo_interactions_select_member ON public.ai_cfo_interactions
      FOR SELECT TO authenticated
      USING (public.is_workspace_member(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_cfo_interactions' AND policyname = 'ai_cfo_interactions_insert_member'
  ) THEN
    CREATE POLICY ai_cfo_interactions_insert_member ON public.ai_cfo_interactions
      FOR INSERT TO authenticated
      WITH CHECK (public.is_workspace_member(workspace_id) AND auth.uid() = user_id);
  END IF;
END $$;

-- ===== RPC: log_ai_cfo_interaction =====
CREATE OR REPLACE FUNCTION public.log_ai_cfo_interaction(
  _workspace_id     UUID,
  _question         TEXT,
  _response         JSONB,
  _context_snapshot JSONB DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_id UUID;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_cfo_interactions (
    workspace_id,
    user_id,
    question,
    response,
    context_snapshot
  ) VALUES (
    _workspace_id,
    auth.uid(),
    _question,
    _response,
    _context_snapshot
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.log_ai_cfo_interaction(UUID,TEXT,JSONB,JSONB) TO authenticated;

-- ===== RPC: get_recent_ai_cfo_interactions =====
CREATE OR REPLACE FUNCTION public.get_recent_ai_cfo_interactions(
  _workspace_id UUID,
  _limit        INT DEFAULT 20
)
RETURNS TABLE (
  id                UUID,
  user_id           UUID,
  question          TEXT,
  response          JSONB,
  context_snapshot  JSONB,
  created_at        TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.user_id,
    i.question,
    i.response,
    i.context_snapshot,
    i.created_at
  FROM public.ai_cfo_interactions i
  WHERE i.workspace_id = _workspace_id
  ORDER BY i.created_at DESC
  LIMIT LEAST(_limit, 50);
END; $$;
GRANT EXECUTE ON FUNCTION public.get_recent_ai_cfo_interactions(UUID,INT) TO authenticated;
