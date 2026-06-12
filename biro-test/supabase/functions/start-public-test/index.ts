import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { id, password } = await req.json();
    if (typeof id !== "string") return json({ error: "Missing test id" }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row, error } = await supabase.from("public_tests").select("id,test_data,password,attempts_count").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!row) return json({ error: "Test not found" }, 404);
    if (row.password && !(await verifySecret(String(password || ""), row.password))) return json({ error: "Incorrect password" }, 401);
    await supabase.from("public_tests").update({ attempts_count: Number(row.attempts_count || 0) + 1 }).eq("id", row.id);
    return json({ ok: true, test: row.test_data });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

async function verifySecret(input: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("sha256$")) return input === stored;
  return stored === await hashSecret(input);
}

async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return "sha256$" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}