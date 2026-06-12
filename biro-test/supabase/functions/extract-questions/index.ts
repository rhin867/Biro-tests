import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a fast question paper parser for JEE Main/Advanced exams. Extract ALL questions from the document into JSON.

RULES:
1. Extract EVERY question - even without numbering, detect by A/B/C/D option pattern.
2. Use LaTeX for ALL math: √x→$\\sqrt{x}$, x²→$x^2$, ∫→$\\int$, Σ→$\\sum$, fractions→$\\frac{a}{b}$
3. Detect Subject (Physics/Chemistry/Maths) and Chapter.
4. Detect question type: MCQ (4 options), MSQ (multiple correct), Numerical (integer/decimal answer).
5. 4 options per MCQ (A,B,C,D). Set hasDiagram:true if image/diagram/graph/figure/circuit is referenced.
6. Detect correct answer if visible in the document, else null.
7. Skip ALL headers, footers, instructions, watermarks, page numbers.
8. For scanned/image PDFs: perform OCR, preserve mathematical symbols.
9. Handle pages with 15-30 questions efficiently.

OUTPUT (STRICT JSON, NO MARKDOWN):
{"examTitle":"Title","questions":[{"id":1,"question":"text with $LaTeX$","options":["A","B","C","D"],"correctAnswer":"A","subject":"Physics","chapter":"Mechanics","type":"MCQ","hasDiagram":false,"pageNumber":1}],"totalExtracted":75,"subjectCounts":{"Physics":25}}`;

const answerKeyPrompt = `You are an answer key extractor. Extract the answer key from this document.
Return STRICT JSON only, no markdown. Format:
{"answerKey":{"1":"A","2":"B","3":"C"}}
Map question numbers to their correct option letter (A/B/C/D).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfBase64, mimeType, extractAnswerKeyOnly, totalQuestions, userApiKey } = await req.json();
    
    if (!pdfText && !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF text or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI gateway (preferred) or fall back to user API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useGateway = !!LOVABLE_API_KEY;

    if (!useGateway && !userApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not available. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptContent = extractAnswerKeyOnly
      ? `${answerKeyPrompt}\nExtract answers for up to ${totalQuestions || 75} questions.`
      : systemPrompt;

    let content: string;

    if (useGateway) {
      // Use Lovable AI Gateway (OpenAI-compatible)
      content = await callLovableAI(LOVABLE_API_KEY!, promptContent, pdfText, pdfBase64, mimeType);
    } else {
      // Fallback to user's Gemini API key
      content = await callGeminiDirect(userApiKey, promptContent, pdfText, pdfBase64, mimeType);
    }

    if (!content) {
      throw new Error("No response from AI. The PDF may be too complex or empty.");
    }

    // Parse JSON response
    let parsed = parseJsonResponse(content);

    if (extractAnswerKeyOnly) {
      return new Response(
        JSON.stringify({ answerKey: parsed.answerKey || parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transformedQuestions = (parsed.questions || []).map((q: any, index: number) => ({
      questionNumber: Number(q.questionNumber || q.id || index + 1),
      subject: q.subject || "Physics",
      chapter: q.chapter || "General",
      question: q.question || q.text || "",
      options: Array.isArray(q.options) 
        ? { A: q.options[0] || "", B: q.options[1] || "", C: q.options[2] || "", D: q.options[3] || "" }
        : q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: q.correctAnswer || q.answer || null,
      type: q.type || "MCQ",
      hasDiagram: q.hasDiagram || false,
      pdfPageNumber: q.pageNumber || null
    }));

    console.log(`Successfully extracted ${transformedQuestions.length} questions`);

    return new Response(
      JSON.stringify({
        examTitle: parsed.examTitle || "Extracted Test",
        questions: transformedQuestions,
        totalExtracted: transformedQuestions.length,
        subjectCounts: parsed.subjectCounts || {}
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract questions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const status = errorMessage.includes("Rate limit") ? 429 : 
                   errorMessage.includes("Payment") ? 402 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage, retryable: status === 429 }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function callLovableAI(apiKey: string, systemPrompt: string, pdfText?: string, pdfBase64?: string, mimeType?: string): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt + "\n\nReturn STRICT JSON only, no markdown." }
  ];

  if (pdfBase64) {
    const isPdf = (mimeType || 'application/pdf').includes('pdf');
    const dataUrl = `data:${mimeType || 'application/pdf'};base64,${pdfBase64}`;
    messages.push({
      role: "user",
      content: [
        { type: "text", text: isPdf ? "Extract ALL questions from this document. Return STRICT JSON only." : "Extract ALL questions from this image. Return STRICT JSON only." },
        // Many OpenAI compatible gateways fail on type: "document", so we treat PDFs as files via image_url (OpenRouter standard for some providers)
        // or just pass the dataUrl. If this fails, user must provide their own Gemini API key.
        { type: "image_url", image_url: { url: dataUrl } }
      ]
    });
  } else if (pdfText) {
    messages.push({
      role: "user",
      content: "Extract ALL questions from this text. Return STRICT JSON only.\n\n" + pdfText
    });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages,
      temperature: 0.05,
      max_tokens: 65536,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (response.status === 402) throw new Error("Payment required. Please add credits to your workspace.");
    const errText = await response.text();
    console.error("Lovable AI error:", response.status, errText.substring(0, 300));
    throw new Error(`AI gateway error (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGeminiDirect(apiKey: string, promptContent: string, pdfText?: string, pdfBase64?: string, mimeType?: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  const parts: any[] = [
    { text: promptContent + "\n\nExtract ALL questions. Return STRICT JSON only, no markdown." }
  ];

  if (pdfBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'application/pdf', data: pdfBase64 } });
  } else if (pdfText) {
    parts[0].text += "\n\n" + pdfText;
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { temperature: 0.05, maxOutputTokens: 65536 }
  });

  for (const model of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body });
        if (res.ok) {
          const data = await res.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (content) return content;
        }
        if (res.status === 400) {
          const errText = await res.text();
          if (errText.includes("API_KEY") || errText.includes("API key")) {
            throw new Error("Invalid API key. Check your Gemini API key in Settings.");
          }
        }
        if (res.status !== 503 && res.status !== 429) break;
      } catch (e) {
        if (e instanceof Error && e.message.includes("API key")) throw e;
        continue;
      }
    }
  }
  throw new Error("All AI models busy. Please try again in 30 seconds.");
}

function parseJsonResponse(content: string): any {
  let jsonContent = content;
  if (content.includes("```json")) {
    jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (content.includes("```")) {
    jsonContent = content.replace(/```\n?/g, "");
  }

  try {
    return JSON.parse(jsonContent.trim());
  } catch {
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    throw new Error("Failed to parse AI response. Try again or use a different PDF.");
  }
}
