import { Activity, Radio } from "lucide-react";

export function TopBar({
  view,
  setView,
}: {
  view: "user" | "admin" | "volunteer";
  setView: (v: "user" | "admin" | "volunteer") => void;
}) {
  const tabs: Array<{ id: typeof view; label: string }> = [
    { id: "user", label: "SOS App" },
    { id: "admin", label: "Command Center" },
    { id: "volunteer", label: "Volunteer" },
  ];

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
              <Radio className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--sev-1))] blink" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">RESPONDA</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Crisis Response Network
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                view === t.id
                  ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-[hsl(var(--sev-1))]" />
          <span>LIVE</span>
        </div>
      </div>
    </header>
  );
}
