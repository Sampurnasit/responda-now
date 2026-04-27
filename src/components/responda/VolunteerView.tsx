import { useEffect, useState, useMemo } from "react";
import { useIncidents, useVolunteers } from "@/hooks/useResponda";
import { db } from "@/lib/firebase";
import { updateDoc, doc, collection, addDoc } from "firebase/firestore";
import { TYPE_META, SEVERITY_META, STATUS_META } from "@/lib/responda";
import {
   CheckCircle2,
   MapPin,
   Navigation,
   X,
   ShieldCheck,
   Award,
   Clock,
   Zap,
   AlertTriangle,
   ChevronRight,
   Navigation2,
   MoreVertical,
   Activity
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CrisisMap } from "./CrisisMap";

export function VolunteerView({ initialVolunteerEmail }: { initialVolunteerEmail?: string }) {
  const { volunteers } = useVolunteers();
  const { incidents } = useIncidents();
  const [selectedVolId, setSelectedVolId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"task" | "map">("task");

   useEffect(() => {
      async function syncProfile() {
         if (!volunteers.length || !initialVolunteerEmail) return;

         const emailToMatch = initialVolunteerEmail.toLowerCase();
         const matched = volunteers.find(v => v.email?.toLowerCase() === emailToMatch);

         if (matched) {
            setSelectedVolId(matched.id);
            updateDoc(doc(db, "volunteers", matched.id), {
               last_active: new Date().toISOString()
            });
         } else {
            // AUTO-ENROLLMENT LOGIC
            try {
               const userName = initialVolunteerEmail.split('@')[0];
               const newVolRef = await addDoc(collection(db, "volunteers"), {
                  name: userName.charAt(0).toUpperCase() + userName.slice(1),
                  email: emailToMatch,
                  skills: ["General Support", "Logistics"],
                  status: "available",
                  address: "Auto-enrolled Responder",
                  lat: 22.5726,
                  lng: 88.3639,
                  avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
                  last_active: new Date().toISOString()
               });
               setSelectedVolId(newVolRef.id);
               toast.success("Welcome! Your responder profile has been auto-activated.");
            } catch (e) {
               console.error("Auto-enroll failed:", e);
            }
         }
      }
      syncProfile();
   }, [volunteers, initialVolunteerEmail]);

  const me = useMemo(() => volunteers.find(v => v.id === selectedVolId), [volunteers, selectedVolId]);
  const activeTask = useMemo(() => incidents.find(i => i.assigned_volunteer_id === me?.id && i.status !== "resolved"), [incidents, me]);
  const availableTasks = useMemo(() => incidents.filter(i => i.status === "pending" && i.priority_label !== null), [incidents]);

   const setStatus = async (incidentId: string, newStatus: string) => {
      try {
         await updateDoc(doc(db, "incidents", incidentId), { status: newStatus });
         if (me) {
            const volStatus = newStatus === "resolved" ? "available" : "en_route";
            await updateDoc(doc(db, "volunteers", me.id), { status: volStatus });
         }
         toast.success(`Signal updated: ${newStatus}`);
      } catch {
         toast.error("Failed to update status");
      }
   };

   if (!me) return (
      <div className="flex h-screen items-center justify-center bg-black p-6 text-center">
         <div className="space-y-4">
            <Activity className="mx-auto h-12 w-12 text-primary animate-pulse" />
            <h2 className="text-lg font-black uppercase tracking-widest text-white">Identity Verification Required</h2>
            <p className="text-sm text-muted-foreground">We couldn't find a responder profile for <span className="text-primary">{initialVolunteerEmail}</span>. Please contact Admin for authorization.</p>
            <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>Retry Sync</Button>
         </div>
      </div>
   );

   return (
      <div className="flex h-screen flex-col bg-[#050505] text-white overflow-hidden font-sans">
         {/* PERFORMANCE HEADER */}
         <header className="p-4 border-b border-white/10 flex items-center justify-between bg-card/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
               <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                     <div className="w-full h-full" style={{ backgroundColor: me.avatar_color }} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black" />
               </div>
               <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">{me.name}</h2>
                  <div className="flex gap-2 items-center text-[10px] text-muted-foreground font-bold">
                     <span className="flex items-center gap-1"><Award className="w-2.5 h-2.5 text-yellow-500" /> ELITE RESPONDER</span>
                  </div>
               </div>
            </div>

            <nav className="flex gap-1 bg-white/5 p-1 rounded-xl">
               <button
                  onClick={() => setActiveTab("task")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'task' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
               >
                  Missions
               </button>
               <button
                  onClick={() => setActiveTab("map")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
               >
                  Full Map
               </button>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {activeTab === "task" && (
          <div className="h-full overflow-y-auto pb-32 animate-in fade-in slide-in-from-bottom-4">
             {activeTask ? (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* TACTICAL HUD HEADER */}
                  <div className="bg-red-500/10 border-b border-red-500/20 p-6">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-red-500 flex items-center justify-center text-2xl shadow-lg shadow-red-500/20">
                             {TYPE_META[activeTask.type]?.emoji}
                          </div>
                          <div>
                             <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">{TYPE_META[activeTask.type]?.label} EMERGENCY</h1>
                             <div className="flex gap-2 items-center mt-0.5">
                                <Badge className="bg-red-500 hover:bg-red-500 text-[8px] font-black tracking-widest uppercase h-4 px-1.5">Priority 1</Badge>
                                <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest animate-pulse">● Tactical Link Active</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                     {/* MISSION MINI-MAP HUD */}
                     <div className="h-48 rounded-3xl overflow-hidden border border-white/5 relative group">
                        <CrisisMap 
                           incidents={[activeTask]} 
                           volunteers={[me]} 
                           focus={[activeTask.lat, activeTask.lng]} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                           <div className="bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                              <Navigation className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">Route Locked: 1.2 KM</span>
                           </div>
                        </div>
                     </div>

                     {/* STATS GRID */}
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                           <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Time Elapsed</div>
                           <div className="text-2xl font-black tabular-nums">04:22</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                           <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Target ETA</div>
                           <div className="text-2xl font-black tabular-nums text-primary">02:15</div>
                        </div>
                     </div>

                     {/* AI TACTICAL CHECKLIST */}
                     <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-5">
                           <Zap className="w-4 h-4" /> AI Mission Guidance
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-start gap-4">
                              <div className="h-6 w-6 rounded-full border-2 border-primary/50 flex items-center justify-center shrink-0 mt-0.5">
                                 <CheckCircle2 className="w-3 h-3 text-primary" />
                              </div>
                              <div>
                                 <div className="text-xs font-black uppercase tracking-widest text-white mb-1">Secure Perimeter</div>
                                 <p className="text-[10px] text-muted-foreground leading-relaxed">Establish a 50m safety zone and clear all civilian access points.</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4">
                              <div className="h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                 <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                              </div>
                              <div>
                                 <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Assess Casualties</div>
                                 <p className="text-[10px] text-white/20 leading-relaxed italic">Awaiting arrival at scene to initiate medical triage protocols.</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* INCIDENT DETAILS */}
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
                           <Activity className="w-3 h-3" /> Mission Briefing
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed font-medium italic">
                           "{activeTask.ai_summary || activeTask.message}"
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                           <span className="text-[9px] font-mono text-white/30 uppercase">Signal ID: {activeTask.id.substring(0, 8)}</span>
                           <span className="text-[9px] font-mono text-white/30 uppercase">Origin: {activeTask.lat.toFixed(4)}, {activeTask.lng.toFixed(4)}</span>
                        </div>
                     </div>
                  </div>
                </div>
             ) : (
                     <div className="p-4 space-y-6">
                        <div className="text-center py-10 opacity-60">
                           <div className="flex justify-center mb-4">
                              <ShieldCheck className="w-16 h-16 text-primary/40" />
                           </div>
                           <h2 className="text-lg font-black uppercase tracking-widest">Standing By</h2>
                           <p className="text-xs text-muted-foreground">Monitoring ops channel for signals...</p>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Available Signals</h3>
                           {availableTasks.length === 0 ? (
                              <div className="panel p-6 text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest border-dashed">
                                 No immediate signals in your sector
                              </div>
                           ) : (
                              availableTasks.map(task => (
                                 <Card key={task.id} className="panel p-4 flex items-center justify-between border-white/5 hover:border-primary/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className="text-2xl">{TYPE_META[task.type]?.emoji}</div>
                                       <div>
                                          <div className="flex items-center gap-2">
                                             <h4 className="text-sm font-black uppercase">{TYPE_META[task.type]?.label}</h4>
                                             <Badge className={`text-[8px] h-4 ${task.priority_label === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`}>{task.priority_label}</Badge>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground font-medium">1.4 KM away • {task.message.substring(0, 40)}...</p>
                                       </div>
                                    </div>
                                    <Button
                                       size="sm"
                                       onClick={() => setStatus(task.id, 'en_route')}
                                       className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl"
                                    >
                                       Accept <ChevronRight className="ml-1 w-3 h-3" />
                                    </Button>
                                 </Card>
                              ))
                           )}
                        </div>
                     </div>
                  )}
               </div>
            )}

            {activeTab === "map" && (
               <div className="h-full animate-in fade-in zoom-in-95">
                  <CrisisMap
                     incidents={incidents}
                     volunteers={volunteers}
                     focus={activeTask ? [activeTask.lat, activeTask.lng] : [me.lat, me.lng]}
                  />
                  <div className="absolute top-4 left-4 right-4 pointer-events-none">
                     <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Operations Grid</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{incidents.length} Active Points</span>
                     </div>
                  </div>
               </div>
            )}
      </main>

         {/* QUICK ACTION BAR */}
         {activeTask && (
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
               <div className="flex gap-3">
                  {activeTask.status === 'en_route' ? (
                     <>
                        <Button
                           className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg"
                           onClick={() => setStatus(activeTask.id, 'arrived')}
                        >
                           <Navigation className="mr-2 h-4 w-4" /> Arrived at Scene
                        </Button>
                        <Button
                           variant="outline"
                           className="h-14 w-14 bg-white/5 border-white/10 rounded-2xl"
                           onClick={() => setStatus(activeTask.id, 'pending')}
                        >
                           <X className="h-5 w-5 text-red-400" />
                        </Button>
                     </>
                  ) : (
                     <Button
                        className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-green-900/20"
                        onClick={() => setStatus(activeTask.id, 'resolved')}
                     >
                        <CheckCircle2 className="mr-2 h-5 w-5" /> Mark Task Completed
                     </Button>
                  )}
               </div>
            </div>
         )}

         {/* PERFORMANCE PANEL (Minimal version inside header/footer) */}
         {!activeTask && (
            <div className="fixed bottom-0 left-0 right-0 p-6 border-t border-white/5 bg-card/40 backdrop-blur-md">
               <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daily Progress</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">85% to Tier 2</span>
               </div>
               <Progress value={85} className="h-1 bg-white/5" />
            </div>
         )}
      </div>
   );
}
