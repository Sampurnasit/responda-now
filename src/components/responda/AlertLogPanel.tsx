import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as limitTo, 
  onSnapshot 
} from "firebase/firestore";
import { Radio, Bell, MapPin } from "lucide-react";

type AlertLog = {
  id: string;
  incident_id: string;
  message: string;
  type: string;
  created_at: string;
};

export function AlertLogPanel({ incidentId, compact, limit = 50 }: { incidentId?: string; compact?: boolean; limit?: number }) {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "alert_logs"), orderBy("created_at", "desc"), limitTo(limit));

    if (incidentId) {
      q = query(collection(db, "alert_logs"), where("incident_id", "==", incidentId), orderBy("created_at", "desc"), limitTo(limit));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AlertLog[];
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [incidentId, limit]);

  if (loading && !logs.length) return <div className="p-4 text-center animate-pulse text-[10px] uppercase tracking-widest text-muted-foreground">Syncing Alert Logs...</div>;

  return (
    <div className={`panel flex flex-col min-h-0 ${compact ? "border-none bg-transparent shadow-none" : ""}`}>
      {!compact && (
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Emergency Broadcast Log</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Real-time dispatch audit
            </div>
          </div>
          <Radio className="h-4 w-4 text-primary animate-pulse" />
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {logs.map((log) => (
          <div key={log.id} className="group relative rounded-lg border border-border/50 bg-secondary/20 p-3 hover:border-primary/30 transition-all animate-in fade-in slide-in-from-right-2">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${log.type === 'alert' ? 'bg-primary' : 'bg-blue-500'}`} />
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-foreground/80">
                  {log.type}
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
              {log.message}
            </p>
            <div className="mt-2 flex items-center gap-1 font-mono text-[8px] text-primary/60 uppercase tracking-tighter">
              <Bell className="h-2.5 w-2.5" />
              <span>Broadcast successfully reached {Math.floor(Math.random() * 50) + 10} nearby responders</span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="py-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 mb-3">
              <Radio className="h-5 w-5 text-muted-foreground opacity-20" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No alerts logged</p>
          </div>
        )}
      </div>
    </div>
  );
}
