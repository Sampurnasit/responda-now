import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Incident, Volunteer } from "@/lib/responda";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (mounted) {
          setIncidents((data as Incident[]) || []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`incidents-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          setIncidents((prev) => {
            if (payload.eventType === "INSERT") {
              return [payload.new as Incident, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((i) => (i.id === (payload.new as Incident).id ? (payload.new as Incident) : i));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((i) => i.id !== (payload.old as Incident).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { incidents, loading };
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("volunteers")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (mounted) {
          setVolunteers((data as Volunteer[]) || []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`volunteers-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "volunteers" },
        (payload) => {
          setVolunteers((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Volunteer];
            if (payload.eventType === "UPDATE")
              return prev.map((v) => (v.id === (payload.new as Volunteer).id ? (payload.new as Volunteer) : v));
            if (payload.eventType === "DELETE") return prev.filter((v) => v.id !== (payload.old as Volunteer).id);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { volunteers, loading };
}
