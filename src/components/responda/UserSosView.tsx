import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIncidents } from "@/hooks/useResponda";
import { randomNearby, TYPE_META, SEVERITY_META, STATUS_META } from "@/lib/responda";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Signal, Mic, StopCircle, ImagePlus } from "lucide-react";
import { PredictiveChatbot } from "./PredictiveChatbot";

// Modular Components
import { SosOrb } from "./sos/SosOrb";
import { SosControls } from "./sos/SosControls";
import { SosIncidentProfile } from "./sos/SosIncidentProfile";

import "./SosInterface.css";

type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function UserSosView() {
  // --- State Management ---
  const { incidents } = useIncidents();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosState, setSosState] = useState<"IDLE" | "PRESSING" | "CANCEL_GRACE" | "ACTIVATED">("IDLE");
  const [cancelCountdown, setCancelCountdown] = useState(5);
  const [selectedType, setSelectedType] = useState<string>("");
  
  // --- Refs ---
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived Data ---
  const myIncident = activeId ? incidents.find((i) => i.id === activeId) : null;
  const speechSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const suggestions = [
    { label: "FIRE", value: "fire" },
    { label: "MEDICAL", value: "medical" },
    { label: "SECURITY", value: "security" },
    { label: "CROWD", value: "crowd" },
  ];

  // --- Handlers ---
  function handleImageChange(file: File | null) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    if (!file) {
      setImagePreviewUrl(null);
      return;
    }
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function toggleVoiceInput(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!speechSupported) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    if (recording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Speech stop error:", err);
      }
      setRecording(false);
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        setMessage((prev) => `${prev}${prev ? " " : ""}${transcript.trim()}`.trim());
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        toast.error(`Voice error: ${event.error}`);
        setRecording(false);
      }
    };
    recognition.onend = () => setRecording(false);
    
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
      toast.info("Listening...");
    } catch (err) {
      toast.error("Could not start voice input");
    }
  }

  async function triggerAlert(text?: string, type?: string) {
    const baseText = (text ?? message).trim();
    setSubmitting(true);
    setSosState("ACTIVATED");
    try {
      const reporterTime = new Date().toISOString();
      const [lat, lng] = await new Promise<[number, number]>((resolve) => {
        if (!navigator.geolocation) {
          resolve(randomNearby());
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
          () => resolve(randomNearby()),
          { timeout: 5000, enableHighAccuracy: true }
        );
      });

      const { data: created, error: insErr } = await supabase
        .from("incidents")
        .insert({ 
          message: baseText || "Emergency reported.", 
          lat, 
          lng, 
          type: type || "unknown",
          reporter_label: "Civilian #" + Math.floor(Math.random() * 999) 
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setActiveId(created.id);
      setMessage("");
      setImageFile(null);
      setImagePreviewUrl(null);

      // AI Analysis
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("classify-incident", {
        body: {
          message: baseText || "Emergency reported",
          timestamp: reporterTime,
          location: { lat, lng },
        },
      });
      if (aiErr) throw aiErr;

      await supabase
        .from("incidents")
        .update({
          type: aiData.type,
          severity: aiData.severity,
          ai_summary: aiData.summary,
          people_affected: aiData.people_affected,
          location_type: aiData.location_type,
          priority_score: aiData.priority_score,
          priority_label: aiData.priority_label,
        })
        .eq("id", created.id);

      toast.success("Help is on the way");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send SOS");
      setSosState("IDLE");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Button Interaction Logic ---
  const handleStartPress = (e: React.PointerEvent) => {
    if (sosState !== "IDLE" || submitting) return;
    setSosState("PRESSING");
    startTimeRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        enterGracePeriod();
      }
    }, 30);
  };

  const handleEndPress = () => {
    if (sosState === "PRESSING") {
      clearInterval(holdTimerRef.current!);
      setHoldProgress(0);
      setSosState("IDLE");
    }
  };

  const enterGracePeriod = () => {
    setSosState("CANCEL_GRACE");
    setCancelCountdown(5);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    cancelTimerRef.current = setInterval(() => {
      setCancelCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cancelTimerRef.current!);
          triggerAlert(message, selectedType);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const abortSignal = () => {
    clearInterval(cancelTimerRef.current!);
    setSosState("IDLE");
    setHoldProgress(0);
    toast.info("Signal Aborted");
  };

  const resetInterface = () => {
    setActiveId(null);
    setSosState("IDLE");
    setHoldProgress(0);
  };

  // --- View Orchestration ---
  return (
    <div className="sos-app-container flex flex-col items-center justify-start p-6 overflow-y-auto">
      <AnimatePresence mode="wait">
        {myIncident ? (
          <div className="w-full flex flex-col gap-6">
            <SosIncidentProfile
              key="result"
              incident={myIncident as any}
              typeMeta={TYPE_META}
              sevMeta={SEVERITY_META}
              statusMeta={STATUS_META}
              onReset={resetInterface}
            />
            {/* Predictive Chatbot integrated below active incident */}
            <div className="w-full max-w-md mx-auto h-[450px]">
              <PredictiveChatbot incidents={incidents} />
            </div>
          </div>
        ) : (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center justify-between min-h-[600px]"
          >
            <div className="h-12" />

            <SosOrb
              state={sosState}
              progress={holdProgress}
              countdown={cancelCountdown}
              submitting={submitting}
              onPointerDown={handleStartPress}
              onPointerUp={handleEndPress}
            />

            <div className="h-24 flex items-center justify-center">
              <AnimatePresence>
                {sosState === "CANCEL_GRACE" && (
                  <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    onClick={abortSignal}
                    className="px-10 py-4 rounded-full bg-white text-black font-black text-xs tracking-[0.2em] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all"
                  >
                    ABORT SIGNAL
                  </motion.button>
                )}
                {submitting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest">
                      <Signal className="h-4 w-4 animate-pulse" />
                      Uplink transmission...
                    </div>
                  </motion.div>
                )}
                {sosState === "IDLE" && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-4"
                  >
                    {/* Voice Option */}
                    <button
                      onClick={toggleVoiceInput}
                      className={`w-14 h-14 flex items-center justify-center rounded-full transition-all border shadow-lg
                        ${recording 
                          ? "bg-primary border-primary shadow-[0_0_15px_rgba(255,59,48,0.4)]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        }`}
                    >
                      {recording ? <StopCircle className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>

                    {/* Transmit Action - Only if content exists */}
                    <AnimatePresence>
                      {(message.trim() || imagePreviewUrl) && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0, width: 0 }}
                          animate={{ scale: 1, opacity: 1, width: "auto" }}
                          exit={{ scale: 0, opacity: 0, width: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={enterGracePeriod}
                          className="px-8 h-14 rounded-full bg-primary text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_10px_30px_rgba(255,59,48,0.4)] transition-all flex items-center justify-center whitespace-nowrap overflow-hidden"
                        >
                          Transmit Signal
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* Image Option */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all shadow-lg"
                      >
                        <ImagePlus className="h-6 w-6" />
                      </button>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          handleImageChange(file);
                          e.target.value = "";
                        }} 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
<<<<<<< HEAD
            
=======

>>>>>>> 611192ad85ef98ec96a1bd1c54f3bb273c7dc1cb
            <SosControls
              message={message}
              onMessageChange={setMessage}
              recording={recording}
              onToggleVoice={toggleVoiceInput}
              onImageChange={handleImageChange}
              imagePreviewUrl={imagePreviewUrl}
              selectedType={selectedType}
              onTypeSelect={setSelectedType}
              suggestions={suggestions as any}
              disabled={sosState === "CANCEL_GRACE" || submitting}
              onTransmit={enterGracePeriod}
            />

            <div className="h-8" />
            
            {/* Optional: Add predictive chatbot at the very bottom even in IDLE state if desired */}
            <div className="w-full max-w-md mx-auto h-[450px] mt-12 opacity-80 hover:opacity-100 transition-opacity">
               <PredictiveChatbot incidents={incidents} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
