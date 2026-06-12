import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("public_tests")
      .select("id,test_id,name,subjects,question_count,duration,total_marks,owner_name,password,attempts_count,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((row: any) => ({ ...row, password: undefined, has_password: !!row.password }));
    return json({ rows });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}