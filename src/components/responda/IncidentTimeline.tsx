import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  User, 
  Zap,
  ArrowRight
} from "lucide-react";

type TimelineEvent = {
  id: string;
  incident_id: string;
  type: "reported" | "ai_analyzed" | "assigned" | "en_route" | "resolved" | "comment";
  message: string;
  created_at: string;
  actor_name?: string;
};

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "incident_timeline"),
      where("incident_id", "==", incidentId),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimelineEvent[];
      setEvents(data);
      setLoading(false);
    }, (error) => {
        console.error("Timeline error:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [incidentId]);

  if (loading && !events.length) return <div className="p-4 text-center animate-pulse text-[10px] uppercase tracking-widest text-muted-foreground">Syncing Timeline...</div>;

  return (
    <div className="relative space-y-4 pl-4 pt-2">
      {/* Connector line */}
      <div className="absolute left-[23px] top-0 h-full w-[1px] bg-border/50" />

      {events.map((event, idx) => (
        <div key={event.id} className="relative flex items-start gap-4 animate-in fade-in slide-in-from-left-2">
          <div className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-secondary border border-border shadow-sm">
            <EventIcon type={event.type} />
          </div>
          <div className="flex-1 rounded-lg border border-border/50 bg-secondary/10 p-2.5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] uppercase tracking-widest font-black text-foreground/70">
                {event.type.replace("_", " ")}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {event.message}
            </p>
            {event.actor_name && (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-primary/80">
                <User className="h-2.5 w-2.5" />
                <span>{event.actor_name}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {events.length === 0 && (
        <div className="relative flex items-start gap-4 py-4 grayscale opacity-40">
           <div className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-secondary border border-border">
            <Clock className="h-2.5 w-2.5" />
          </div>
          <div className="flex-1 py-1">
             <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Initialization...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EventIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "reported": return <ShieldAlert className="h-2.5 w-2.5 text-red-500" />;
    case "ai_analyzed": return <Zap className="h-2.5 w-2.5 text-accent" />;
    case "assigned": return <ArrowRight className="h-2.5 w-2.5 text-blue-500" />;
    case "en_route": return <ArrowRight className="h-2.5 w-2.5 text-primary animate-pulse" />;
    case "resolved": return <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />;
    case "comment": return <MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />;
    default: return <Clock className="h-2.5 w-2.5 text-muted-foreground" />;
  }
}
