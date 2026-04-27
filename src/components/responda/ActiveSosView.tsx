import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  MapPin, 
  Navigation2, 
  Phone, 
  MessageSquare, 
  VolumeX, 
  Users, 
  ChevronUp, 
  ChevronDown,
  Info,
  Heart,
  ArrowRight,
  Send,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ActiveSosViewProps {
  onCancel?: () => void;
  emergencyType?: string;
}

export default function ActiveSosView({ onCancel, emergencyType = "Medical Emergency" }: ActiveSosViewProps) {
  const [eta, setEta] = useState(180);
  const [status, setStatus] = useState('Volunteer assigned');
  const [showTips, setShowTips] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Responda Support here. We are monitoring your location. How can we assist?' }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEta(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const statusTimer = setTimeout(() => {
      setStatus('Responder nearby');
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(statusTimer);
    };
  }, []);

  const handleCall = () => {
    setIsCalling(true);
    // Real call trigger
    window.location.href = "tel:911";
    setTimeout(() => setIsCalling(false), 5000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const userText = chatMessage.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatMessage("");
    
    // Dynamic response logic
    setTimeout(() => {
      let reply = "Confirmed. Our team has received your message and is updating the responders.";
      const lowerText = userText.toLowerCase();

      if (lowerText.includes("hurt") || lowerText.includes("bleed") || lowerText.includes("pain")) {
        reply = "Understood. A medical team is prioritized for your location. Please try to apply pressure to any wounds if possible.";
      } else if (lowerText.includes("where") || lowerText.includes("arrival") || lowerText.includes("long")) {
        reply = "The responder is approximately 2.5 miles away and moving steadily. Current ETA is under 3 minutes.";
      } else if (lowerText.includes("scared") || lowerText.includes("afraid") || lowerText.includes("safe")) {
        reply = "You are doing great. Stay on the line with us. We have notified 2 nearby volunteers and local authorities are on the way.";
      } else if (lowerText.includes("who") || lowerText.includes("helping")) {
        reply = "Volunteer 'Rescue-01' is your primary responder. They are a certified emergency responder with medical training.";
      }

      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const safetyTips = [
    { title: "Stay Calm", desc: "Focus on slow, steady breathing.", icon: <Heart className="h-4 w-4 text-red-400" /> },
    { title: "Find Shelter", desc: "Move to a well-lit area if possible.", icon: <MapPin className="h-4 w-4 text-blue-400" /> },
    { title: "Visual Signal", desc: "Use phone flash to signal rescuers.", icon: <ShieldAlert className="h-4 w-4 text-yellow-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
      {/* Background HUD */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 grid-bg" />
        
        {/* Pulsing Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div 
            animate={{ scale: [1, 2, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-80 h-80 bg-primary/20 rounded-full"
          />
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
           <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
           <div>
              <h2 className="text-sm font-black tracking-widest text-red-500 uppercase">SOS ACTIVE</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Silent Mode Active</p>
           </div>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/20 h-8 px-4">
           CONTACTS NOTIFIED
        </Badge>
      </div>

      {/* Main ETA Display */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="text-center"
         >
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">
             {status}
           </p>
           <h1 className="text-8xl font-black tracking-tighter mb-2 tabular-nums">
             {formatTime(eta)}
           </h1>
           <p className="text-sm text-muted-foreground uppercase tracking-widest">Estimated Arrival</p>
         </motion.div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 p-8 space-y-6 bg-gradient-to-t from-black to-transparent">
        <div className="flex gap-4">
           <Button 
             onClick={handleCall}
             className={`flex-1 h-14 rounded-2xl transition-all ${isCalling ? 'bg-green-600 animate-pulse' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
           >
             <Phone className={`mr-2 h-4 w-4 ${isCalling ? 'text-white' : 'text-green-400'}`} />
             {isCalling ? 'Calling...' : 'Call Help'}
           </Button>
           <Button 
             onClick={() => setShowChat(true)}
             className="flex-1 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl"
           >
             <MessageSquare className="mr-2 h-4 w-4 text-blue-400" />
             Message
           </Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-xs font-black uppercase tracking-widest text-primary">Safety Guidance</h3>
             <button onClick={() => setShowTips(!showTips)} className="text-muted-foreground">
                {showTips ? <ChevronDown /> : <ChevronUp />}
             </button>
          </div>
          
          <AnimatePresence>
            {showTips && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-1 gap-2 overflow-hidden"
              >
                {safetyTips.map((tip, i) => (
                  <Card key={i} className="bg-white/5 border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl">{tip.icon}</div>
                    <div>
                       <h4 className="text-xs font-bold uppercase">{tip.title}</h4>
                       <p className="text-[10px] text-muted-foreground">{tip.desc}</p>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button 
          variant="ghost" 
          className="w-full text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
          onClick={onCancel}
        >
          I AM SAFE (CANCEL SOS)
        </Button>
      </div>

      {/* Support Chat Overlay */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-[10000] bg-black flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Emergency Support</h3>
               </div>
               <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="h-6 w-6" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.map((m, i) => (
                 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-white' : 'bg-white/5 border border-white/10 text-white'}`}>
                       {m.text}
                    </div>
                 </div>
               ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10 bg-black flex gap-3">
               <Input 
                 placeholder="Type a message..." 
                 className="bg-white/5 border-white/10 h-12"
                 value={chatMessage}
                 onChange={(e) => setChatMessage(e.target.value)}
               />
               <Button type="submit" className="h-12 w-12 rounded-xl p-0 bg-primary hover:bg-primary/90">
                  <Send className="h-5 w-5" />
               </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
