import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { api, mediaUrl } from "@/lib/api";
import { Header } from "@/components/Header";
import { Home, Bed, Bath, Maximize2, MapPin, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
// Banha, Egypt center
const BANHA_LAT = 30.468;
const BANHA_LNG = 31.183;

// Seeded pseudo-random for stable coords
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getCoords(p: Property): [number, number] {
  if (p.latitude && p.longitude) return [Number(p.latitude), Number(p.longitude)];
  // Scatter around Banha with seeded jitter (±0.05°)
  const jLat = (seededRandom(p.id * 3) - 0.5) * 0.1;
  const jLng = (seededRandom(p.id * 7) - 0.5) * 0.1;
  return [BANHA_LAT + jLat, BANHA_LNG + jLng];
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
  const cellSize = zoom < 11 ? 0.5 : zoom < 13 ? 0.15 : zoom < 15 ? 0.04 : 0.01;
  const cells: Record<string, ClusterGroup> = {};

  for (const p of props) {
    const [lat, lng] = getCoords(p);
    const key = `${Math.floor(lat / cellSize)}_${Math.floor(lng / cellSize)}`;
    if (!cells[key]) {
      cells[key] = { lat: 0, lng: 0, count: 0, ids: [], props: [] };
    }
    cells[key].lat += lat;
    cells[key].lng += lng;
    cells[key].count += 1;
    cells[key].ids.push(p.id);
    cells[key].props.push(p);
  }

  return Object.values(cells).map(c => ({
    ...c,
    lat: c.lat / c.count,
    lng: c.lng / c.count,
  }));
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
      border:3px solid rgba(255,255,255,0.8);
      box-shadow:0 4px 16px rgba(0,0,0,0.25);
      cursor:pointer;
      transition:transform 0.15s;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function priceIcon(price: string | undefined, isActive: boolean) {
  const label = price ? `${Math.round(Number(price) / 1000)}k` : "بدون سعر";
  const bg = isActive ? "#0D9488" : "#fff";
  const color = isActive ? "#fff" : "#134E4A";
  const border = isActive ? "transparent" : "#0D9488";
  return L.divIcon({
    className: "",
    html: `<div style="
      padding:4px 10px;border-radius:20px;
      background:${bg};color:${color};
      font-size:12px;font-weight:800;font-family:sans-serif;
      border:2px solid ${border};
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
      white-space:nowrap;cursor:pointer;
    ">${label}</div>`,
    iconSize: [undefined as any, undefined as any],
    iconAnchor: [30, 14],
  });
}

// ─── Map events component ─────────────────────────────────────────────────────
function MapListener({ onUpdate }: { onUpdate: (zoom: number, bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds();
      onUpdate(map.getZoom(), {
        north: b.getNorth(), south: b.getSouth(),
        east: b.getEast(), west: b.getWest(),
      });
    },
    zoomend() {
      const b = map.getBounds();
      onUpdate(map.getZoom(), {
        north: b.getNorth(), south: b.getSouth(),
        east: b.getEast(), west: b.getWest(),
      });
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

// ─── Property Card ────────────────────────────────────────────────────────────
function PropCard({ p, active, onClick }: { p: Property; active: boolean; onClick: () => void }) {
  const img = firstImg(p);
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-md ${
        active ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border/60 bg-white"
      }`}
    >
      {/* Image */}
      <div className="h-36 bg-muted relative overflow-hidden">
        {img ? (
          <img src={mediaUrl(img)} alt={p.title} className="w-full h-full object-cover" />
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
      {/* Info */}
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Filter
  const filtered = useMemo(() => allProps.filter(p => {
    if (filterDeal !== "all" && p.listingType !== filterDeal) return false;
    if (filterType !== "all" && p.mainCategory !== filterType) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allProps, filterDeal, filterType, search]);

  // Properties in current map bounds
  const inBounds = useMemo(() => filtered.filter(p => {
    const [lat, lng] = getCoords(p);
    return lat <= bounds.north && lat >= bounds.south && lng <= bounds.west * 0 + bounds.east && lng >= bounds.west;
  }), [filtered, bounds]);

  // Clusters
  const clusters = useMemo(() => clusterProperties(inBounds, zoom), [inBounds, zoom]);

  const handleMapUpdate = useCallback((z: number, b: MapBounds) => {
    setZoom(z);
    setBounds(b);
  }, []);

  const handleClusterClick = useCallback((g: ClusterGroup) => {
    if (g.count === 1) {
      setActiveId(g.ids[0]);
      setLocation(`/property/${g.ids[0]}`);
    } else {
      setFlyTarget([g.lat, g.lng, zoom]);
      setTimeout(() => setFlyTarget(null), 1000);
    }
  }, [zoom, setLocation]);

  return (
    <>
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
          <SelectTrigger className="h-8 w-28 rounded-full text-xs">
            <SelectValue placeholder="كل الصفقات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الصفقات</SelectItem>
            <SelectItem value="sale">للبيع</SelectItem>
            <SelectItem value="rent">للإيجار</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
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

        {/* Map — takes remaining space */}
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
              <Marker
                key={`${i}-${g.count}-${g.lat.toFixed(4)}`}
                position={[g.lat, g.lng]}
                icon={
                  g.count > 1
                    ? clusterIcon(g.count, g.ids.includes(activeId!))
                    : priceIcon(g.props[0]?.price, g.ids[0] === activeId)
                }
                eventHandlers={{
                  click: () => handleClusterClick(g),
                  mouseover: () => g.count === 1 && setActiveId(g.ids[0]),
                  mouseout: () => g.count === 1 && activeId === g.ids[0] && setActiveId(null),
                }}
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
        </div>

        {/* Sidebar — property cards */}
        {sidebarOpen && (
          <div className="w-[380px] shrink-0 bg-gray-50 border-l border-border/60 flex flex-col overflow-hidden" dir="rtl">
            <div className="px-3 py-2 bg-white border-b border-border/40 shrink-0">
              <p className="text-sm font-bold text-foreground">{inBounds.length} عقار في المنطقة الحالية</p>
              <p className="text-xs text-muted-foreground">حرّك الخريطة لاستعراض المزيد</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
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
