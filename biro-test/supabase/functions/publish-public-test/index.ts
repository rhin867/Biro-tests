import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { test, ownerName, password } = await req.json();
    if (!test?.id || !test?.name || !Array.isArray(test?.questions)) return json({ error: "Invalid test data" }, 400);
    const safeTest = stripLargeImages(test);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.from("public_tests").insert({
      test_id: String(test.id),
      name: String(test.name).slice(0, 240),
      subjects: Array.isArray(test.subjects) ? test.subjects : [],
      question_count: test.questions.length,
      duration: Number(test.duration || 180),
      total_marks: Number(test.totalMarks || 0),
      test_data: safeTest,
      owner_name: typeof ownerName === "string" ? ownerName.slice(0, 80) : "Anonymous",
      password: typeof password === "string" && password.trim() ? await hashSecret(password.trim()) : null,
      attempts_count: 0,
    }).select("id").single();
    if (error) throw error;
    return json({ ok: true, id: data?.id });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
});

function stripLargeImages(test: any) {
  const { pdfPageImages, ...rest } = test;
  return { ...rest, questions: (test.questions || []).map((q: any) => ({ ...q })) };
}

async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return "sha256$" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}