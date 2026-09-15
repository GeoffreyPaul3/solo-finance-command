-- SoloOS Phase 9: Platform, Subscriptions, Pricing, Invitations, Support & Email Events

-- 1. Workspace Logo
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Platform Admin Roles (Dedicated table, not boolean on profiles)
CREATE TABLE IF NOT EXISTS public.platform_admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'support_admin', 'billing_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT platform_admin_roles_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.platform_admin_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_admin_roles TO authenticated;
GRANT ALL ON public.platform_admin_roles TO service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin(check_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admin_roles
    WHERE user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS platform_admin_roles_select ON public.platform_admin_roles;
CREATE POLICY platform_admin_roles_select ON public.platform_admin_roles FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 3. Subscription Plans & Canonical Prices
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

DROP POLICY IF EXISTS subscription_plans_read_all ON public.subscription_plans;
CREATE POLICY subscription_plans_read_all ON public.subscription_plans FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.subscription_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('MWK', 'USD')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  amount_cents BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_currency_interval UNIQUE (plan_id, currency, billing_interval)
);

ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscription_prices TO anon, authenticated;
GRANT ALL ON public.subscription_prices TO service_role;

DROP POLICY IF EXISTS subscription_prices_read_all ON public.subscription_prices;
CREATE POLICY subscription_prices_read_all ON public.subscription_prices FOR SELECT USING (true);

-- Seed Plans & Canonical Prices
-- Solo: MWK 14,000/mo ($8/mo) | Pro: MWK 21,000/mo ($12/mo)
INSERT INTO public.subscription_plans (id, name, description, features)
VALUES
  ('free', 'Free', 'Essential bookkeeping and cashflow foundations for solo operators', '["Single currency tracking", "Up to 5 clients", "Up to 10 invoices / month", "Standard tax estimator", "Community support"]'::jsonb),
  ('solo', 'Solo', 'Full autonomous financial operating system for thriving freelancers', '["Multi-currency support", "Unlimited clients & invoices", "Full cashflow forecasting & runway", "Automated recurring obligations", "AI CFO insights & advice", "PDF report exports", "Priority support"]'::jsonb),
  ('pro', 'Pro', 'Maximum financial intelligence, multi-entity tools, and priority processing', '["Everything in Solo", "Unlimited team members", "Multi-workspace management", "Advanced tax planning reserves", "Direct CSV & PDF audit exports", "Unlimited AI CFO analysis", "Dedicated 24/7 priority support"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

INSERT INTO public.subscription_prices (plan_id, currency, billing_interval, amount_cents)
VALUES
  ('free', 'MWK', 'month', 0),
  ('free', 'USD', 'month', 0),
  ('solo', 'MWK', 'month', 1400000),
  ('solo', 'USD', 'month', 800),
  ('pro', 'MWK', 'month', 2100000),
  ('pro', 'USD', 'month', 1200)
ON CONFLICT (plan_id, currency, billing_interval) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents;

-- 4. Workspaces Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  currency TEXT NOT NULL CHECK (currency IN ('MWK', 'USD')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_subscription UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON public.subscriptions(workspace_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS subscriptions_admin_all ON public.subscriptions;
CREATE POLICY subscriptions_admin_all ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 5. Subscription Payments (Reconciliation & Audit Trail)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  tx_ref TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paychangu',
  provider_ref TEXT,
  expected_amount_cents BIGINT NOT NULL,
  expected_currency TEXT NOT NULL,
  verified_amount_cents BIGINT,
  verified_currency TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'successful', 'failed', 'mismatch', 'refunded')) DEFAULT 'pending',
  failure_reason TEXT,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_workspace ON public.subscription_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_tx_ref ON public.subscription_payments(tx_ref);
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;

DROP TRIGGER IF EXISTS subscription_payments_updated_at ON public.subscription_payments;
CREATE TRIGGER subscription_payments_updated_at BEFORE UPDATE ON public.subscription_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS sub_payments_select ON public.subscription_payments;
CREATE POLICY sub_payments_select ON public.subscription_payments FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS sub_payments_insert_admin ON public.subscription_payments;
CREATE POLICY sub_payments_insert_admin ON public.subscription_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[]) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS sub_payments_admin_all ON public.subscription_payments;
CREATE POLICY sub_payments_admin_all ON public.subscription_payments FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 6. Workspace Invitations (Supabase link flow, NO emailed passwords)
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.workspace_invitations(token);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;

DROP POLICY IF EXISTS invitations_select ON public.workspace_invitations;
CREATE POLICY invitations_select ON public.workspace_invitations FOR SELECT TO authenticated
  USING (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS invitations_insert ON public.workspace_invitations;
CREATE POLICY invitations_insert ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS invitations_update ON public.workspace_invitations;
CREATE POLICY invitations_update ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.app_role[])
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- 7. Support Requests
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.support_requests TO anon, authenticated;
GRANT ALL ON public.support_requests TO service_role;

DROP POLICY IF EXISTS support_insert_all ON public.support_requests;
CREATE POLICY support_insert_all ON public.support_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS support_select ON public.support_requests;
CREATE POLICY support_select ON public.support_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS support_admin_update ON public.support_requests;
CREATE POLICY support_admin_update ON public.support_requests FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 8. Email Events (Idempotency & Outbox Logging)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'suppressed')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;

DROP POLICY IF EXISTS email_events_admin ON public.email_events;
CREATE POLICY email_events_admin ON public.email_events FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 9. Storage Buckets (workspaces for logos, avatars for profiles)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspaces', 'workspaces', true), ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Workspaces Bucket Public Read'
  ) THEN
    CREATE POLICY "Workspaces Bucket Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'workspaces');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Workspaces Bucket Authenticated Insert'
  ) THEN
    CREATE POLICY "Workspaces Bucket Authenticated Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'workspaces');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Workspaces Bucket Authenticated Update'
  ) THEN
    CREATE POLICY "Workspaces Bucket Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'workspaces');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Workspaces Bucket Authenticated Delete'
  ) THEN
    CREATE POLICY "Workspaces Bucket Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'workspaces');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Bucket Public Read'
  ) THEN
    CREATE POLICY "Avatars Bucket Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Bucket Authenticated Insert'
  ) THEN
    CREATE POLICY "Avatars Bucket Authenticated Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Bucket Authenticated Update'
  ) THEN
    CREATE POLICY "Avatars Bucket Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Bucket Authenticated Delete'
  ) THEN
    CREATE POLICY "Avatars Bucket Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
  END IF;
END $$;
