-- ============================================================================
-- SoloOS Phase 3: Clients + Projects Domain
-- Migration: 20260908140000_phase3_clients_projects.sql
-- ============================================================================

-- ===== 1. Custom Enums =====

DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM (
    'active',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'planning',
    'active',
    'on_hold',
    'completed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== 2. Clients Table =====

CREATE TABLE IF NOT EXISTS public.clients (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  company_name   TEXT        CHECK (company_name IS NULL OR length(btrim(company_name)) BETWEEN 1 AND 200),
  email          TEXT        CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone          TEXT        CHECK (phone IS NULL OR length(btrim(phone)) <= 50),
  address        TEXT        CHECK (address IS NULL OR length(address) <= 500),
  notes          TEXT        CHECK (notes IS NULL OR length(notes) <= 2000),
  status         public.client_status NOT NULL DEFAULT 'active',
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_clients_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_clients_workspace_status
  ON public.clients(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_clients_workspace_created
  ON public.clients(workspace_id, created_at DESC);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies: Clients
-- SELECT: any workspace member can read clients in their workspace
DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- INSERT: owner, admin, finance, manager can create clients
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT
  WITH CHECK (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  );

-- UPDATE: owner, admin, finance, manager can update clients
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE
  USING (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  )
  WITH CHECK (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  );

-- DELETE: only owner/admin (hard delete rarely used; archival is preferred)
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE
  USING (
    public.has_workspace_role(
      ARRAY['owner','admin']::public.app_role[],
      workspace_id
    )
  );

-- ===== 3. Projects Table =====

CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id       UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  description     TEXT        CHECK (description IS NULL OR length(description) <= 2000),
  status          public.project_status NOT NULL DEFAULT 'planning',
  start_date      DATE,
  end_date        DATE,
  budget          NUMERIC(18, 4) CHECK (budget IS NULL OR budget >= 0),
  budget_currency CHAR(3)     CHECK (budget_currency IS NULL OR length(budget_currency) = 3),
  notes           TEXT        CHECK (notes IS NULL OR length(notes) <= 2000),
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Enforce: start_date must be on or before end_date when both provided
  CONSTRAINT chk_projects_dates CHECK (
    start_date IS NULL OR end_date IS NULL OR start_date <= end_date
  ),
  -- Enforce: budget_currency must be provided if budget is provided
  CONSTRAINT chk_projects_budget_currency CHECK (
    (budget IS NULL AND budget_currency IS NULL) OR
    (budget IS NOT NULL AND budget_currency IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_status
  ON public.projects(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_client
  ON public.projects(workspace_id, client_id);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_created
  ON public.projects(workspace_id, created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== 4. Cross-Workspace Integrity: projects.client_id must belong to same workspace =====
-- This function-based trigger enforces referential workspace integrity at DB level.
-- The FK alone (client_id → clients.id) does not check workspace_id match.

CREATE OR REPLACE FUNCTION public.check_project_client_workspace()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = NEW.client_id
        AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION
        'Project client_id does not belong to the same workspace (workspace_id: %). Cross-workspace references are prohibited.',
        NEW.workspace_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_project_client_workspace ON public.projects;
CREATE TRIGGER trg_project_client_workspace
  BEFORE INSERT OR UPDATE OF client_id, workspace_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.check_project_client_workspace();

-- RLS Policies: Projects
-- SELECT: any workspace member
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- INSERT: owner, admin, finance, manager
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT
  WITH CHECK (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  );

-- UPDATE: owner, admin, finance, manager
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE
  USING (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  )
  WITH CHECK (
    public.has_workspace_role(
      ARRAY['owner','admin','finance','manager']::public.app_role[],
      workspace_id
    )
  );

-- DELETE: owner, admin only
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE
  USING (
    public.has_workspace_role(
      ARRAY['owner','admin']::public.app_role[],
      workspace_id
    )
  );

-- ===== 5. Audit Helpers =====
-- Helper RPCs for client/project mutations are invoked from the frontend
-- using the existing write_audit_log RPC. No new RPC needed.

-- ===== 6. Comments =====
COMMENT ON TABLE public.clients IS
  'SoloOS Phase 3: Client directory. Each row belongs to exactly one workspace. RLS enforced.';
COMMENT ON TABLE public.projects IS
  'SoloOS Phase 3: Project directory. Optionally linked to a client within the same workspace. RLS enforced. Cross-workspace client references blocked by trigger.';
COMMENT ON COLUMN public.projects.budget IS
  'Project budget stored as NUMERIC(18,4) — exact decimal, no floating-point. Currency stored separately in budget_currency.';
