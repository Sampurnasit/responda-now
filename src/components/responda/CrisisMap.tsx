import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] panel px-3 py-2 text-xs space-y-1 font-mono">
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
