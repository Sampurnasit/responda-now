import { useMemo, useState } from "react";
import { useIncidents, useVolunteers } from "@/hooks/useResponda";
import { CrisisMap } from "./CrisisMap";
import { IncidentTimeline } from "./IncidentTimeline";
import { AlertLogPanel } from "./AlertLogPanel";
import { PredictiveChatbot } from "./PredictiveChatbot";
import {
  Incident,
  TYPE_META,
  SEVERITY_META,
  STATUS_META,
  PRIORITY_META,
  LOCATION_META,
  recommendVolunteers,
} from "@/lib/responda";
import { db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { Activity, Bell, Bot, CheckCircle2, Clock, Filter, Flame, MapPin, Radio, Search, Send, Sparkles, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { AdminAnalytics } from "./AdminAnalytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

export function AdminDashboard() {
  const { incidents } = useIncidents();
  const { volunteers } = useVolunteers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"detail" | "alerts" | "roster" | "predict">("detail");
  const [adminTab, setAdminTab] = useState<"triage" | "map" | "volunteers" | "analytics">("triage");
  
  // New States for Command Center
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const selected = selectedId ? incidents.find((i) => i.id === selectedId) ?? null : null;
  const focus = selected ? ([selected.lat, selected.lng] as [number, number]) : null;

  // Stats & Insights
  const active = incidents.filter((i) => i.status !== "resolved");
  const resolved = incidents.filter((i) => i.status === "resolved").length;
  const availableVols = volunteers.filter((v) => v.status === "available").length;
  const criticalCount = active.filter((i) => (i.priority_label === "Critical") || i.severity >= 4).length;

  const insights = useMemo(() => {
    const list = [];
    if (criticalCount > 0) list.push({ text: `${criticalCount} high priority incidents need immediate attention`, type: 'alert' });
    if (active.length > 5 && availableVols < 2) list.push({ text: "Low volunteer availability. Deploy additional responders.", type: 'warning' });
    if (active.length === 0) list.push({ text: "Operational stability confirmed. No active signals.", type: 'success' });
    return list;
  }, [criticalCount, active.length, availableVols]);

  // Filtering Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = inc.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (TYPE_META[inc.type]?.label || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || inc.type === filterType;
      const matchesPriority = filterPriority === "all" || inc.priority_label === filterPriority;
      return matchesSearch && matchesType && matchesPriority;
    }).sort((a, b) => {
      const aResolved = a.status === "resolved" ? 1 : 0;
      const bResolved = b.status === "resolved" ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return (b.priority_score ?? 0) - (a.priority_score ?? 0);
    });
  }, [incidents, searchQuery, filterType, filterPriority]);

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    toast.success(`Broadcast sent to all zones: ${broadcastMsg.substring(0, 20)}...`);
    setBroadcastMsg("");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Admin local navigation */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-card/40 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-black uppercase tracking-widest">Command Center</span>
        </div>
        <nav className="flex gap-1 rounded-lg border border-border bg-secondary/20 p-1">
          <button 
            onClick={() => setAdminTab("triage")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md ${adminTab === "triage" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
          >
            Signals
          </button>
          <button 
            onClick={() => setAdminTab("map")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md ${adminTab === "map" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
          >
            Map
          </button>
          <button 
            onClick={() => setAdminTab("volunteers")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md ${adminTab === "volunteers" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
          >
            Roster
          </button>
          <button 
            onClick={() => setAdminTab("analytics")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md ${adminTab === "analytics" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
          >
            Analytics
          </button>
        </nav>
        
        <div className="flex items-center gap-4">
           <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white font-mono text-[10px] uppercase tracking-widest gap-2">
                   <Radio className="h-3 w-3 text-primary" /> Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Zone Broadcast
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input 
                    placeholder="Enter alert message to all responders..." 
                    className="bg-white/5 border-white/10"
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                     <Button variant="secondary" className="text-xs">Zone Alpha</Button>
                     <Button variant="secondary" className="text-xs">Zone Beta</Button>
                  </div>
                  <Button onClick={handleBroadcast} className="w-full bg-primary hover:bg-primary/90 font-bold uppercase tracking-widest text-[10px]">
                    <Send className="mr-2 h-3 w-3" /> Transmit Alert
                  </Button>
                </div>
              </DialogContent>
           </Dialog>

           <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
             <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
             OPS CHANNEL ACTIVE
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {adminTab === "triage" && (
          <div className="grid h-full grid-cols-12 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* LEFT: incident list */}
            <aside className="col-span-3 flex min-h-0 flex-col gap-3">
              <StatGrid active={active.length} critical={criticalCount} resolved={resolved} vols={availableVols} />
              
              {/* Proactive AI Insights Panel */}
              <div className="panel p-3 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                   <Sparkles className="h-3 w-3" /> Tactical Insights
                </div>
                <div className="space-y-2">
                   {insights.map((ins, i) => (
                     <div key={i} className="flex items-start gap-2 text-[10px] leading-tight text-white/80">
                        <div className={`mt-1 h-1 w-1 rounded-full shrink-0 ${ins.type === 'alert' ? 'bg-red-500' : ins.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        {ins.text}
                     </div>
                   ))}
                </div>
              </div>

              <div className="panel flex min-h-0 flex-1 flex-col">
                {/* Search & Filters */}
                <div className="p-3 border-b border-border space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input 
                      placeholder="Search signals..." 
                      className="pl-8 h-8 text-[11px] bg-white/5 border-white/10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 h-7 bg-white/5 border border-white/10 rounded-md text-[10px] uppercase font-bold px-2 outline-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      {Object.entries(TYPE_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <select 
                      className="flex-1 h-7 bg-white/5 border border-white/10 rounded-md text-[10px] uppercase font-bold px-2 outline-none"
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <option value="all">All Priority</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {filteredIncidents.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">No matching signals</div>
                  )}
                  {filteredIncidents.map((inc) => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      selected={inc.id === selectedId}
                      onClick={() => setSelectedId(inc.id)}
                    />
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER: map */}
            <main className="col-span-6 min-h-0">
              <CrisisMap
                incidents={incidents}
                volunteers={volunteers}
                focus={focus}
                onIncidentClick={(i) => setSelectedId(i.id)}
              />
            </main>

            {/* RIGHT: detail panel */}
            <aside className="col-span-3 flex min-h-0 flex-col gap-2">
              <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 font-mono text-[10px] uppercase tracking-widest">
                <TabBtn active={rightTab === "detail"} onClick={() => setRightTab("detail")}>
                  <Sparkles className="h-3 w-3" /> Detail
                </TabBtn>
                <TabBtn active={rightTab === "predict"} onClick={() => setRightTab("predict")}>
                  <Bot className="h-3 w-3" /> AI Bot
                </TabBtn>
              </div>
              <div className="min-h-0 flex-1">
                {rightTab === "detail" && (selected ? <IncidentDetail incident={selected} /> : <EmptyDetailHint />)}
                {rightTab === "predict" && <PredictiveChatbot incidents={incidents} />}
              </div>
            </aside>
          </div>
        )}

        {adminTab === "map" && (
          <div className="h-full rounded-2xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
            <CrisisMap
              incidents={incidents}
              volunteers={volunteers}
              focus={focus}
              onIncidentClick={(i) => {
                setSelectedId(i.id);
                setAdminTab("triage");
              }}
            />
          </div>
        )}

        {adminTab === "volunteers" && (
          <div className="h-full max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <VolunteersPanel />
          </div>
        )}

        {adminTab === "analytics" && (
          <div className="h-full overflow-y-auto">
            <AdminAnalytics />
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 transition ${
        active
          ? "bg-accent/15 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.2)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyDetailHint() {
  return (
    <div className="panel flex h-full items-center justify-center p-6 text-center">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Select an incident from the list to view details
      </div>
    </div>
  );
}

function StatGrid({
  active,
  critical,
  resolved,
  vols,
}: {
  active: number;
  critical: number;
  resolved: number;
  vols: number;
}) {
  const items = [
    { label: "Active", value: active, color: "hsl(var(--sev-3))", icon: Zap },
    { label: "Critical", value: critical, color: "hsl(var(--sev-5))", icon: Sparkles },
    { label: "Resolved", value: resolved, color: "hsl(var(--sev-1))", icon: CheckCircle2 },
    { label: "Vols Free", value: vols, color: "hsl(var(--accent))", icon: Users },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <div key={it.label} className="panel p-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {it.label}
            </div>
            <it.icon className="h-3 w-3" style={{ color: it.color }} />
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: it.color }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentCard({
  incident,
  selected,
  onClick,
}: {
  incident: Incident;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = TYPE_META[incident.type] ?? TYPE_META.unknown;
  const sev = SEVERITY_META[incident.severity] ?? SEVERITY_META[3];
  const stat = STATUS_META[incident.status];
  const ago = timeAgo(incident.created_at);

  return (
    <button
      onClick={onClick}
      className={`mb-2 w-full animate-fade-in rounded-lg border p-3 text-left transition-all ${
        selected
          ? "border-accent bg-accent/5 shadow-[0_0_18px_hsl(var(--accent)/0.25)]"
          : "border-border bg-secondary/30 hover:border-border hover:bg-secondary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className="text-sm font-semibold">{meta.label}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{ago}</div>
          </div>
        </div>
        {incident.priority_label ? (
          <PriorityBadge label={incident.priority_label} score={incident.priority_score} />
        ) : (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider"
            style={{ backgroundColor: `${sev.color}20`, color: sev.color }}
          >
            {sev.label}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {incident.ai_summary || incident.message}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="font-mono text-[9px] font-bold tracking-wider"
          style={{ color: stat.color }}
        >
          ● {stat.label}
        </span>
        <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" />
          {incident.lat.toFixed(3)}, {incident.lng.toFixed(3)}
        </span>
      </div>
    </button>
  );
}

function PriorityBadge({
  label,
  score,
  size = "sm",
}: {
  label: NonNullable<Incident["priority_label"]>;
  score?: number | null;
  size?: "sm" | "lg";
}) {
  const meta = PRIORITY_META[label];
  const isLg = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-bold uppercase tracking-wider ${
        isLg ? "px-2 py-1 text-[10px]" : "px-1.5 py-0.5 text-[9px]"
      } ${label === "Critical" ? "pulse-alert" : ""}`}
      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}55` }}
    >
      <Flame className={isLg ? "h-3 w-3" : "h-2.5 w-2.5"} />
      {label}
      {score != null && <span className="opacity-70">· {score}</span>}
    </span>
  );
}

function IncidentDetail({ incident }: { incident: Incident }) {
  const { volunteers } = useVolunteers();
  const meta = TYPE_META[incident.type] ?? TYPE_META.unknown;
  const sev = SEVERITY_META[incident.severity] ?? SEVERITY_META[3];
  const stat = STATUS_META[incident.status];
  const recommendations = useMemo(
    () => recommendVolunteers(incident, volunteers),
    [incident, volunteers]
  );

  const assigned = incident.assigned_volunteer_id
    ? volunteers.find((v) => v.id === incident.assigned_volunteer_id)
    : null;

  async function assign(volId: string) {
    try {
      await updateDoc(doc(db, "incidents", incident.id), {
        assigned_volunteer_id: volId,
        status: "assigned"
      });
      await updateDoc(doc(db, "volunteers", volId), {
        status: "assigned"
      });
      toast.success("Volunteer dispatched");
    } catch (e) {
      toast.error("Failed to assign");
    }
  }

  async function resolve() {
    try {
      await updateDoc(doc(db, "incidents", incident.id), {
        status: "resolved"
      });
      if (incident.assigned_volunteer_id) {
        await updateDoc(doc(db, "volunteers", incident.assigned_volunteer_id), {
          status: "available"
        });
      }
      toast.success("Incident resolved");
    } catch {
      toast.error("Failed to resolve");
    }
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
            style={{ backgroundColor: `${sev.color}25`, border: `1px solid ${sev.color}50` }}
          >
            {meta.emoji}
          </div>
          <div>
            <div className="text-base font-bold">{meta.label} Incident</div>
            <div className="flex gap-2 font-mono text-[10px]">
              <span style={{ color: sev.color }}>SEV {incident.severity} • {sev.label}</span>
              <span className="text-muted-foreground">•</span>
              <span style={{ color: stat.color }}>{stat.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {incident.priority_label && (
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: `${PRIORITY_META[incident.priority_label].color}55`,
              background: PRIORITY_META[incident.priority_label].bg,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Flame className="h-3 w-3" /> Priority Assessment
              </div>
              <PriorityBadge
                label={incident.priority_label}
                score={incident.priority_score}
                size="lg"
              />
            </div>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${incident.priority_score ?? 0}%`,
                  backgroundColor: PRIORITY_META[incident.priority_label].color,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <FactorChip
                label="Severity"
                value={`${incident.severity}/5`}
                color="hsl(var(--sev-4))"
              />
              <FactorChip
                label="People"
                value={incident.people_affected ? `~${incident.people_affected}` : "—"}
                color="hsl(var(--accent))"
              />
              <FactorChip
                label="Setting"
                value={
                  incident.location_type
                    ? `${LOCATION_META[incident.location_type].emoji} ${LOCATION_META[incident.location_type].label}`
                    : "—"
                }
                color="hsl(var(--status-en-route))"
              />
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3" /> AI Summary
          </div>
          <p className="text-sm">{incident.ai_summary || "Analyzing..."}</p>
        </div>

        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Reporter Message
          </div>
          <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm italic">
            "{incident.message}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Reporter" value={incident.reporter_label} />
          <Field
            label="Time"
            value={timeAgo(incident.created_at)}
            icon={<Clock className="h-3 w-3" />}
          />
          <Field
            label="Lat"
            value={incident.lat.toFixed(4)}
            mono
          />
          <Field label="Lng" value={incident.lng.toFixed(4)} mono />
        </div>

        {assigned && (
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">
              Assigned Responder
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-background"
                style={{ backgroundColor: assigned.avatar_color }}
              >
                {assigned.name[0]}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{assigned.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {assigned.skills.join(" • ")}
                </div>
              </div>
              <span
                className="font-mono text-[9px] font-bold tracking-wider"
                style={{ color: "hsl(var(--accent))" }}
              >
                ● {assigned.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {incident.status !== "resolved" && !assigned && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" /> Recommended Responders
            </div>
            <div className="space-y-2">
              {recommendations.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-background"
                    style={{ backgroundColor: v.avatar_color }}
                  >
                    {v.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {v.name}
                      {idx === 0 && (
                        <span className="rounded bg-accent/20 px-1 font-mono text-[8px] text-accent">
                          BEST
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {v.distance.toFixed(2)}km •{" "}
                      {v.matchedSkills.length > 0
                        ? v.matchedSkills.join(",")
                        : v.skills.slice(0, 2).join(",")}
                    </div>
                  </div>
                  <button
                    onClick={() => assign(v.id)}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Assign
                  </button>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No available volunteers
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Activity className="h-3 w-3" /> Incident Timeline & Audit Trail
          </div>
          <IncidentTimeline incidentId={incident.id} />
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Radio className="h-3 w-3" /> Alerts Dispatched
          </div>
          <AlertLogPanel incidentId={incident.id} compact limit={20} />
        </div>
      </div>

      {incident.status !== "resolved" && (
        <div className="border-t border-border p-3">
          <button
            onClick={resolve}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--sev-1))] py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Resolved
          </button>
        </div>
      )}
    </div>
  );
}

function VolunteersPanel() {
  const { volunteers } = useVolunteers();
  const [isAdding, setIsAdding] = useState(false);
  const [newVol, setNewVol] = useState({
    name: "",
    skills: "",
    address: "",
    lat: 22.57,
    lng: 88.36
  });

  async function handleAdd() {
    if (!newVol.name) return;
    try {
      await addDoc(collection(db, "volunteers"), {
        ...newVol,
        skills: newVol.skills.split(",").map(s => s.trim()),
        status: "available",
        avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        last_active: new Date().toISOString()
      });
      toast.success("Volunteer added to roster");
      setIsAdding(false);
      setNewVol({ name: "", skills: "", address: "", lat: 22.57, lng: 88.36 });
    } catch (e) {
      toast.error("Failed to add volunteer");
    }
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Volunteer Roster</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {volunteers.length} active responders
          </div>
        </div>
        
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground font-bold text-[10px] uppercase tracking-widest">
              + Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-widest">Enroll New Volunteer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</label>
                <Input 
                  value={newVol.name}
                  onChange={e => setNewVol({...newVol, name: e.target.value})}
                  className="bg-white/5 border-white/10"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Physical Address</label>
                <Input 
                  value={newVol.address}
                  onChange={e => setNewVol({...newVol, address: e.target.value})}
                  className="bg-white/5 border-white/10"
                  placeholder="123 Rescue St, Sector 4"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Skills (comma separated)</label>
                <Input 
                  value={newVol.skills}
                  onChange={e => setNewVol({...newVol, skills: e.target.value})}
                  className="bg-white/5 border-white/10"
                  placeholder="Medical, Search & Rescue, Fire"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Latitude</label>
                  <Input 
                    type="number"
                    value={newVol.lat}
                    onChange={e => setNewVol({...newVol, lat: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Longitude</label>
                  <Input 
                    type="number"
                    value={newVol.lng}
                    onChange={e => setNewVol({...newVol, lng: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest text-[10px] h-12">
                Authorize & Enroll
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {volunteers.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-background ${
                v.status === "available" ? "pulse-cyan" : ""
              }`}
              style={{ backgroundColor: v.avatar_color }}
            >
              {v.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{v.name}</div>
              <div className="font-mono text-[9px] text-muted-foreground truncate opacity-70">
                {v.address || "No address provided"}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {v.skills.join(" • ")}
              </div>
            </div>
            <span
              className="font-mono text-[9px] font-bold tracking-wider"
              style={{
                color:
                  v.status === "available"
                    ? "hsl(var(--sev-1))"
                    : v.status === "en_route"
                    ? "hsl(var(--accent))"
                    : "hsl(var(--status-assigned))",
              }}
            >
              ● {v.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-center gap-1 ${mono ? "font-mono" : ""}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function FactorChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-md border bg-background/40 px-1.5 py-1"
      style={{ borderColor: `${color}40` }}
    >
      <div
        className="font-mono text-[8px] uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold">{value}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
