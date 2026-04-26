import { useEffect, useState, type FormEvent } from "react";
import { useIncidents, useVolunteers } from "@/hooks/useResponda";
import { supabase } from "@/integrations/supabase/client";
import { TYPE_META, SEVERITY_META, STATUS_META } from "@/lib/responda";
import { CheckCircle2, MapPin, Navigation, X } from "lucide-react";
import { toast } from "sonner";

export function VolunteerView({ initialVolunteerEmail }: { initialVolunteerEmail?: string }) {
  const { volunteers } = useVolunteers();
  const { incidents } = useIncidents();
  const [selectedVolId, setSelectedVolId] = useState<string | null>(volunteers[0]?.id ?? null);
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [newVolunteerEmail, setNewVolunteerEmail] = useState("");
  const [newVolunteerSkills, setNewVolunteerSkills] = useState("");
  const [newVolunteerLat, setNewVolunteerLat] = useState("");
  const [newVolunteerLng, setNewVolunteerLng] = useState("");
  const [savingVolunteer, setSavingVolunteer] = useState(false);

  useEffect(() => {
    if (!volunteers.length || !initialVolunteerEmail) return;
    const matched = volunteers.find(
      (v) => (v.email ?? "").toLowerCase() === initialVolunteerEmail.toLowerCase()
    );
    if (matched) setSelectedVolId(matched.id);
  }, [volunteers, initialVolunteerEmail]);

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

  async function useMyLocationForVolunteer() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewVolunteerLat(pos.coords.latitude.toFixed(6));
        setNewVolunteerLng(pos.coords.longitude.toFixed(6));
      },
      () => toast.error("Could not fetch your location")
    );
  }

  async function addVolunteer(e: FormEvent) {
    e.preventDefault();
    const name = newVolunteerName.trim();
    const email = newVolunteerEmail.trim().toLowerCase();
    if (!name) {
      toast.error("Please enter volunteer name");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    const lat = Number(newVolunteerLat);
    const lng = Number(newVolunteerLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Please enter valid latitude and longitude");
      return;
    }

    const skills = newVolunteerSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setSavingVolunteer(true);
      const { data, error } = await supabase
        .from("volunteers")
        .insert({
          name,
          email,
          lat,
          lng,
          skills,
          status: "available",
          avatar_color: `hsl(${Math.floor(Math.random() * 360)} 80% 58%)`,
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedVolId(data.id);
      setNewVolunteerName("");
      setNewVolunteerEmail("");
      setNewVolunteerSkills("");
      setNewVolunteerLat("");
      setNewVolunteerLng("");
      setShowAddVolunteer(false);
      toast.success("Volunteer added successfully");
    } catch {
      toast.error("Failed to add volunteer");
    } finally {
      setSavingVolunteer(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      {/* Profile selector */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Acting as Volunteer
          </div>
          <button
            onClick={() => setShowAddVolunteer((prev) => !prev)}
            className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            {showAddVolunteer ? "Close Form" : "Add Volunteer"}
          </button>
        </div>

        {showAddVolunteer && (
          <form onSubmit={addVolunteer} className="mb-4 space-y-3 rounded-lg border border-border/70 bg-secondary/20 p-3">
            <input
              value={newVolunteerName}
              onChange={(e) => setNewVolunteerName(e.target.value)}
              placeholder="Volunteer name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
            />
            <input
              type="email"
              value={newVolunteerEmail}
              onChange={(e) => setNewVolunteerEmail(e.target.value)}
              placeholder="Email ID"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
            />
            <input
              value={newVolunteerSkills}
              onChange={(e) => setNewVolunteerSkills(e.target.value)}
              placeholder="Skills (comma-separated, e.g. medical, fire, logistics)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="number"
                step="any"
                value={newVolunteerLat}
                onChange={(e) => setNewVolunteerLat(e.target.value)}
                placeholder="Latitude"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
              />
              <input
                type="number"
                step="any"
                value={newVolunteerLng}
                onChange={(e) => setNewVolunteerLng(e.target.value)}
                placeholder="Longitude"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useMyLocationForVolunteer}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/70"
              >
                Use My Location
              </button>
              <button
                type="submit"
                disabled={savingVolunteer}
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingVolunteer ? "Saving..." : "Save Volunteer"}
              </button>
            </div>
          </form>
        )}

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
              {v.email ? <span className="text-xs text-muted-foreground">({v.email})</span> : null}
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
