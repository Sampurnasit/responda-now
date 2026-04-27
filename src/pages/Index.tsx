import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/responda/TopBar";
import { UserSosView } from "@/components/responda/UserSosView";
import { AdminDashboard } from "@/components/responda/AdminDashboard";
import { VolunteerView } from "@/components/responda/VolunteerView";
import { toast } from "sonner";
import { LogOut, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type DashboardRole = "admin" | "volunteer" | "user";

const Index = ({ forceView }: { forceView?: DashboardRole }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<DashboardRole>(forceView || "user");
  const [authLoaded, setAuthLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const docSnap = await getDoc(doc(db, "profiles", user.uid));
        if (docSnap.exists()) {
          const p = docSnap.data();
          setProfile(p);
          if (!forceView) setView(p.role as DashboardRole);
        }
      } else {
        navigate("/login");
      }
      setAuthLoaded(true);
    });
  }, [navigate, forceView]);

  const guardedSetView = (next: DashboardRole) => {
    if (profile?.role === "admin") {
      setView(next);
      return;
    }
    if (profile?.role === next || next === "user") {
      setView(next);
    } else {
      toast.error(`Access denied. You are registered as ${profile?.role}`);
    }
  };

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
      toast.message("Signed out successfully");
    } catch (error) {
      toast.error("Sign out failed");
    }
  }

  if (!authLoaded) return null;
  if (!currentUser) return null;

  return (
    <div className="flex h-screen flex-col grid-bg">
      <div className="flex-1 overflow-hidden">
        {view === "user" && <UserSosView />}
        {view === "admin" && <AdminDashboard />}
        {view === "volunteer" && <VolunteerView initialVolunteerEmail={currentUser.email || undefined} />}
      </div>
      <div className="flex items-center justify-end border-t border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm">
        <UserIcon className="h-3 w-3 mr-2" />
        Logged in as <span className="font-medium text-foreground ml-1">{currentUser.email}</span> 
        <Badge variant="outline" className="ml-2 capitalize text-[10px] h-5 border-primary/20 text-primary bg-primary/5">
            {profile?.role || "Guest"}
        </Badge>
        <button
          onClick={handleLogout}
          className="ml-4 flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-[10px] font-bold text-foreground transition hover:bg-secondary/80 uppercase tracking-widest"
        >
          <LogOut className="h-3 w-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Index;
