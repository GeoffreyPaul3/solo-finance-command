-- SoloOS: Seed initial platform super-admin
-- Grants super_admin access to geofreypaul40@gmail.com once their auth account exists.
-- Idempotent: safe to run multiple times; silently no-ops if user not found.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Resolve email → user UUID from auth.users (only accessible via service_role / DO block)
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'geofreypaul40@gmail.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'seed_platform_admin: user geofreypaul40@gmail.com not found — skipping insert';
    RETURN;
  END IF;

  INSERT INTO public.platform_admin_roles (user_id, role, created_by)
  VALUES (v_user_id, 'super_admin', v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'seed_platform_admin: granted super_admin to user %', v_user_id;
END;
$$;
