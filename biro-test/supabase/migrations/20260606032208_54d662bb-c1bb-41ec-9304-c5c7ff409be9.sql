REVOKE INSERT ON public.public_tests FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can publish a test" ON public.public_tests;
DROP POLICY IF EXISTS "Anyone can publish public tests through backend" ON public.public_tests;

ALTER TABLE public.test_creation_usage
ADD COLUMN IF NOT EXISTS quota_identity text;

UPDATE public.test_creation_usage
SET quota_identity = user_key
WHERE quota_identity IS NULL;

ALTER TABLE public.test_creation_usage
ALTER COLUMN quota_identity SET NOT NULL;

CREATE INDEX IF NOT EXISTS test_creation_usage_identity_created_at_idx
  ON public.test_creation_usage (quota_identity, created_at DESC);

DROP POLICY IF EXISTS "Anyone can insert usage rows" ON public.test_creation_usage;
DROP POLICY IF EXISTS "Users can read only their own usage rows" ON public.test_creation_usage;

REVOKE SELECT, INSERT ON public.test_creation_usage FROM anon, authenticated;
GRANT ALL ON public.test_creation_usage TO service_role;