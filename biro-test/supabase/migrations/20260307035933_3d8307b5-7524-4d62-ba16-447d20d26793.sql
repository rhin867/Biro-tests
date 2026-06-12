
-- Shared tests table for cross-device test sharing
CREATE TABLE public.shared_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code text UNIQUE NOT NULL,
  test_data jsonb NOT NULL,
  creator_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared tests" ON public.shared_tests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can share tests" ON public.shared_tests FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Community messages table for live chat
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  content text NOT NULL,
  msg_type text DEFAULT 'chat',
  post_type text DEFAULT 'general',
  upvotes int DEFAULT 0,
  downvotes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages" ON public.community_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can post messages" ON public.community_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update messages" ON public.community_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
