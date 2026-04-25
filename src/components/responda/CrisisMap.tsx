import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Incident, Volunteer, MAP_CENTER, TYPE_META, SEVERITY_META } from "@/lib/responda";

// Custom divIcon factory
function makeIcon(opts: { color: string; emoji: string; pulse?: boolean; size?: number }) {
  const size = opts.size ?? 36;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="
        position: relative;
        width: ${size}px; height: ${size}px;
        display:flex; align-items:center; justify-content:center;
        background: ${opts.color};
        border-radius: 50%;
        border: 2px solid hsl(222 30% 6%);
        box-shadow: 0 0 0 2px ${opts.color}, 0 4px 12px rgba(0,0,0,0.5);
        font-size: ${size * 0.5}px;
        ${opts.pulse ? `animation: pulse-ring 1.6s infinite;` : ""}
      ">
        <span style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));">${opts.emoji}</span>
      </div>
    `,
  });
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

interface Props {
  incidents: Incident[];
  volunteers: Volunteer[];
  focus?: [number, number] | null;
  onIncidentClick?: (i: Incident) => void;
}

type HistoricalIncident = {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  type: Incident["type"];
};

const MOCK_HISTORICAL_INCIDENTS: HistoricalIncident[] = [
  { id: "h-1", lat: 37.7858, lng: -122.4134, severity: 5, type: "fire" },
  { id: "h-2", lat: 37.7832, lng: -122.4162, severity: 4, type: "medical" },
  { id: "h-3", lat: 37.7818, lng: -122.4201, severity: 3, type: "crowd" },
  { id: "h-4", lat: 37.7871, lng: -122.4109, severity: 4, type: "security" },
  { id: "h-5", lat: 37.7895, lng: -122.4175, severity: 5, type: "fire" },
  { id: "h-6", lat: 37.7809, lng: -122.4124, severity: 2, type: "medical" },
  { id: "h-7", lat: 37.7864, lng: -122.422, severity: 3, type: "natural" },
  { id: "h-8", lat: 37.7824, lng: -122.4148, severity: 5, type: "security" },
  { id: "h-9", lat: 37.7882, lng: -122.4191, severity: 4, type: "crowd" },
  { id: "h-10", lat: 37.7842, lng: -122.4096, severity: 2, type: "other" },
];

type RiskZone = {
  key: string;
  lat: number;
  lng: number;
  riskScore: number;
  historicalCount: number;
  activeCount: number;
  radiusMeters: number;
  color: string;
  label: "High Risk" | "Medium Risk" | "Watch";
};

export function CrisisMap({ incidents, volunteers, focus, onIncidentClick }: Props) {
  const incidentIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    incidents.forEach((i) => {
      const meta = TYPE_META[i.type] ?? TYPE_META.unknown;
      const sev = SEVERITY_META[i.severity] ?? SEVERITY_META[3];
      m.set(
        i.id,
        makeIcon({
          color: i.status === "resolved" ? "hsl(142 70% 50%)" : sev.color,
          emoji: meta.emoji,
          pulse: i.status !== "resolved",
          size: 38 + i.severity * 2,
        })
      );
    });
    return m;
  }, [incidents]);

  const volunteerIcon = useMemo(
    () =>
      makeIcon({
        color: "hsl(188 95% 55%)",
        emoji: "🧑‍🚒",
        size: 30,
      }),
    []
  );

  const assignedIcon = useMemo(
    () =>
      makeIcon({
        color: "hsl(220 90% 65%)",
        emoji: "🧑‍🚒",
        size: 32,
      }),
    []
  );

  const riskZones = useMemo<RiskZone[]>(() => {
    const bucketSize = 0.0045;
    const buckets = new Map<
      string,
      { lat: number; lng: number; historicalCount: number; activeCount: number; weightedSeverity: number }
    >();

    const addToBucket = (lat: number, lng: number, severity: number, isHistorical: boolean) => {
      const latBucket = Math.round(lat / bucketSize) * bucketSize;
      const lngBucket = Math.round(lng / bucketSize) * bucketSize;
      const key = `${latBucket.toFixed(4)}:${lngBucket.toFixed(4)}`;
      const existing = buckets.get(key) ?? {
        lat: latBucket,
        lng: lngBucket,
        historicalCount: 0,
        activeCount: 0,
        weightedSeverity: 0,
      };
      if (isHistorical) {
        existing.historicalCount += 1;
        existing.weightedSeverity += severity * 1.1;
      } else {
        existing.activeCount += 1;
        existing.weightedSeverity += severity * 1.8;
      }
      buckets.set(key, existing);
    };

    MOCK_HISTORICAL_INCIDENTS.forEach((item) => addToBucket(item.lat, item.lng, item.severity, true));
    incidents.forEach((item) => {
      if (item.status !== "resolved") addToBucket(item.lat, item.lng, item.severity, false);
    });

    const zones: RiskZone[] = Array.from(buckets.entries())
      .map(([key, value]) => {
        const density = value.historicalCount * 2 + value.activeCount * 3;
        const riskScore = Math.round(value.weightedSeverity + density * 2);
        let color = "hsl(48 95% 58%)";
        let label: RiskZone["label"] = "Watch";
        if (riskScore >= 24) {
          color = "hsl(358 90% 60%)";
          label = "High Risk";
        } else if (riskScore >= 14) {
          color = "hsl(28 95% 58%)";
          label = "Medium Risk";
        }

        return {
          key,
          lat: value.lat,
          lng: value.lng,
          riskScore,
          historicalCount: value.historicalCount,
          activeCount: value.activeCount,
          radiusMeters: 120 + density * 28,
          color,
          label,
        };
      })
      .filter((z) => z.riskScore >= 10)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return zones;
  }, [incidents]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={MAP_CENTER}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo target={focus ?? null} />

        {volunteers.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={v.status === "available" ? volunteerIcon : assignedIcon}
          >
            <Popup>
              <div className="font-sans text-sm">
                <div className="font-bold">{v.name}</div>
                <div className="text-xs opacity-70">Status: {v.status}</div>
                <div className="text-xs">Skills: {v.skills.join(", ")}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {incidents.map((i) => (
          <Marker
            key={i.id}
            position={[i.lat, i.lng]}
            icon={incidentIcons.get(i.id)}
            eventHandlers={{ click: () => onIncidentClick?.(i) }}
          >
            <Popup>
              <div className="font-sans text-sm max-w-[220px]">
                <div className="font-bold uppercase text-xs">
                  {TYPE_META[i.type]?.label} • Sev {i.severity}
                </div>
                <div className="mt-1">{i.message}</div>
                <div className="mt-1 text-xs opacity-70">Status: {i.status}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {riskZones.map((zone) => (
          <Circle
            key={zone.key}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusMeters}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.15,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="font-sans text-sm max-w-[220px]">
                <div className="font-bold">{zone.label} Zone</div>
                <div className="text-xs mt-1">Risk score: {zone.riskScore}</div>
                <div className="text-xs opacity-80">
                  Historical incidents: {zone.historicalCount} • Active density: {zone.activeCount}
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] panel px-3 py-2 text-xs space-y-1 font-mono">
        <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
          Predictive Risk Overlay
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(358_90%_60%)]" />
          <span>HIGH RISK ZONE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(28_95%_58%)]" />
          <span>MEDIUM RISK ZONE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--sev-5))]" />
          <span>EMERGENCY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span>VOLUNTEER</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--status-resolved))]" />
          <span>RESOLVED</span>
        </div>
      </div>
    </div>
  );
}
