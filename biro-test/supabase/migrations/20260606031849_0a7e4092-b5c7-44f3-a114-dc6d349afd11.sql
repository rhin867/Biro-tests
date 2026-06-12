CREATE OR REPLACE FUNCTION public.current_request_user_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::jsonb->>'x-user-key', '')
$$;

REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

DROP POLICY IF EXISTS "Public read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read own usage rows" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Users can read own usage rows" ON public.test_creation_usage;

CREATE POLICY "Users can read only their own usage rows"
  ON public.test_creation_usage
  FOR SELECT
  TO anon, authenticated
  USING (user_key = public.current_request_user_key());

DROP VIEW IF EXISTS public.public_tests_safe;
CREATE VIEW public.public_tests_safe AS
SELECT
  id,
  test_id,
  name,
  subjects,
  question_count,
  duration,
  total_marks,
  test_data,
  owner_id,
  owner_name,
  (password IS NOT NULL AND password <> '') AS has_password,
  attempts_count,
  created_at
FROM public.public_tests;

GRANT SELECT ON public.public_tests_safe TO anon, authenticated;
GRANT ALL ON public.public_tests_safe TO service_role;