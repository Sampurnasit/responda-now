// Classify a distress message using Lovable AI Gateway
// Returns: { type, severity (1-5), summary }
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an emergency dispatcher AI. Classify distress messages quickly and accurately. Always call the classify_emergency tool.",
          },
          { role: "user", content: `Distress message: "${message}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_emergency",
              description: "Classify the emergency described in the message",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["fire", "medical", "crowd", "security", "natural", "other"],
                    description: "Category of emergency",
                  },
                  severity: {
                    type: "integer",
                    minimum: 1,
                    maximum: 5,
                    description: "1=minor, 5=life-threatening / mass-casualty",
                  },
                  summary: {
                    type: "string",
                    description: "One short sentence summary for dispatchers (max 12 words)",
                  },
                  required_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skill tags needed (e.g. medical, fire, security, logistics)",
                  },
                },
                required: ["type", "severity", "summary", "required_skills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_emergency" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-incident error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
