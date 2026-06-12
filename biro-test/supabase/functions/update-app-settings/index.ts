import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_KEYS = new Set([
  "test_creation_password",
  "test_creation_password_expires_at",
  "admin_password_1",
  "admin_password_2",
  "quota_daily_tests",
  "quota_monthly_tests",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { key, value, ownerPassword } = await req.json();

    if (!ALLOWED_KEYS.has(key)) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify owner password matches admin_password_2 in DB
    const { data: pwRow, error: pwErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_password_2")
      .maybeSingle();

    if (pwErr) throw pwErr;
    const currentPw = pwRow?.value;
    if (!ownerPassword || !currentPw || !(await verifySecret(ownerPassword, currentPw))) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid owner password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storedValue = key.includes("password") && typeof value === "string"
      ? await hashSecret(value)
      : value;

    const { error: upErr } = await supabase
      .from("app_settings")
      .upsert({ key, value: storedValue, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function verifySecret(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith("sha256$")) return stored === await hashSecret(input);
  return input === stored;
}

async function hashSecret(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256$" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
