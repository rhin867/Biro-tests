import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const testId = sanitize(body.testId, 120);
    const testName = sanitize(body.testName, 240);
    const userKey = sanitize(body.userKey, 120);
    const displayName = sanitize(body.displayName, 80) || "Guest";
    const aiCalls = Math.max(1, Math.min(20, Number(body.aiCalls || 1)));
    if (!testId || !testName || !userKey) return json({ error: "Missing usage data" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quota_identity = await quotaIdentity(req);

    const { error } = await supabase.from("test_creation_usage").insert({
      quota_identity,
      user_key: userKey,
      display_name: displayName,
      test_id: testId,
      test_name: testName,
      ai_calls: aiCalls,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

function sanitize(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function quotaIdentity(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown-ip";
  const ua = req.headers.get("user-agent") || "unknown-agent";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${ua}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}