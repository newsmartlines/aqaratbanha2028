import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";

// ── Internal: auto-fit + click-to-move ───────────────────────────────────────

interface ControllerProps {
  position: LatLngTuple;
  radius: number;
  onMove: (pos: LatLngTuple) => void;
}

function MapController({ position, radius, onMove }: ControllerProps) {
  const map = useMap();

  // Fit the circle in view whenever the position changes
  useEffect(() => {
    // A 100 m circle at zoom 16 shows the full circle with comfortable padding
    const approxZoom = radius <= 150 ? 16 : radius <= 500 ? 15 : 14;
    map.setView(position, approxZoom, { animate: true, duration: 0.5 });
  }, [position, radius, map]);

  // Click anywhere → move the circle
  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

// ── Public component ──────────────────────────────────────────────────────────

interface PropertyMapProps {
  lat: number;
  lng: number;
  /** Circle radius in metres (default 100) */
  radius?: number;
  /** Container height class (default "h-72 md:h-96") */
  heightClass?: string;
}

export function PropertyMap({
  lat,
  lng,
  radius = 100,
  heightClass = "h-72 md:h-96",
}: PropertyMapProps) {
  const [position, setPosition] = useState<LatLngTuple>([lat, lng]);
  // Fade-in: start transparent, go opaque after first paint
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // If the parent prop changes (e.g. data loads async), sync it in
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
  }, [lat, lng]);

  return (
    <div
      className={`relative w-full ${heightClass} overflow-hidden`}
      style={{ borderRadius: 12 }}
    >
      {/* Fade-in wrapper */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          className="h-full w-full"
          zoomControl
          scrollWheelZoom
          dragging
          doubleClickZoom
          touchZoom
          // Remove default attribution to keep UI clean; we add a minimal one via TileLayer
          attributionControl={false}
          // Prevent the default blue marker icon from ever appearing
          // (no Marker is used, but this is defensive)
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          />

          <MapController
            position={position}
            radius={radius}
            onMove={setPosition}
          />

          {/* The Dubizzle-style area circle — NO marker pin */}
          <Circle
            center={position}
            radius={radius}
            pathOptions={{
              fillColor: "#3B82F6",
              fillOpacity: 0.2,
              color: "#3B82F6",
              weight: 2,
              // No dash; clean solid border
            }}
          />
        </MapContainer>

        {/* Minimal attribution badge (bottom-left, unobtrusive) */}
        <div
          className="absolute bottom-2 left-2 z-[1000] text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none select-none"
          style={{ backdropFilter: "blur(2px)" }}
        >
          © OpenStreetMap
        </div>
      </div>

      {/* Hint label — fades out after map is ready */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none transition-opacity duration-500"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <span className="text-[11px] text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm select-none">
          انقر على الخريطة لتغيير الموقع
        </span>
      </div>
    </div>
  );
}
