import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface SosOrbProps {
  state: "IDLE" | "PRESSING" | "CANCEL_GRACE" | "ACTIVATED";
  progress: number;
  countdown: number;
  submitting: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

export const SosOrb: React.FC<SosOrbProps> = ({
  state,
  progress,
  countdown,
  submitting,
  onPointerDown,
  onPointerUp,
}) => {
  const isGrace = state === "CANCEL_GRACE";
  const isPressing = state === "PRESSING";

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer Glows */}
      <AnimatePresence>
        {(isPressing || isGrace) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 sos-orb-glow rounded-full"
          />
        )}
      </AnimatePresence>

      <motion.div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        whileTap={{ scale: 0.94 }}
        className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 shadow-2xl overflow-hidden
          ${isGrace ? "bg-white" : "bg-gradient-to-br from-primary to-primary/80"}`}
      >
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="128" cy="128" r="120"
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"
          />
          <motion.circle
            cx="128" cy="128" r="120"
            fill="none"
            stroke={isGrace ? "#ff3b30" : "white"}
            strokeWidth="8"
            strokeDasharray="754"
            animate={{ strokeDashoffset: 754 - (754 * progress) / 100 }}
          />
        </svg>

        <AnimatePresence mode="wait">
          {isGrace ? (
            <motion.div
              key="countdown"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <span className="text-6xl font-black text-primary leading-none">{countdown}</span>
              <span className="text-[10px] font-black text-primary/60 tracking-[0.3em] uppercase mt-2">Seconds to Launch</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="flex flex-col items-center text-white"
            >
              <AlertTriangle className={`h-16 w-16 mb-4 ${isPressing ? "animate-pulse" : ""}`} strokeWidth={2.5} />
              <span className="text-4xl font-black tracking-tighter leading-none">SOS</span>
              <span className="text-[10px] font-bold opacity-60 tracking-[0.2em] uppercase mt-2">Hold 2 Seconds</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Line Overlay */}
        <div className="orb-scan-line opacity-20" />
      </motion.div>

      {/* Satellite Ping Rings */}
      {isGrace && (
        <div className="absolute inset-0 pointer-events-none">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
              className="absolute inset-0 border-2 border-white/20 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};
