import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Mail, MessageSquare, Monitor, Radio } from "lucide-react";

export interface AlertLog {
  id: string;
  incident_id: string;
  channel: string;
  recipient: string;
  recipient_type: string;
  message: string;
  status: string;
  created_at: string;
}

const CHANNEL_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  push: { icon: Bell, color: "hsl(var(--accent))", label: "PUSH" },
  sms: { icon: MessageSquare, color: "hsl(var(--sev-3))", label: "SMS" },
  email: { icon: Mail, color: "hsl(var(--status-en-route))", label: "EMAIL" },
  dashboard: { icon: Monitor, color: "hsl(var(--primary))", label: "DASH" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface Props {
  incidentId?: string;
  limit?: number;
  compact?: boolean;
}

export function AlertLogPanel({ incidentId, limit = 50, compact }: Props) {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const query = supabase
      .from("alert_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (incidentId) query.eq("incident_id", incidentId);

    query.then(({ data }) => {
      if (mounted) {
        setLogs((data as AlertLog[]) || []);
        setLoading(false);
      }
    });

    const channel = supabase
      .channel(`alert-logs-${incidentId ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_logs",
          ...(incidentId ? { filter: `incident_id=eq.${incidentId}` } : {}),
        },
        (payload) => {
          setLogs((prev) => [payload.new as AlertLog, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [incidentId, limit]);

  // Aggregate stats
  const counts = logs.reduce(
    (acc, l) => {
      acc[l.channel] = (acc[l.channel] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={compact ? "" : "panel flex h-full min-h-0 flex-col"}>
      {!compact && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" />
            <div>
              <div className="text-sm font-semibold">Alert Broadcast Log</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {logs.length} alerts dispatched
              </div>
            </div>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-4 gap-1.5 border-b border-border p-2.5">
          {(["push", "sms", "email", "dashboard"] as const).map((ch) => {
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            return (
              <div
                key={ch}
                className="rounded-md border border-border bg-secondary/30 px-2 py-1.5"
                style={{ borderColor: `${meta.color}30` }}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-3 w-3" style={{ color: meta.color }} />
                  <span
                    className="font-mono text-[8px] tracking-wider"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div
                  className="mt-0.5 text-base font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {counts[ch] ?? 0}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={compact ? "space-y-1.5" : "flex-1 space-y-1.5 overflow-y-auto p-2.5"}>
        {loading && (
          <div className="py-8 text-center font-mono text-[10px] text-muted-foreground">
            Loading alerts...
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="py-8 text-center font-mono text-[10px] text-muted-foreground">
            No alerts yet — trigger an SOS to fan out notifications
          </div>
        )}
        {logs.map((log) => {
          const meta = CHANNEL_META[log.channel] ?? CHANNEL_META.dashboard;
          const Icon = meta.icon;
          return (
            <div
              key={log.id}
              className="flex items-start gap-2 rounded-md border border-border bg-secondary/20 p-2 animate-fade-in"
              style={{ borderLeftColor: meta.color, borderLeftWidth: 2 }}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="rounded px-1 py-px font-mono text-[8px] font-bold tracking-wider"
                      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="truncate text-[11px] font-semibold">{log.recipient}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                    {formatTime(log.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {log.message}
                </p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "hsl(var(--sev-1))" }}
                  />
                  <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                    {log.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
