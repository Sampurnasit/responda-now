import React from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Shield, Zap, RefreshCw } from "lucide-react";

interface SosIncidentProfileProps {
  incident: any;
  typeMeta: any;
  sevMeta: any;
  statusMeta: any;
  onReset: () => void;
}

export const SosIncidentProfile: React.FC<SosIncidentProfileProps> = ({
  incident,
  typeMeta,
  sevMeta,
  statusMeta,
  onReset,
}) => {
  const meta = typeMeta[incident.type] || typeMeta.unknown;
  const sev = sevMeta[incident.severity] || sevMeta[3];
  const stat = statusMeta[incident.status] || statusMeta.pending;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-md glass-card rounded-[2.5rem] p-8 overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-white font-black text-lg tracking-tight">SOS UPLINK</h3>
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{incident.id.split("-")[0]}</p>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
          ${stat.color === "primary" ? "bg-primary/10 border-primary text-primary" : "bg-cyan-500/10 border-cyan-500 text-cyan-400"}`}
        >
          {stat.label}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Category</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta.emoji}</span>
              <span className="text-white font-bold">{meta.label}</span>
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Priority</span>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-bold">{sev.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white/60 text-xs">
            <MapPin className="h-4 w-4" />
            <span className="font-mono">{incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</span>
          </div>
          <div className="flex items-center gap-3 text-white/60 text-xs">
            <Users className="h-4 w-4" />
            <span>Estimated {incident.people_affected || "multiple"} people affected</span>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full mt-8 py-4 rounded-3xl bg-white/5 border border-white/10 text-white/60 font-black text-xs tracking-[0.2em] uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-3"
      >
        <RefreshCw className="h-4 w-4" />
        Initiate New Signal
      </button>
    </motion.div>
  );
};
