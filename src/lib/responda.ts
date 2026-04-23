// Shared types and helpers for Responda
export type EmergencyType = "fire" | "medical" | "crowd" | "security" | "natural" | "other" | "unknown";
export type IncidentStatus = "pending" | "assigned" | "en_route" | "resolved";
export type VolunteerStatus = "available" | "assigned" | "en_route" | "offline";
export type LocationType = "hotel" | "street" | "rural" | "indoor" | "outdoor" | "transit" | "other";
export type PriorityLabel = "Critical" | "High" | "Medium" | "Low";

export interface Volunteer {
  id: string;
  name: string;
  skills: string[];
  lat: number;
  lng: number;
  status: VolunteerStatus;
  avatar_color: string;
  created_at: string;
}

export interface Incident {
  id: string;
  message: string;
  type: EmergencyType;
  severity: number;
  lat: number;
  lng: number;
  status: IncidentStatus;
  reporter_label: string;
  assigned_volunteer_id: string | null;
  ai_summary: string | null;
  people_affected: number | null;
  location_type: LocationType | null;
  priority_score: number | null;
  priority_label: PriorityLabel | null;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_META: Record<PriorityLabel, { color: string; bg: string }> = {
  Critical: { color: "hsl(var(--sev-5))", bg: "hsl(var(--sev-5) / 0.15)" },
  High: { color: "hsl(var(--sev-4))", bg: "hsl(var(--sev-4) / 0.15)" },
  Medium: { color: "hsl(var(--sev-3))", bg: "hsl(var(--sev-3) / 0.15)" },
  Low: { color: "hsl(var(--sev-1))", bg: "hsl(var(--sev-1) / 0.15)" },
};

export const LOCATION_META: Record<LocationType, { label: string; emoji: string }> = {
  hotel: { label: "Hotel", emoji: "🏨" },
  street: { label: "Street", emoji: "🛣️" },
  rural: { label: "Rural", emoji: "🌾" },
  indoor: { label: "Indoor", emoji: "🏢" },
  outdoor: { label: "Outdoor", emoji: "🌳" },
  transit: { label: "Transit", emoji: "🚌" },
  other: { label: "Other", emoji: "📍" },
};

// Map center: downtown San Francisco
export const MAP_CENTER: [number, number] = [37.7849, -122.4150];

export const TYPE_META: Record<EmergencyType, { label: string; emoji: string; color: string }> = {
  fire: { label: "Fire", emoji: "🔥", color: "hsl(18 95% 60%)" },
  medical: { label: "Medical", emoji: "🚑", color: "hsl(358 90% 60%)" },
  crowd: { label: "Crowd", emoji: "👥", color: "hsl(38 95% 58%)" },
  security: { label: "Security", emoji: "🛡️", color: "hsl(280 80% 65%)" },
  natural: { label: "Natural", emoji: "🌊", color: "hsl(200 80% 55%)" },
  other: { label: "Other", emoji: "⚠️", color: "hsl(215 16% 60%)" },
  unknown: { label: "Unknown", emoji: "❓", color: "hsl(215 16% 60%)" },
};

export const SEVERITY_META: Record<number, { label: string; color: string }> = {
  1: { label: "MINOR", color: "hsl(var(--sev-1))" },
  2: { label: "LOW", color: "hsl(var(--sev-2))" },
  3: { label: "MODERATE", color: "hsl(var(--sev-3))" },
  4: { label: "HIGH", color: "hsl(var(--sev-4))" },
  5: { label: "CRITICAL", color: "hsl(var(--sev-5))" },
};

export const STATUS_META: Record<IncidentStatus, { label: string; color: string }> = {
  pending: { label: "PENDING", color: "hsl(var(--status-pending))" },
  assigned: { label: "ASSIGNED", color: "hsl(var(--status-assigned))" },
  en_route: { label: "EN ROUTE", color: "hsl(var(--status-en-route))" },
  resolved: { label: "RESOLVED", color: "hsl(var(--status-resolved))" },
};

// Haversine distance in km
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Match volunteers to an incident: score by skill match + proximity
export function recommendVolunteers(
  incident: Incident,
  volunteers: Volunteer[],
  requiredSkills: string[] = []
): Array<Volunteer & { distance: number; score: number; matchedSkills: string[] }> {
  const skillSet = new Set(requiredSkills.map((s) => s.toLowerCase()));
  // Fallback: derive skills from incident type
  if (skillSet.size === 0) {
    if (incident.type === "fire") skillSet.add("fire");
    if (incident.type === "medical") skillSet.add("medical");
    if (incident.type === "crowd") skillSet.add("crowd-control");
    if (incident.type === "security") skillSet.add("security");
  }

  return volunteers
    .filter((v) => v.status === "available")
    .map((v) => {
      const distance = distanceKm([incident.lat, incident.lng], [v.lat, v.lng]);
      const matchedSkills = v.skills.filter((s) => skillSet.has(s.toLowerCase()));
      // Score: skill match weighted high, proximity inversely
      const score = matchedSkills.length * 10 - distance * 2;
      return { ...v, distance, score, matchedSkills };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Random small offset around map center for SOS demos
export function randomNearby(center: [number, number] = MAP_CENTER, jitter = 0.012): [number, number] {
  const lat = center[0] + (Math.random() - 0.5) * jitter * 2;
  const lng = center[1] + (Math.random() - 0.5) * jitter * 2;
  return [lat, lng];
}
