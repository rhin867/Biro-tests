// Returns ONLY non-sensitive settings (no passwords).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_KEYS = [
  "test_creation_password_expires_at",
  "quota_daily_tests",
  "quota_monthly_tests",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", PUBLIC_KEYS);
    if (error) throw error;
    const out: Record<string, any> = {
      test_creation_password_expires_at: null,
      quota_daily_tests: 5,
      quota_monthly_tests: 50,
    };
    for (const r of data ?? []) out[(r as any).key] = (r as any).value;
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
