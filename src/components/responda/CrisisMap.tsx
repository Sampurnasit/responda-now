import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[10] panel px-3 py-2 text-xs space-y-1 font-mono bg-background/80 backdrop-blur border border-border rounded-md shadow-lg pointer-events-none">
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
