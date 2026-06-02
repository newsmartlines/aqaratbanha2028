import { useState, useEffect, useRef } from "react";
import { Loader2, Navigation } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BANHA_LAT, BANHA_LNG } from "../constants";

interface MapPickerProps {
  lat:     string;
  lng:     string;
  onPick:  (lat: number, lng: number) => void;
  onClear: () => void;
}

export function MapPicker({ lat, lng, onPick, onClear }: MapPickerProps) {
  const [RL, setRL] = useState<any>(null);

  useEffect(() => {
    import("react-leaflet").then(async (rl) => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css" as any);
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setRL(rl);
    });
  }, []);

  const mapPos: [number, number] | null =
    lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;

  const getGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => onPick(p.coords.latitude, p.coords.longitude),
      () => {},
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-semibold">تحديد الموقع على الخريطة</Label>
        <button
          type="button"
          onClick={getGPS}
          className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          موقعي الحالي
        </button>
      </div>

      {!RL ? (
        <div className="h-56 rounded-xl border border-border bg-secondary/30 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : (() => {
        const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = RL;

        function FixAutoPan() {
          const map = useMap();
          useEffect(() => { (map as any)._panOnFocus = () => {}; }, [map]);
          return null;
        }

        function ClickHandler() {
          useMapEvents({ click: (e: any) => onPick(e.latlng.lat, e.latlng.lng) });
          return null;
        }

        function FlyToMarker({ pos }: { pos: [number, number] | null }) {
          const map = useMap();
          const prevPos = useRef<[number, number] | null>(null);
          useEffect(() => {
            if (
              pos &&
              (!prevPos.current ||
                prevPos.current[0] !== pos[0] ||
                prevPos.current[1] !== pos[1])
            ) {
              map.flyTo(pos, 15, { duration: 1.2 });
              prevPos.current = pos;
            }
          }, [pos, map]);
          return null;
        }

        return (
          <div className="h-56 rounded-xl overflow-hidden border border-border">
            <MapContainer
              center={mapPos ?? [BANHA_LAT, BANHA_LNG]}
              zoom={mapPos ? 15 : 12}
              className="h-full w-full"
              autoPanOnFocus={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FixAutoPan />
              <ClickHandler />
              <FlyToMarker pos={mapPos} />
              {mapPos && <Marker position={mapPos} />}
            </MapContainer>
          </div>
        );
      })()}

      {mapPos ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2" dir="ltr">
          <span className="text-teal-600 font-mono">
            {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-red-400 hover:text-red-500 font-medium"
          >
            مسح
          </button>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">اضغط على الخريطة لتحديد الموقع بدقة</p>
      )}
    </div>
  );
}
