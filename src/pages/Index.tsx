import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/responda/TopBar";
import { UserSosView } from "@/components/responda/UserSosView";
import { AdminDashboard } from "@/components/responda/AdminDashboard";
import { VolunteerView } from "@/components/responda/VolunteerView";
import { toast } from "sonner";

type DashboardRole = "admin" | "volunteer";

const Index = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"user" | "admin" | "volunteer">("user");
  const [authLoaded, setAuthLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState<{ role: DashboardRole; email: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("respondaAuth");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { role: DashboardRole; email: string };
        if ((parsed.role === "admin" || parsed.role === "volunteer") && parsed.email) {
          setLoggedIn(parsed);
          setView(parsed.role);
        }
      } catch {
        localStorage.removeItem("respondaAuth");
      }
    }
    setAuthLoaded(true);
  }, []);

  const guardedSetView = (next: "user" | "admin" | "volunteer") => {
    if (next === "user") {
      setView(next);
      return;
    }
    if (!loggedIn || loggedIn.role !== next) {
      toast.error(`Please log in as ${next} first`);
      return;
    }
    setView(next);
  };

  function logout() {
    localStorage.removeItem("respondaAuth");
    setLoggedIn(null);
    navigate("/login");
    toast.message("Logged out");
  }

  if (!authLoaded) return null;
  if (!loggedIn) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen flex-col grid-bg">
      <TopBar view={view} setView={guardedSetView} />
      <div className="flex-1 overflow-hidden">
        {view === "user" && <UserSosView />}
        {view === "admin" && <AdminDashboard />}
        {view === "volunteer" && <VolunteerView initialVolunteerEmail={loggedIn.email} />}
      </div>
      <div className="flex items-center justify-end border-t border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
        Logged in as {loggedIn.email} ({loggedIn.role})
        <button
          onClick={logout}
          className="ml-3 rounded border border-border px-2 py-1 text-xs text-foreground transition hover:bg-secondary/70"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Index;
