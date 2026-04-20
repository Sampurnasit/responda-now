import { useState } from "react";
import { TopBar } from "@/components/responda/TopBar";
import { UserSosView } from "@/components/responda/UserSosView";
import { AdminDashboard } from "@/components/responda/AdminDashboard";
import { VolunteerView } from "@/components/responda/VolunteerView";

const Index = () => {
  const [view, setView] = useState<"user" | "admin" | "volunteer">("admin");

  return (
    <div className="flex h-screen flex-col grid-bg">
      <TopBar view={view} setView={setView} />
      <div className="flex-1 overflow-hidden">
        {view === "user" && <UserSosView />}
        {view === "admin" && <AdminDashboard />}
        {view === "volunteer" && <VolunteerView />}
      </div>
    </div>
  );
};

export default Index;
