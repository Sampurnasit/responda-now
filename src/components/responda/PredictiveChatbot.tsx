import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, Bot, Send, User } from "lucide-react";
import { Incident, TYPE_META } from "@/lib/responda";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  createdAt: string;
};

type AlertLevel = "LOW" | "MEDIUM" | "HIGH";

const MOCK_HOURLY_BASELINE = {
  fire: 1.2,
  medical: 1.4,
  crowd: 0.8,
  security: 1.0,
  natural: 0.4,
  other: 0.6,
  unknown: 0.5,
} satisfies Record<Incident["type"], number>;

function timeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function estimateNextHour(incidents: Incident[]) {
  const active = incidents.filter((i) => i.status !== "resolved");
  const byType = active.reduce<Record<Incident["type"], number>>(
    (acc, i) => {
      acc[i.type] += 1;
      return acc;
    },
    { fire: 0, medical: 0, crowd: 0, security: 0, natural: 0, other: 0, unknown: 0 }
  );

  const weightedSeverity =
    active.length > 0 ? active.reduce((sum, item) => sum + item.severity, 0) / active.length : 2.5;
  const severityMultiplier = 0.8 + weightedSeverity / 5;

  const typeForecast = Object.entries(byType).map(([type, liveCount]) => {
    const key = type as Incident["type"];
    const baseline = MOCK_HOURLY_BASELINE[key];
    const projected = Math.max(0, Math.round((baseline + liveCount * 0.9) * severityMultiplier));
    return { type: key, projected };
  });

  const total = typeForecast.reduce((sum, x) => sum + x.projected, 0);
  const top = [...typeForecast].sort((a, b) => b.projected - a.projected).slice(0, 3);

  const hotspotByCluster = active.reduce<Record<string, number>>((acc, i) => {
    const cell = `${i.lat.toFixed(2)},${i.lng.toFixed(2)}`;
    acc[cell] = (acc[cell] ?? 0) + 1;
    return acc;
  }, {});
  const hotspot = Object.entries(hotspotByCluster).sort((a, b) => b[1] - a[1])[0];

  const criticalNow = active.filter((i) => i.severity >= 4).length;
  const projectedCritical = Math.max(0, Math.round(criticalNow * 0.8 + total * 0.22));

  let alertLevel: AlertLevel = "LOW";
  if (total >= 12 || projectedCritical >= 4) {
    alertLevel = "HIGH";
  } else if (total >= 7 || projectedCritical >= 2) {
    alertLevel = "MEDIUM";
  }

  return { total, top, hotspot, projectedCritical, alertLevel };
}

function getAlertColor(level: AlertLevel): string {
  if (level === "HIGH") return "hsl(var(--sev-5))";
  if (level === "MEDIUM") return "hsl(var(--sev-3))";
  return "hsl(var(--sev-1))";
}

function buildForecastReply(question: string, incidents: Incident[]): string {
  const lower = question.toLowerCase();
  const forecast = estimateNextHour(incidents);
  const topKinds = forecast.top
    .map((x) => `${TYPE_META[x.type]?.label ?? x.type} (${x.projected})`)
    .join(", ");
  const hotspotText = forecast.hotspot
    ? `${forecast.hotspot[0]} with ${forecast.hotspot[1]} active patterns`
    : "no dominant hotspot detected";

  if (lower.includes("where") || lower.includes("zone") || lower.includes("hotspot")) {
    return `Predicted hotspot for the next 1 hour: ${hotspotText}. I recommend pre-positioning responders near that cluster and watching adjacent blocks.`;
  }

  if (lower.includes("type") || lower.includes("what kind")) {
    return `Expected incident mix in next 1 hour: ${topKinds}. These are estimated from current active density and mock historical baselines.`;
  }

  if (lower.includes("critical") || lower.includes("high risk")) {
    const criticalNow = incidents.filter((i) => i.status !== "resolved" && i.severity >= 4).length;
    const projectedCritical = Math.max(1, Math.round(criticalNow * 0.8 + 2));
    return `Projected high-risk incidents in the next 1 hour: ~${projectedCritical}. Prioritize fire/medical readiness and keep at least 2 responders on standby.`;
  }

  return `Next 1-hour estimate: about ${forecast.total} potential incidents. Most likely categories: ${topKinds}. Highest concentration: ${hotspotText}.`;
}

export function PredictiveChatbot({ incidents }: { incidents: Incident[] }) {
  const [input, setInput] = useState("");
  const forecast = useMemo(() => estimateNextHour(incidents), [incidents]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "bot-welcome",
      role: "bot",
      createdAt: timeLabel(),
      text: `Predictive bot online. For the next 1 hour, I estimate around ${forecast.total} potential incidents. Ask me "where", "high risk", or "incident types".`,
    },
  ]);

  useEffect(() => {
    const hotspotText = forecast.hotspot
      ? `${forecast.hotspot[0]} (${forecast.hotspot[1]} live patterns)`
      : "no dominant hotspot";
    const topKinds = forecast.top
      .slice(0, 2)
      .map((x) => `${TYPE_META[x.type]?.label ?? x.type} (${x.projected})`)
      .join(", ");
    const alertText = `PRE-ALERT (T-60m): ${forecast.alertLevel} risk. Forecast ${forecast.total} incidents; likely ${topKinds}; hotspot ${hotspotText}.`;

    setMessages((prev) => {
      if (prev[prev.length - 1]?.text === alertText) return prev;
      return [
        ...prev,
        {
          id: `auto-${Date.now()}`,
          role: "bot",
          text: alertText,
          createdAt: timeLabel(),
        },
      ];
    });
  }, [forecast.alertLevel, forecast.hotspot, forecast.total, forecast.top]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question,
      createdAt: timeLabel(),
    };

    const botMessage: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      role: "bot",
      text: buildForecastReply(question, incidents),
      createdAt: timeLabel(),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Bot className="h-3.5 w-3.5" />
          </span>
          Predictive Chatbot (1h Forecast)
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Pre-accident estimation based on live + mock trends
        </div>
        <div
          className="mt-2 rounded-md border px-2.5 py-2 text-xs"
          style={{
            borderColor: `${getAlertColor(forecast.alertLevel)}66`,
            backgroundColor: `${getAlertColor(forecast.alertLevel)}18`,
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: getAlertColor(forecast.alertLevel) }}>
            <BellRing className="h-3.5 w-3.5" />
            1-Hour Pre-incident Alert: {forecast.alertLevel}
          </div>
          <div className="mt-1 text-muted-foreground">
            Estimated incidents: {forecast.total} • Projected critical: {forecast.projectedCritical}
          </div>
          <div className="mt-1 text-muted-foreground">
            Recommended: keep responders ready near predicted hotspot.
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "bot" && (
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={`max-w-[85%] rounded-lg border px-3 py-2 text-xs ${
                m.role === "user"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-secondary/40 text-foreground"
              }`}
            >
              <p>{m.text}</p>
              <div className="mt-1 font-mono text-[9px] text-muted-foreground">{m.createdAt}</div>
            </div>
            {m.role === "user" && (
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                <User className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-3">
        <div className="mb-2 rounded-md border border-border/70 bg-secondary/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Auto-alert cadence: every data change (T-60m forecast refresh)
          </div>
          <div className="mt-0.5">
            The chatbot automatically posts a fresh pre-incident alert whenever live incident patterns change.
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask: estimate next hour risk..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs outline-none ring-accent/40 placeholder:text-muted-foreground focus:ring-2"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" />
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
