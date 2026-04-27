import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import type { Incident, Volunteer } from "@/lib/responda";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "incidents"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incident[];
      setIncidents(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore incidents error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { incidents, loading };
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "volunteers"), orderBy("name"));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Volunteer[];
      setVolunteers(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore volunteers error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { volunteers, loading };
}
