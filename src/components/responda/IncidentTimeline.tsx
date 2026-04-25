import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type AuditEntry = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  event_type: string;
  actor: string;
  actionSummary: string;
};

const EVENT_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  sos_triggered: { icon: AlertTriangle, color: "hsl(var(--sev-5))" },
  ai_classified: { icon: Sparkles, color: "hsl(var(--accent))" },
  volunteer_assigned: { icon: UserCheck, color: "hsl(var(--status-assigned))" },
  volunteer_rejected: { icon: UserX, color: "hsl(var(--sev-4))" },
  status_en_route: { icon: Navigation, color: "hsl(var(--status-en-route))" },
  status_resolved: { icon: CheckCircle2, color: "hsl(var(--sev-1))" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelative(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function actorFromMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "System";
  const actorName = metadata["actor_name"];
  const responderName = metadata["responder_name"];
  const volunteerName = metadata["volunteer_name"];
  const actorRole = metadata["actor_role"];

  if (typeof actorName === "string" && actorName.length > 0) return actorName;
  if (typeof responderName === "string" && responderName.length > 0) return responderName;
  if (typeof volunteerName === "string" && volunteerName.length > 0) return volunteerName;
  if (typeof actorRole === "string" && actorRole.length > 0) return actorRole;
  return "System";
}

function actionFromEvent(event: IncidentEvent): string {
  const metadata = event.metadata ?? {};
  const directAction = metadata["action"];
  if (typeof directAction === "string" && directAction.length > 0) return directAction;
  if (event.description) return event.description;
  return event.title;
}

function buildMockAuditTrail(incidentId: string): AuditEntry[] {
  const now = Date.now();
  const seed = incidentId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 9;
  return [
    {
      id: `${incidentId}-mock-1`,
      event_type: "sos_triggered",
      title: "SOS Triggered",
      description: "Citizen reported smoke and panic near the main street.",
      created_at: new Date(now - (42 + seed) * 60 * 1000).toISOString(),
      actor: "Citizen Reporter",
      actionSummary: "Created emergency incident report",
    },
    {
      id: `${incidentId}-mock-2`,
      event_type: "ai_classified",
      title: "AI Classified Priority",
      description: "Priority elevated after crowd and severity analysis.",
      created_at: new Date(now - (36 + seed) * 60 * 1000).toISOString(),
      actor: "AI Dispatcher",
      actionSummary: "Set risk level and recommended response",
    },
    {
      id: `${incidentId}-mock-3`,
      event_type: "volunteer_assigned",
      title: "Responder Assigned",
      description: "Nearest trained volunteer was dispatched.",
      created_at: new Date(now - (28 + seed) * 60 * 1000).toISOString(),
      actor: "Control Room Operator",
      actionSummary: "Assigned first responder to incident",
    },
    {
      id: `${incidentId}-mock-4`,
      event_type: "status_en_route",
      title: "Responder En Route",
      description: "Responder confirmed movement to the location.",
      created_at: new Date(now - (17 + seed) * 60 * 1000).toISOString(),
      actor: "Responder Team Alpha",
      actionSummary: "Shared live movement update",
    },
  ];
}

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("incident_events")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (mounted) {
          const liveEvents = ((data as IncidentEvent[]) || []).map((event) => ({
            ...event,
            actor: actorFromMetadata(event.metadata),
            actionSummary: actionFromEvent(event),
          }));
          setEvents(liveEvents.length > 0 ? liveEvents : buildMockAuditTrail(incidentId));
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`incident-events-${incidentId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incident_events",
          filter: `incident_id=eq.${incidentId}`,
        },
        (payload) => {
          const event = payload.new as IncidentEvent;
          setEvents((prev) => [
            ...prev,
            {
              ...event,
              actor: actorFromMetadata(event.metadata),
              actionSummary: actionFromEvent(event),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="py-2 text-center font-mono text-[10px] text-muted-foreground">
        Loading timeline...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-2 text-center font-mono text-[10px] text-muted-foreground">
        No events yet
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      {events.map((event, idx) => {
        const meta = EVENT_META[event.event_type] ?? {
          icon: Activity,
          color: "hsl(var(--muted-foreground))",
        };
        const Icon = meta.icon;
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 animate-fade-in">
            {/* Connector line */}
            {!isLast && (
              <span
                className="absolute left-[14px] top-8 h-[calc(100%-8px)] w-px"
                style={{ backgroundColor: "hsl(var(--border))" }}
                aria-hidden
              />
            )}
            {/* Icon node */}
            <span
              className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
              style={{
                backgroundColor: `${meta.color}15`,
                borderColor: `${meta.color}60`,
                color: meta.color,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {/* Content */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: meta.color }}>
                  {event.title}
                </div>
                <div
                  className="shrink-0 font-mono text-[9px] tracking-wider text-muted-foreground"
                  title={new Date(event.created_at).toLocaleString()}
                >
                  {formatTime(event.created_at)}
                </div>
              </div>
              {event.description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {event.description}
                </p>
              )}
              <div className="mt-1 grid grid-cols-1 gap-0.5 rounded border border-border bg-secondary/25 p-1.5 text-[10px]">
                <div>
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">Who:</span>{" "}
                  <span className="font-medium">{event.actor}</span>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">What:</span>{" "}
                  <span>{event.actionSummary}</span>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">When:</span>{" "}
                  <span>{new Date(event.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                {formatRelative(event.created_at)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
