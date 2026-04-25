import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Incident, Volunteer, MAP_CENTER, TYPE_META, SEVERITY_META } from "@/lib/responda";

// Custom controller to handle fly-to animations
function MapController({ focus }: { focus?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.flyTo(focus, 15, { animate: true, duration: 1.5 });
    }
  }, [focus, map]);
  return null;
}

// Icon creators
const createVolunteerIcon = (status: string) => {
  const color = status === "available" ? "hsl(188 95% 55%)" : "hsl(220 90% 65%)";
  return L.divIcon({
    className: "custom-leaflet-icon bg-transparent border-none",
    html: `
      <div
        class="crisis-marker volunteer-marker"
        style="transform: translate(-50%, -50%); cursor: pointer;"
      >
        <div
          class="marker-dot ${status === "available" ? "pulse-cyan" : ""}"
          style="
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${color};
            border: 2px solid hsl(222 30% 6%);
            box-shadow: 0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.5);
            font-size: 15px;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
          "
        >
          🧑‍🚒
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const createIncidentIcon = (incident: Incident) => {
  const meta = TYPE_META[incident.type] ?? TYPE_META.unknown;
  const sev = SEVERITY_META[incident.severity] ?? SEVERITY_META[3];
  const color = incident.status === "resolved" ? "hsl(142 70% 50%)" : sev.color;
  const size = 38 + incident.severity * 2;
  const isActive = incident.status !== "resolved";

  return L.divIcon({
    className: "custom-leaflet-icon bg-transparent border-none",
    html: `
      <div style="transform: translate(-50%, -50%); cursor: pointer; position: relative;">
        ${isActive ? `
          <div class="pulse-ring-gmap" style="
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 2px solid ${color};
            opacity: 0.6;
          "></div>
        ` : ""}
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${color};
          border: 2px solid hsl(222 30% 6%);
          box-shadow: 0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.5);
          font-size: ${size * 0.5}px;
          position: relative;
          z-index: 1;
        ">
          <span style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4))">${meta.emoji}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

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

  // Default Leaflet styling overrides
  useEffect(() => {
    // A little hack to hide default Leaflet backgrounds if custom-leaflet-icon misses classes
    const style = document.createElement("style");
    style.innerHTML = `
      .leaflet-container {
        background: #1a1a2e;
        font-family: inherit;
      }
      .custom-leaflet-icon {
        background: none !important;
        border: none !important;
      }
      .leaflet-popup-content-wrapper {
        background: white;
        color: #111827;
        border-radius: 8px;
      }
      .leaflet-popup-tip {
        background: white;
      }
      /* Hide zoom control */
      .leaflet-control-zoom {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

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
        zoomControl={false}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController focus={focus} />

        {/* Volunteer Markers */}
        {volunteers.map((v) => (
          <Marker
            key={`vol-${v.id}`}
            position={[v.lat, v.lng]}
            icon={createVolunteerIcon(v.status)}
          >
            <Popup offset={[0, -20]}>
              <div className="font-sans text-sm text-gray-900 w-full min-w-[150px]">
                <div className="font-bold">{v.name}</div>
                <div className="text-xs opacity-70">Status: {v.status}</div>
                <div className="text-xs">Skills: {v.skills.join(", ")}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident Markers */}
        {incidents.map((i) => (
          <Marker
            key={`inc-${i.id}`}
            position={[i.lat, i.lng]}
            icon={createIncidentIcon(i)}
            eventHandlers={{
              click: () => {
                onIncidentClick?.(i);
              },
            }}
          >
            <Popup offset={[0, -24]}>
              <div className="font-sans text-sm max-w-[220px] min-w-[180px] text-gray-900">
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
