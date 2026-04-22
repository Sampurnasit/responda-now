import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents } from "@/hooks/useResponda";
import { randomNearby, TYPE_META, SEVERITY_META, STATUS_META } from "@/lib/responda";
import { AlertTriangle, Loader2, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export function UserSosView() {
  const { incidents } = useIncidents();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const myIncident = activeId ? incidents.find((i) => i.id === activeId) : null;

  async function sendSOS(text?: string) {
    const finalMsg = (text ?? message).trim();
    if (!finalMsg) {
      toast.error("Describe the emergency");
      return;
    }
    setSubmitting(true);
    try {
      const [lat, lng] = randomNearby();

      // 1. Insert pending incident
      const { data: created, error: insErr } = await supabase
        .from("incidents")
        .insert({ message: finalMsg, lat, lng, reporter_label: "Civilian #" + Math.floor(Math.random() * 999) })
        .select()
        .single();
      if (insErr) throw insErr;
      setActiveId(created.id);
      setMessage("");

      // 2. Call AI classifier
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("classify-incident", {
        body: { message: finalMsg },
      });
      if (aiErr) throw aiErr;

      // 3. Update incident with AI result + priority score
      await supabase
        .from("incidents")
        .update({
          type: aiData.type,
          severity: aiData.severity,
          ai_summary: aiData.summary,
          people_affected: aiData.people_affected,
          location_type: aiData.location_type,
          priority_score: aiData.priority_score,
          priority_label: aiData.priority_label,
        })
        .eq("id", created.id);

      toast.success("Help is on the way", { description: aiData.summary });
    } catch (e) {
      console.error(e);
      toast.error("Failed to send SOS", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setSubmitting(false);
    }
  }

  if (myIncident) {
    const meta = TYPE_META[myIncident.type] ?? TYPE_META.unknown;
    const sev = SEVERITY_META[myIncident.severity] ?? SEVERITY_META[3];
    const stat = STATUS_META[myIncident.status];

    return (
      <div className="mx-auto max-w-md p-6">
        <div className="panel scan-line relative overflow-hidden p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              SOS Active • Live
            </span>
          </div>

          <h2 className="text-2xl font-bold">Help is on the way</h2>
          <p className="mt-1 text-sm text-muted-foreground">{myIncident.ai_summary || "Analyzing situation..."}</p>

          <div className="mt-6 space-y-3">
            <Row label="Type" value={`${meta.emoji}  ${meta.label}`} />
            <Row label="Severity" value={sev.label} valueColor={sev.color} />
            <Row label="Status" value={stat.label} valueColor={stat.color} />
            <Row
              label="Location"
              value={`${myIncident.lat.toFixed(4)}, ${myIncident.lng.toFixed(4)}`}
            />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Your message
            </div>
            <p className="mt-1 text-sm">{myIncident.message}</p>
          </div>

          <button
            onClick={() => setActiveId(null)}
            className="mt-6 w-full rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70"
          >
            Send another SOS
          </button>
        </div>
      </div>
    );
  }

  const presets = [
    "There is a fire in the lobby!",
    "Someone collapsed and isn't breathing",
    "Crowd surge near the main entrance",
  ];

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="panel relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Emergency Reporting
          </div>
          <h2 className="mt-1 text-2xl font-bold">Need urgent help?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the button. Your location and message go straight to dispatchers.
          </p>

          <div className="my-8 flex justify-center">
            <button
              onClick={() => sendSOS()}
              disabled={submitting}
              className="pulse-alert relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-transform active:scale-95 disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-10 w-10" strokeWidth={2.5} />
                  <span className="mt-2 text-2xl font-extrabold tracking-widest">SOS</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Describe what's happening..."
              className="w-full resize-none rounded-lg border border-input bg-input/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => sendSOS()}
              disabled={submitting || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send distress message
            </button>

            <div className="pt-2">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Quick scenarios (demo)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendSOS(p)}
                    disabled={submitting}
                    className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left text-xs text-secondary-foreground transition hover:bg-secondary/70 disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>Location auto-attached (mock GPS)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}
