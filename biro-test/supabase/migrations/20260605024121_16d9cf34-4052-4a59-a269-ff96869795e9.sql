
-- 1) Lock down app_settings: revoke public SELECT, allow only service_role (passwords now server-side only)
REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;

-- Drop any prior anon/authenticated policies on app_settings
DROP POLICY IF EXISTS "Public read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies for anon/authenticated. Service role bypasses RLS.

-- 2) Test creation usage tracking
CREATE TABLE IF NOT EXISTS public.test_creation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL,
  display_name text,
  test_id text,
  test_name text,
  ai_calls integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS test_creation_usage_user_key_created_at_idx
  ON public.test_creation_usage (user_key, created_at DESC);

GRANT SELECT, INSERT ON public.test_creation_usage TO anon, authenticated;
GRANT ALL ON public.test_creation_usage TO service_role;

ALTER TABLE public.test_creation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert usage rows"
  ON public.test_creation_usage FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read own usage rows"
  ON public.test_creation_usage FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3) Seed default quota settings + expose only NON-SENSITIVE app_settings via a public view
INSERT INTO public.app_settings (key, value)
VALUES
  ('quota_daily_tests', to_jsonb(5)),
  ('quota_monthly_tests', to_jsonb(50))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE VIEW public.app_settings_public AS
SELECT key, value
FROM public.app_settings
WHERE key IN (
  'test_creation_password_expires_at',
  'quota_daily_tests',
  'quota_monthly_tests'
);

GRANT SELECT ON public.app_settings_public TO anon, authenticated;
