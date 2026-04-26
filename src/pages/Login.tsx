import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DashboardRole = "admin" | "volunteer";

const ADMIN_EMAILS = ["admin@responda.com"];

export default function Login() {
  const navigate = useNavigate();
  const [loginRole, setLoginRole] = useState<DashboardRole>("admin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("respondaAuth");
    if (raw) navigate("/");
  }, [navigate]);

  async function handleRoleLogin(e: FormEvent) {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoggingIn(true);
    try {
      if (loginRole === "admin") {
        if (!ADMIN_EMAILS.includes(email)) {
          toast.error("Admin access denied for this email");
          return;
        }
        localStorage.setItem("respondaAuth", JSON.stringify({ role: "admin", email }));
        toast.success("Admin login successful");
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("volunteers")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Volunteer email not found. Add volunteer first.");
        return;
      }

      localStorage.setItem("respondaAuth", JSON.stringify({ role: "volunteer", email }));
      toast.success("Volunteer login successful");
      navigate("/");
    } catch {
      toast.error("Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card/80 p-6 shadow-xl">
        <h1 className="text-xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose role and sign in with email ID.</p>
        <form onSubmit={handleRoleLogin} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setLoginRole("admin")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                loginRole === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginRole("volunteer")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                loginRole === "volunteer"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Volunteer
            </button>
          </div>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder={`${loginRole === "admin" ? "Admin" : "Volunteer"} email ID`}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 transition focus:ring-2"
          />
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingIn ? "Checking..." : "Login"}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Admin demo email: <span className="font-mono">admin@responda.com</span>
        </p>
      </div>
    </div>
  );
}
