import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await quotaIdentity(req);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: settings } = await supabase.from("app_settings").select("key,value").in("key", ["quota_daily_tests", "quota_monthly_tests"]);
    const map = new Map((settings ?? []).map((r: any) => [r.key, r.value]));
    const dailyLimit = Number(map.get("quota_daily_tests") ?? 5);
    const monthlyLimit = Number(map.get("quota_monthly_tests") ?? 50);

    const { count: dailyUsed } = await supabase.from("test_creation_usage").select("id", { count: "exact", head: true }).eq("quota_identity", identity).gte("created_at", startOfDay);
    const { count: monthlyUsed } = await supabase.from("test_creation_usage").select("id", { count: "exact", head: true }).eq("quota_identity", identity).gte("created_at", startOfMonth);

    const daily = dailyUsed ?? 0;
    const monthly = monthlyUsed ?? 0;
    return json({
      dailyUsed: daily,
      dailyLimit,
      monthlyUsed: monthly,
      monthlyLimit,
      dailyRemaining: Math.max(0, dailyLimit - daily),
      monthlyRemaining: Math.max(0, monthlyLimit - monthly),
      exceeded: daily >= dailyLimit || monthly >= monthlyLimit,
    });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

async function quotaIdentity(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown-ip";
  const ua = req.headers.get("user-agent") || "unknown-agent";
  const raw = `${ip}|${ua}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}