import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { api, mediaUrl } from "@/lib/api";
import { Header } from "@/components/Header";
import { Home, Bed, Bath, Maximize2, MapPin, Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getFieldRulesForMainCategory,
  getFieldRulesForCategorySlug,
  SLUG_TO_SUBTYPES,
  type FieldConfigRow,
} from "@/lib/property-field-rules";
import "leaflet/dist/leaflet.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Property {
  id: number;
  title: string;
  price?: string;
  area?: string;
  rooms?: number;
  bathrooms?: number;
  listingType: string;
  mainCategory: string;
  images?: string | string[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  status?: string;
}

interface MapBounds { north: number; south: number; east: number; west: number; }
interface ClusterGroup { lat: number; lng: number; count: number; ids: number[]; props: Property[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BANHA_LAT = 30.468;
const BANHA_LNG = 31.183;

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getCoords(p: Property): [number, number] {
  const lat = parseFloat(String(p.latitude ?? ""));
  const lng = parseFloat(String(p.longitude ?? ""));
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return [lat, lng];
  // Safe seed: guard against undefined/null/NaN id
  const seed = (typeof p.id === "number" && !isNaN(p.id)) ? p.id : 42;
  const jLat = (seededRandom(seed * 3) - 0.5) * 0.1;
  const jLng = (seededRandom(seed * 7) - 0.5) * 0.1;
  const resultLat = BANHA_LAT + jLat;
  const resultLng = BANHA_LNG + jLng;
  // Final safety: if somehow still NaN, return Banha center
  if (isNaN(resultLat) || isNaN(resultLng)) return [BANHA_LAT, BANHA_LNG];
  return [resultLat, resultLng];
}

function firstImg(p: Property): string {
  try {
    const arr = typeof p.images === "string" ? JSON.parse(p.images) : (p.images ?? []);
    return Array.isArray(arr) && arr[0] ? arr[0] : "";
  } catch { return ""; }
}

function formatPrice(price?: string) {
  if (!price) return "السعر عند الطلب";
  const n = Number(price);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k ج.م`;
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

// ─── Clustering ───────────────────────────────────────────────────────────────
function clusterProperties(props: Property[], zoom: number): ClusterGroup[] {
  const cellSize = zoom < 11 ? 0.5 : zoom < 13 ? 0.15 : zoom < 15 ? 0.04 : zoom < 17 ? 0.005 : 0.001;
  const cells: Record<string, ClusterGroup> = {};
  for (const p of props) {
    const [lat, lng] = getCoords(p);
    const key = `${Math.floor(lat / cellSize)}_${Math.floor(lng / cellSize)}`;
    if (!cells[key]) cells[key] = { lat: 0, lng: 0, count: 0, ids: [], props: [] };
    cells[key].lat += lat;
    cells[key].lng += lng;
    cells[key].count += 1;
    cells[key].ids.push(p.id);
    cells[key].props.push(p);
  }
  return Object.values(cells)
    .map(c => ({ ...c, lat: c.lat / c.count, lng: c.lng / c.count }))
    .filter(c => !isNaN(c.lat) && !isNaN(c.lng));
}

// ─── Custom Icons ─────────────────────────────────────────────────────────────
function clusterIcon(count: number, isActive: boolean) {
  const size = count > 99 ? 56 : count > 9 ? 48 : 40;
  const bg = isActive ? "#0D9488" : "#134E4A";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${count > 9 ? 13 : 15}px;font-weight:800;font-family:sans-serif;
      border:3px solid rgba(255,255,255,0.85);
      box-shadow:0 4px 16px rgba(0,0,0,0.28);
      cursor:pointer;transition:transform 0.15s;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function priceIcon(price: string | undefined, isActive: boolean) {
  const label = price
    ? (Number(price) >= 1_000_000
        ? `${(Number(price) / 1_000_000).toFixed(1)}م`
        : `${Math.round(Number(price) / 1000)}k`)
    : "—";
  const bg = isActive ? "#0D9488" : "#fff";
  const color = isActive ? "#fff" : "#134E4A";
  const border = isActive ? "transparent" : "#0D9488";
  return L.divIcon({
    className: "",
    html: `<div style="
      padding:5px 12px;border-radius:20px;
      background:${bg};color:${color};
      font-size:12px;font-weight:800;font-family:sans-serif;
      border:2px solid ${border};
      box-shadow:0 2px 10px rgba(0,0,0,0.22);
      white-space:nowrap;cursor:pointer;
      transition:all 0.15s;
    ">
      <span style="font-size:9px;opacity:0.7;">ج.م </span>${label}
      <div style="
        position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:6px solid ${bg === '#fff' ? border : bg};
      "></div>
    </div>`,
    iconSize: [undefined as any, undefined as any],
    iconAnchor: [36, 28],
  });
}

// ─── Map events component ─────────────────────────────────────────────────────
function MapListener({ onUpdate }: { onUpdate: (zoom: number, bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds();
      onUpdate(map.getZoom(), { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    },
    zoomend() {
      const b = map.getBounds();
      onUpdate(map.getZoom(), { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    },
  });
  return null;
}

function FlyToCluster({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target[0], target[1]], Math.min(target[2] + 3, 17), { duration: 0.7 });
  }, [target, map]);
  return null;
}

// ─── Property Popup (shown on marker hover) ───────────────────────────────────
function PropertyPopup({ p, onNavigate }: { p: Property; onNavigate: (id: number) => void }) {
  const img = firstImg(p);
  const FALLBACK = "/placeholder-property.jpg";
  return (
    <div dir="rtl" style={{ width: 220, fontFamily: "inherit" }}>
      {/* Image */}
      <div style={{ height: 130, overflow: "hidden", borderRadius: "10px 10px 0 0", position: "relative" }}>
        <img
          src={img ? mediaUrl(img) : FALLBACK}
          alt={p.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
        />
        <span style={{
          position: "absolute", top: 8, right: 8,
          background: p.listingType === "rent" ? "#3B82F6" : "#0D9488",
          color: "#fff", fontSize: 10, fontWeight: 800,
          padding: "2px 8px", borderRadius: 20,
        }}>
          {p.listingType === "rent" ? "للإيجار" : "للبيع"}
        </span>
      </div>
      {/* Details */}
      <div style={{ padding: "10px 12px 4px" }}>
        <p style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.title}
        </p>
        <p style={{ fontWeight: 900, fontSize: 16, color: "#0D9488", marginBottom: 6 }}>
          {formatPrice(p.price)}
        </p>
        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b", marginBottom: 6, flexWrap: "wrap" }}>
          {p.rooms ? <span>🛏 {p.rooms} غرف</span> : null}
          {p.bathrooms ? <span>🚿 {p.bathrooms}</span> : null}
          {p.area ? <span>📐 {p.area}م²</span> : null}
        </div>
        {p.address && (
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <span>📍</span> {p.address}
          </p>
        )}
        <button
          onClick={() => onNavigate(p.id)}
          style={{
            width: "100%", padding: "7px 0", borderRadius: 8,
            background: "#0D9488", color: "#fff", border: "none",
            fontSize: 12, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          عرض التفاصيل ←
        </button>
      </div>
    </div>
  );
}

// ─── Property Card (sidebar) ──────────────────────────────────────────────────
function PropCard({ p, active, onClick }: { p: Property; active: boolean; onClick: () => void }) {
  const img = firstImg(p);
  const FALLBACK = "/placeholder-property.jpg";
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-md ${
        active ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border/60 bg-white"
      }`}
    >
      <div className="h-36 bg-muted relative overflow-hidden">
        {img ? (
          <img src={mediaUrl(img)} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Home className="w-10 h-10 opacity-30" />
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
          p.listingType === "rent" ? "bg-blue-500" : "bg-teal-600"
        }`}>
          {p.listingType === "rent" ? "للإيجار" : "للبيع"}
        </span>
      </div>
      <div className="p-2.5" dir="rtl">
        <p className="font-bold text-sm text-foreground truncate">{p.title}</p>
        <p className="text-gray-900 font-extrabold text-sm mt-0.5">{formatPrice(p.price)}</p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-800 flex-wrap">
          {p.rooms && <span className="flex items-center gap-0.5"><Bed className="w-3 h-3 text-gray-600" />{p.rooms}</span>}
          {p.bathrooms && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3 text-gray-600" />{p.bathrooms}</span>}
          {p.area && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3 text-gray-600" />{p.area}م²</span>}
        </div>
        {p.address && (
          <p className="flex items-center gap-0.5 text-[11px] text-gray-700 mt-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />{p.address}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Popup Marker component ───────────────────────────────────────────────────
function PopupMarker({
  g, isActive, onNavigate, onClusterClick,
}: {
  g: ClusterGroup;
  isActive: boolean;
  onNavigate: (id: number) => void;
  onClusterClick: (g: ClusterGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      ref={markerRef}
      position={[g.lat, g.lng]}
      icon={
        g.count > 1
          ? clusterIcon(g.count, isActive)
          : priceIcon(g.props[0]?.price, isActive)
      }
      eventHandlers={{
        click: () => {
          if (g.count === 1) {
            setOpen(o => !o);
          } else {
            onClusterClick(g);
          }
        },
        mouseover: () => {
          if (g.count === 1) setOpen(true);
        },
        mouseout: () => {
          // Delay so the popup can be interacted with
          setTimeout(() => setOpen(false), 300);
        },
      }}
    >
      {g.count === 1 && open && (
        <Popup
          closeButton={false}
          autoPan={false}
          offset={[0, -10]}
          className="property-map-popup"
          eventHandlers={{
            mouseover: () => setOpen(true),
            mouseout: () => setTimeout(() => setOpen(false), 300),
          }}
        >
          <PropertyPopup p={g.props[0]} onNavigate={(id) => { setOpen(false); onNavigate(id); }} />
        </Popup>
      )}
    </Marker>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapSearchPage() {
  const [, setLocation] = useLocation();
  const [zoom, setZoom] = useState(12);
  const [bounds, setBounds] = useState<MapBounds>({
    north: BANHA_LAT + 0.15, south: BANHA_LAT - 0.15,
    east: BANHA_LNG + 0.15, west: BANHA_LNG - 0.15,
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number, number] | null>(null);
  const [search, setSearch] = useState("");
  const [filterDeal, setFilterDeal] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSubType, setFilterSubType] = useState("all");
  const [filterRooms, setFilterRooms] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: fieldConfigs = [] } = useQuery<FieldConfigRow[]>({
    queryKey: ["property-field-configs"],
    queryFn: () => api.propertyFieldConfigs.list(),
    staleTime: 10 * 60_000,
  });

  const mapFieldRules = useMemo(() => {
    if (filterSubType !== "all") return getFieldRulesForMainCategory(filterSubType, fieldConfigs);
    if (filterType !== "all")    return getFieldRulesForCategorySlug(filterType, fieldConfigs);
    return null;
  }, [filterSubType, filterType, fieldConfigs]);

  const subtypeOptions = useMemo(() => {
    if (filterType === "all") return [];
    return (SLUG_TO_SUBTYPES[filterType] ?? []).map((name) => ({ value: name, label: name }));
  }, [filterType]);

  const { data: raw } = useQuery({
    queryKey: ["map-properties"],
    queryFn: async () => {
      const [r1, r2] = await Promise.all([
        (api.properties as any).list({ status: "active", limit: "200" }),
        (api.properties as any).list({ status: "approved", limit: "200" }),
      ]);
      const a1 = Array.isArray(r1) ? r1 : (r1 as any)?.data ?? [];
      const a2 = Array.isArray(r2) ? r2 : (r2 as any)?.data ?? [];
      const seen = new Set<number>();
      return [...a1, ...a2].filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    },
    staleTime: 30_000,
  });

  const allProps: Property[] = useMemo(() => {
    if (!raw) return [];
    return raw as Property[];
  }, [raw]);

  const filtered = useMemo(() => allProps.filter(p => {
    if (filterDeal !== "all" && p.listingType !== filterDeal) return false;
    if (filterSubType !== "all" && p.mainCategory !== filterSubType) return false;
    else if (filterType !== "all" && filterSubType === "all") {
      const subs = SLUG_TO_SUBTYPES[filterType] ?? [];
      if (subs.length > 0 && !subs.includes(p.mainCategory)) return false;
    }
    if (filterRooms !== "all" && p.rooms) {
      const minRooms = Number(filterRooms);
      if (p.rooms < minRooms) return false;
    }
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allProps, filterDeal, filterType, filterSubType, filterRooms, search]);

  const inBounds = useMemo(() => filtered.filter(p => {
    const [lat, lng] = getCoords(p);
    return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
  }), [filtered, bounds]);

  const clusters = useMemo(() => clusterProperties(inBounds, zoom), [inBounds, zoom]);

  const handleMapUpdate = useCallback((z: number, b: MapBounds) => {
    setZoom(z);
    setBounds(b);
  }, []);

  const handleClusterClick = useCallback((g: ClusterGroup) => {
    setFlyTarget([g.lat, g.lng, zoom]);
    setTimeout(() => setFlyTarget(null), 1000);
  }, [zoom]);

  const handleNavigate = useCallback((id: number) => {
    setLocation(`/property/${id}`);
  }, [setLocation]);

  return (
    <>
    {/* Inject popup styles */}
    <style>{`
      .property-map-popup .leaflet-popup-content-wrapper {
        padding: 0 !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
        border: none !important;
      }
      .property-map-popup .leaflet-popup-content {
        margin: 0 !important;
        width: auto !important;
      }
      .property-map-popup .leaflet-popup-tip-container { display: none; }
      /* Hide scrollbar */
      .map-sidebar::-webkit-scrollbar { display: none; }
      .map-sidebar { scrollbar-width: none; -ms-overflow-style: none; }
    `}</style>
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
      <Header />

      {/* ── Filter Bar ── */}
      <div className="shrink-0 bg-white border-b border-border/60 shadow-sm px-4 py-2 flex items-center gap-2 flex-wrap z-10">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="ابحث بالعنوان..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-8 h-8 rounded-full text-sm"
          />
        </div>
        <Select value={filterDeal} onValueChange={setFilterDeal}>
          <SelectTrigger className="h-8 w-32 rounded-full text-xs">
            <SelectValue placeholder="كل الإعلانات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الإعلانات</SelectItem>
            <SelectItem value="sale">للبيع</SelectItem>
            <SelectItem value="rent">للإيجار</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterSubType("all"); setFilterRooms("all"); }}>
          <SelectTrigger className="h-8 w-28 rounded-full text-xs">
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="residential">سكني</SelectItem>
            <SelectItem value="commercial">تجاري</SelectItem>
            <SelectItem value="land">أراضي</SelectItem>
          </SelectContent>
        </Select>

        {subtypeOptions.length > 0 && (
          <Select value={filterSubType} onValueChange={(v) => { setFilterSubType(v); setFilterRooms("all"); }}>
            <SelectTrigger className="h-8 w-32 rounded-full text-xs">
              <SelectValue placeholder="كل الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {subtypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {mapFieldRules?.rooms && (
          <Select value={filterRooms} onValueChange={setFilterRooms}>
            <SelectTrigger className="h-8 w-24 rounded-full text-xs">
              <SelectValue placeholder="الغرف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الغرف</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>
        )}

        <span className="text-xs text-muted-foreground mr-auto">{inBounds.length} عقار في المنطقة</span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full text-xs gap-1"
          onClick={() => setSidebarOpen(o => !o)}
        >
          {sidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {sidebarOpen ? "إخفاء القائمة" : "القائمة"}
        </Button>
      </div>

      {/* ── Main Split ── */}
      <div className="flex flex-1 overflow-hidden" style={{ direction: "ltr" }}>

        {/* Map */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={[BANHA_LAT, BANHA_LNG]}
            zoom={12}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <MapListener onUpdate={handleMapUpdate} />
            <FlyToCluster target={flyTarget} />

            {clusters.map((g, i) => (
              <PopupMarker
                key={`${i}-${g.count}-${g.lat.toFixed(4)}-${g.lng.toFixed(4)}`}
                g={g}
                isActive={g.ids.includes(activeId!)}
                onNavigate={handleNavigate}
                onClusterClick={handleClusterClick}
              />
            ))}
          </MapContainer>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-4 flex flex-col gap-1 z-[1000]">
            <button
              className="w-9 h-9 bg-white shadow-md rounded-lg text-xl font-bold flex items-center justify-center hover:bg-gray-50 border border-border/60"
              onClick={() => setZoom(z => Math.min(z + 1, 18))}
            >+</button>
            <button
              className="w-9 h-9 bg-white shadow-md rounded-lg text-xl font-bold flex items-center justify-center hover:bg-gray-50 border border-border/60"
              onClick={() => setZoom(z => Math.max(z - 1, 3))}
            >−</button>
          </div>

          {/* Zoom hint */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-gray-600 shadow-sm border border-border/40 pointer-events-none">
            🔍 كبّر الخريطة لرؤية بالونات الأسعار — مرّر على البالون لتفاصيل العقار
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-[380px] shrink-0 bg-gray-50 border-l border-border/60 flex flex-col overflow-hidden" dir="rtl">
            <div className="px-3 py-2 bg-white border-b border-border/40 shrink-0">
              <p className="text-sm font-bold text-foreground">{inBounds.length} عقار في المنطقة الحالية</p>
              <p className="text-xs text-muted-foreground">حرّك الخريطة لاستعراض المزيد</p>
            </div>
            <div className="map-sidebar flex-1 overflow-y-auto p-3">
              {inBounds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                  <MapPin className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">لا توجد عقارات في هذه المنطقة</p>
                  <p className="text-xs text-muted-foreground">حرّك الخريطة أو قلّل التكبير</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {inBounds.map(p => (
                    <PropCard
                      key={p.id}
                      p={p}
                      active={p.id === activeId}
                      onClick={() => {
                        setActiveId(p.id);
                        setLocation(`/property/${p.id}`);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    <RealEstateFooter />
    </>
  );
}
