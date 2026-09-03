-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('owner','admin','finance','manager','viewer');

-- ===== Utility =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  profession TEXT,
  avatar_url TEXT,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Workspaces =====
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  business_type TEXT,
  country TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  fiscal_year_start_month SMALLINT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Memberships =====
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER workspace_members_updated_at BEFORE UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Authorization helpers (SECURITY DEFINER, no RLS recursion) =====
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid() AND m.role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_workspace_role(_workspace_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.workspace_members m
  WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(UUID, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_workspace_role(UUID) TO authenticated;

CREATE POLICY workspaces_select_member ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));
CREATE POLICY workspaces_update_admin ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(id, ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY members_select_same_workspace ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY members_insert_admin ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY members_update_admin ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY members_delete_admin ON public.workspace_members FOR DELETE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
    AND role <> 'owner'
  );

-- ===== Workspace settings =====
CREATE TABLE public.workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tax_mode TEXT NOT NULL DEFAULT 'simple_reserve',
  tax_reserve_percent NUMERIC(5,2) NOT NULL DEFAULT 25 CHECK (tax_reserve_percent >= 0 AND tax_reserve_percent <= 100),
  operating_buffer NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (operating_buffer >= 0),
  default_payment_terms_days SMALLINT NOT NULL DEFAULT 14 CHECK (default_payment_terms_days BETWEEN 0 AND 365),
  invoice_number_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_next_number INTEGER NOT NULL DEFAULT 1 CHECK (invoice_next_number > 0),
  invoice_notes TEXT,
  payment_instructions TEXT,
  target_hourly_rate NUMERIC(18,2) CHECK (target_hourly_rate IS NULL OR target_hourly_rate >= 0),
  target_margin_percent NUMERIC(5,2) CHECK (target_margin_percent IS NULL OR (target_margin_percent >= 0 AND target_margin_percent <= 100)),
  desired_monthly_income NUMERIC(18,2) CHECK (desired_monthly_income IS NULL OR desired_monthly_income >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select_member ON public.workspace_settings FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY settings_update_admin ON public.workspace_settings FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','finance']::public.app_role[]));
CREATE TRIGGER workspace_settings_updated_at BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Audit log (append-only) =====
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_workspace_created ON public.audit_logs(workspace_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select_admin ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.write_audit_log(
  _workspace_id UUID, _action TEXT, _entity_type TEXT, _entity_id TEXT DEFAULT NULL, _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'not authorized for workspace %', _workspace_id USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END; $$;
GRANT EXECUTE ON FUNCTION public.write_audit_log(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ===== Atomic workspace creation =====
CREATE OR REPLACE FUNCTION public.create_workspace(
  _name TEXT,
  _business_type TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _timezone TEXT DEFAULT 'UTC',
  _currency TEXT DEFAULT 'USD',
  _fiscal_year_start_month SMALLINT DEFAULT 1,
  _tax_reserve_percent NUMERIC DEFAULT 25,
  _default_payment_terms_days SMALLINT DEFAULT 14,
  _operating_buffer NUMERIC DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workspaces (name, business_type, country, timezone, currency, fiscal_year_start_month, created_by)
  VALUES (btrim(_name), _business_type, _country, COALESCE(_timezone,'UTC'), upper(COALESCE(_currency,'USD')),
          COALESCE(_fiscal_year_start_month,1), _uid)
  RETURNING id INTO _id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_id, _uid, 'owner');

  INSERT INTO public.workspace_settings (workspace_id, tax_reserve_percent, default_payment_terms_days, operating_buffer)
  VALUES (_id, COALESCE(_tax_reserve_percent,25), COALESCE(_default_payment_terms_days,14), COALESCE(_operating_buffer,0));

  INSERT INTO public.audit_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_id, _uid, 'workspace.created', 'workspace', _id::text, jsonb_build_object('name', btrim(_name)));

  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, NUMERIC, SMALLINT, NUMERIC) TO authenticated;