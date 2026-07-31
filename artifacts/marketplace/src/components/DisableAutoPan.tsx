import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function DisableAutoPan() {
  const map = useMap();
  useEffect(() => {
    (map as any)._panOnFocus = () => {};
  }, [map]);
  return null;
}
