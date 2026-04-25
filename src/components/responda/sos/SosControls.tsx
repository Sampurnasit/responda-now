import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Mic, StopCircle, ImagePlus, Globe, Lock, X } from "lucide-react";

interface Suggestion {
  label: string;
  icon: React.ReactNode;
  value: string;
}

interface SosControlsProps {
  message: string;
  onMessageChange: (val: string) => void;
  recording: boolean;
  onToggleVoice: () => void;
  onImageChange: (file: File | null) => void;
  imagePreviewUrl: string | null;
  selectedType: string;
  onTypeSelect: (type: string) => void;
  suggestions: Suggestion[];
  disabled: boolean;
  onTransmit?: () => void;
}

export const SosControls: React.FC<SosControlsProps> = ({
  message,
  onMessageChange,
  recording,
  onToggleVoice,
  onImageChange,
  imagePreviewUrl,
  selectedType,
  onTypeSelect,
  suggestions,
  disabled,
  onTransmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={`w-full max-w-[500px] flex flex-col gap-4 ${disabled ? "opacity-20 pointer-events-none scale-95" : "transition-all duration-500"}`}
    >
      {/* Suggestions */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {suggestions.map((s) => (
          <motion.button
            key={s.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTypeSelect(s.value)}
            className={`px-5 py-2.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all
              ${selectedType === s.value 
                ? "bg-white text-black border-white" 
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
          >
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* Main Input Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={2}
          placeholder="SYSTEM INPUT: DESCRIBE SITUATION"
          className="w-full bg-transparent border-none text-white text-base placeholder:text-white/20 resize-none outline-none"
        />
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
            Input Terminal Ready
          </div>

          {imagePreviewUrl && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative h-11 w-20 rounded-xl overflow-hidden border border-white/20 shadow-lg"
            >
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              <button 
                onClick={() => onImageChange(null)} 
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </motion.div>
          )}
        </div>

      </div>

      {/* Trust Footer */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">
        <Globe className="h-4 w-4" />
        <span className="font-bold uppercase tracking-widest text-[9px]">Quantum Satellite Tracking Active</span>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400" 
          />
          <Lock className="h-3 w-3" />
        </div>
      </div>
    </motion.div>
  );
};
