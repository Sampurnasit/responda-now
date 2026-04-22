// Classify a distress message and compute a Priority Score
// Returns: { type, severity, summary, required_skills, people_affected,
//           location_type, priority_score, priority_label, reasoning }
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

type LocationType = "hotel" | "street" | "rural" | "indoor" | "outdoor" | "transit" | "other";
type PriorityLabel = "Critical" | "High" | "Medium" | "Low";

// Weights tuned for demo realism
function computePriority(
  severity: number,
  peopleAffected: number,
  locationType: LocationType
): { score: number; label: PriorityLabel } {
  // Severity contributes up to 50 pts
  const sevPts = (Math.max(1, Math.min(5, severity)) / 5) * 50;

  // People affected: log-scaled, up to 30 pts (1 -> 0, 100+ -> 30)
  const peopleSafe = Math.max(1, peopleAffected || 1);
  const peoplePts = Math.min(30, (Math.log10(peopleSafe) / 2) * 30);

  // Location risk multiplier, up to 20 pts
  const locWeight: Record<LocationType, number> = {
    hotel: 20,    // dense, hard to evacuate
    transit: 18,  // crowds, mobility constraints
    indoor: 14,
    street: 10,
    outdoor: 8,
    rural: 6,     // slower response but lower density
    other: 8,
  };
  const locPts = locWeight[locationType] ?? 8;

  const score = Math.round(sevPts + peoplePts + locPts);

  let label: PriorityLabel;
  if (score >= 80) label = "Critical";
  else if (score >= 60) label = "High";
  else if (score >= 35) label = "Medium";
  else label = "Low";

  return { score, label };
}

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
              "You are an emergency dispatcher AI. Analyze distress messages and extract structured intelligence. Always call assess_emergency. Estimate people affected from contextual clues (e.g., 'crowd' ≈ 30, 'family' ≈ 4, no mention ≈ 1). Infer location_type from setting words (lobby/room/corridor → hotel; road/sidewalk → street; field/forest/farm → rural; mall/office → indoor; park/beach → outdoor; bus/train/airport → transit). Provide concise reasoning.",
          },
          { role: "user", content: `Distress message: "${message}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_emergency",
              description: "Assess the emergency, classify it, and extract risk factors",
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
                    description: "One short dispatcher summary (max 14 words)",
                  },
                  required_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skill tags needed (e.g. medical, fire, security, logistics)",
                  },
                  people_affected: {
                    type: "integer",
                    minimum: 1,
                    description: "Estimated number of people directly affected or at risk",
                  },
                  location_type: {
                    type: "string",
                    enum: ["hotel", "street", "rural", "indoor", "outdoor", "transit", "other"],
                    description: "Inferred setting where the incident is taking place",
                  },
                  reasoning: {
                    type: "string",
                    description: "One short sentence explaining the priority assessment (max 20 words)",
                  },
                },
                required: [
                  "type",
                  "severity",
                  "summary",
                  "required_skills",
                  "people_affected",
                  "location_type",
                  "reasoning",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assess_emergency" } },
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

    // Compute deterministic priority score from AI-extracted factors
    const { score, label } = computePriority(
      args.severity,
      args.people_affected,
      args.location_type as LocationType
    );

    const result = {
      ...args,
      priority_score: score,
      priority_label: label,
    };

    return new Response(JSON.stringify(result), {
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
