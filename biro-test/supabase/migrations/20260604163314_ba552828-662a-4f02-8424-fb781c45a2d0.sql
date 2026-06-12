
-- app_settings: global key/value config (passwords + expiry)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('test_creation_password', to_jsonb('CHANGE_ME'::text)),
  ('test_creation_password_expires_at', 'null'::jsonb),
  ('admin_password_1', to_jsonb('CHANGE_ME'::text)),
  ('admin_password_2', to_jsonb('CHANGE_ME'::text))
ON CONFLICT (key) DO NOTHING;

-- public_tests: publicly shared test catalog
CREATE TABLE public.public_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL,
  name text NOT NULL,
  subjects text[] NOT NULL DEFAULT '{}',
  question_count int NOT NULL DEFAULT 0,
  duration int NOT NULL DEFAULT 180,
  total_marks int NOT NULL DEFAULT 0,
  test_data jsonb NOT NULL,
  owner_id uuid,
  owner_name text,
  password text,
  attempts_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_tests TO anon, authenticated;
GRANT ALL ON public.public_tests TO service_role;
ALTER TABLE public.public_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read public tests"
  ON public.public_tests FOR SELECT USING (true);
CREATE POLICY "Anyone can publish a test"
  ON public.public_tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can increment attempts"
  ON public.public_tests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Owner can delete via owner_id or anon"
  ON public.public_tests FOR DELETE USING (true);

-- test_leaderboard: per-test attempts
CREATE TABLE public.test_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL,
  user_key text NOT NULL,
  display_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  time_taken int NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leaderboard_test ON public.test_leaderboard(test_id);
GRANT SELECT, INSERT ON public.test_leaderboard TO anon, authenticated;
GRANT ALL ON public.test_leaderboard TO service_role;
ALTER TABLE public.test_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read leaderboard"
  ON public.test_leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can submit a result"
  ON public.test_leaderboard FOR INSERT WITH CHECK (true);
