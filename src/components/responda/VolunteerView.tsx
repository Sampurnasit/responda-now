import { useState } from "react";
import { useIncidents, useVolunteers } from "@/hooks/useResponda";
import { supabase } from "@/integrations/supabase/client";
import { TYPE_META, SEVERITY_META, STATUS_META } from "@/lib/responda";
import { CheckCircle2, MapPin, Navigation, X } from "lucide-react";
import { toast } from "sonner";

export function VolunteerView() {
  const { volunteers } = useVolunteers();
  const { incidents } = useIncidents();
  const [selectedVolId, setSelectedVolId] = useState<string | null>(volunteers[0]?.id ?? null);

  // Default to first volunteer if not selected
  const me = selectedVolId
    ? volunteers.find((v) => v.id === selectedVolId)
    : volunteers[0];

  const myTasks = me
    ? incidents.filter(
        (i) => i.assigned_volunteer_id === me.id && i.status !== "resolved"
      )
    : [];

  async function setStatus(incidentId: string, newStatus: "en_route" | "resolved") {
    try {
      await supabase.from("incidents").update({ status: newStatus }).eq("id", incidentId);
      if (me) {
        if (newStatus === "en_route") {
          await supabase.from("volunteers").update({ status: "en_route" }).eq("id", me.id);
        } else if (newStatus === "resolved") {
          await supabase.from("volunteers").update({ status: "available" }).eq("id", me.id);
        }
      }
      toast.success(newStatus === "en_route" ? "On the way" : "Marked resolved");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function reject(incidentId: string) {
    try {
      await supabase
        .from("incidents")
        .update({ assigned_volunteer_id: null, status: "pending" })
        .eq("id", incidentId);
      if (me) {
        await supabase.from("volunteers").update({ status: "available" }).eq("id", me.id);
      }
      toast.message("Task returned to dispatcher");
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Profile selector */}
      <div className="panel p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Acting as Volunteer
        </div>
        <div className="flex flex-wrap gap-2">
          {volunteers.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVolId(v.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                me?.id === v.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-background"
                style={{ backgroundColor: v.avatar_color }}
              >
                {v.name[0]}
              </span>
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {me && (
        <div className="panel p-5">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-background"
              style={{ backgroundColor: me.avatar_color }}
            >
              {me.name[0]}
            </span>
            <div className="flex-1">
              <div className="text-lg font-bold">{me.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {me.skills.join(" • ")}
              </div>
            </div>
            <div
              className="rounded-md px-2.5 py-1 font-mono text-xs font-bold tracking-wider"
              style={{
                backgroundColor:
                  me.status === "available"
                    ? "hsl(var(--sev-1) / 0.2)"
                    : "hsl(var(--accent) / 0.2)",
                color:
                  me.status === "available"
                    ? "hsl(var(--sev-1))"
                    : "hsl(var(--accent))",
              }}
            >
              ● {me.status.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Assigned Tasks</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {myTasks.length} active
          </span>
        </div>

        {myTasks.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            No tasks assigned. Standing by for dispatch.
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map((t) => {
              const meta = TYPE_META[t.type] ?? TYPE_META.unknown;
              const sev = SEVERITY_META[t.severity] ?? SEVERITY_META[3];
              const stat = STATUS_META[t.status];
              return (
                <div key={t.id} className="panel animate-slide-in p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                      style={{ backgroundColor: `${sev.color}25`, border: `1px solid ${sev.color}50` }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{meta.label}</span>
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                          style={{ backgroundColor: `${sev.color}20`, color: sev.color }}
                        >
                          {sev.label}
                        </span>
                        <span
                          className="font-mono text-[9px] font-bold tracking-wider"
                          style={{ color: stat.color }}
                        >
                          ● {stat.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{t.ai_summary || t.message}</p>
                      <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {t.status === "assigned" && (
                      <>
                        <button
                          onClick={() => setStatus(t.id, "en_route")}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                        >
                          <Navigation className="h-4 w-4" /> Accept & En Route
                        </button>
                        <button
                          onClick={() => reject(t.id)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition hover:bg-secondary/70"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                      </>
                    )}
                    {t.status === "en_route" && (
                      <button
                        onClick={() => setStatus(t.id, "resolved")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--sev-1))] py-2 text-sm font-semibold text-background transition hover:opacity-90"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
