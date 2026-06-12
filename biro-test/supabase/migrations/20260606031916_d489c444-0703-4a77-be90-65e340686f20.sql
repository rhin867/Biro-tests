REVOKE SELECT, UPDATE, DELETE ON public.public_tests FROM anon, authenticated;
GRANT INSERT ON public.public_tests TO anon, authenticated;
GRANT ALL ON public.public_tests TO service_role;

DROP VIEW IF EXISTS public.public_tests_safe;
CREATE VIEW public.public_tests_safe WITH (security_invoker = true) AS
SELECT
  id,
  test_id,
  name,
  subjects,
  question_count,
  duration,
  total_marks,
  owner_id,
  owner_name,
  (password IS NOT NULL AND password <> '') AS has_password,
  attempts_count,
  created_at
FROM public.public_tests;

GRANT SELECT ON public.public_tests_safe TO anon, authenticated;
GRANT ALL ON public.public_tests_safe TO service_role;

DROP POLICY IF EXISTS "Anyone can increment attempts" ON public.public_tests;
DROP POLICY IF EXISTS "Owner can delete via owner_id or anon" ON public.public_tests;
CREATE POLICY "Anyone can publish public tests through backend"
  ON public.public_tests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);