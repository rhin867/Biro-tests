-- Fix public_tests data leak by dropping the permissive SELECT policy
-- and creating a restricted one that doesn't expose passwords or test_data
-- unless properly requested (actually we will just drop it and use views or rely on edge functions)

DROP POLICY IF EXISTS "Anyone can read public tests" ON public.public_tests;

-- If users need to read public tests directly, we should only expose safe columns.
-- Supabase doesn't easily support column-level SELECT policies without views,
-- but since the app uses Edge Functions (start-public-test, list-public-tests)
-- we can safely disable public SELECT entirely.

-- Revoke SELECT on public_tests for anon and authenticated
REVOKE SELECT ON public.public_tests FROM anon, authenticated;
GRANT SELECT (id, test_id, name, subjects, question_count, duration, total_marks, owner_id, owner_name, attempts_count, created_at) ON public.public_tests TO anon, authenticated;

-- Add a policy back if they query safe columns (password and test_data excluded)
CREATE POLICY "Anyone can read safe columns of public tests"
  ON public.public_tests FOR SELECT USING (true);
