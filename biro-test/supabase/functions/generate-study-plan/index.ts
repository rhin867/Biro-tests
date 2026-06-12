import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisData, weekStartDate } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a JEE study planner AI. Based on the student's performance analysis, create a personalized weekly study plan.

RULES:
1. Focus MORE on weak areas (high mistake count, low accuracy)
2. Reduce focus on chapters with >80% accuracy
3. Include formula revision for chapters with formula mistakes
4. Balance practice vs theory (more practice for calculation errors, more theory for concept gaps)
5. Schedule revision days and test days
6. Create realistic daily targets (4-6 hours of study)

OUTPUT FORMAT (JSON ONLY):
{
  "weeklyPlan": {
    "dailyTargets": [
      {
        "day": "Monday",
        "tasks": [
          {
            "type": "revision|practice|test|formula",
            "subject": "Physics|Chemistry|Maths",
            "chapter": "Chapter name",
            "description": "What to do",
            "duration": 60,
            "priority": "high|medium|low"
          }
        ],
        "estimatedHours": 5,
        "focus": ["Physics", "Maths"]
      }
    ],
    "chapterPriority": [
      {
        "subject": "Physics",
        "chapter": "Mechanics",
        "priority": "high",
        "weaknessScore": 0.8,
        "recommendedHours": 10
      }
    ],
    "formulaRevisionList": [
      {
        "subject": "Physics",
        "chapter": "Mechanics",
        "formula": "v = u + at",
        "needsRevision": true
      }
    ],
    "practiceTheoryRatio": 0.6,
    "summary": "Brief plan overview"
  }
}`;

    const userMessage = `Create a weekly study plan starting ${weekStartDate} based on this performance data:
${JSON.stringify(analysisData, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(jsonContent.trim());

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate study plan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
