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
    const { wrongQuestions, subject, chapter } = await req.json();
    
    if (!wrongQuestions || wrongQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert JEE question generator. Based on the topics where the student made mistakes, generate similar practice questions to help them improve.

RULES:
1. Generate questions similar in difficulty and topic to the provided wrong questions
2. Use valid LaTeX for all math: $x^2$, $\\frac{1}{2}$, $\\int_0^1 x dx$
3. Provide exactly 4 options (A, B, C, D)
4. Always include the correct answer
5. Questions should test similar concepts but with different numbers/scenarios

OUTPUT FORMAT (STRICT JSON, NO MARKDOWN):
{
  "questions": [
    {
      "question": "Question text with LaTeX $E = mc^2$",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "subject": "Physics",
      "chapter": "Mechanics",
      "explanation": "Brief explanation of the answer"
    }
  ]
}`;

    const userPrompt = `Generate 3-5 practice questions similar to these wrong questions from ${subject} - ${chapter}:

${wrongQuestions.map((q: any, i: number) => `
Question ${i + 1}: ${q.question}
Correct Answer: ${q.correctAnswer}
`).join('\n')}

Generate new questions testing similar concepts.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse generated questions");
    }

    return new Response(
      JSON.stringify({
        questions: parsed.questions || [],
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate practice questions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
