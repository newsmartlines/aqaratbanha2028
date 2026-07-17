import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import { api, mediaUrl } from "@/lib/api";
import { Header } from "@/components/Header";
import {
  Home,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFieldRulesForMainCategory,
  getFieldRulesForCategorySlug,
  SLUG_TO_SUBTYPES,
  type FieldConfigRow,
} from "@/lib/property-field-rules";
import {
  getCirclePathOptions,
  getCircleRadius,
} from "@/lib/circleStyles";
import "leaflet/dist/leaflet.css";

// ─── Types ─────────────────────────────────────────────────────────────────────
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

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const BANHA_LAT = 30.468;
const BANHA_LNG = 31.183;

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Returns real coordinates or null — never fakes random coords for missing data. */
function getCoords(p: Property): LatLngTuple | null {
  const lat = parseFloat(String(p.latitude ?? ""));
  const lng = parseFloat(String(p.longitude ?? ""));
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return [lat, lng];
  return null;
}

function firstImg(p: Property): string {
  try {
    const arr =
      typeof p.images === "string"
        ? JSON.parse(p.images)
        : (p.images ?? []);
    return Array.isArray(arr) && arr[0] ? arr[0] : "";
  } catch {
    return "";
  }
}

function formatPrice(price?: string) {
  if (!price) return "السعر عند الطلب";
  const n = Number(price);
  if (isNaN(n) || n === 0) return "السعر عند الطلب";
  return `${n.toLocaleString("en-US")} ج.م`;
}

// ─── Map sub-components ────────────────────────────────────────────────────────

/** Stores the map instance in a ref so external controls can use it. */
function MapInstanceRef({
  mapRef,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

/** Syncs map bounds/zoom to parent state on every move/zoom end. */
function MapListener({
  onUpdate,
}: {
  onUpdate: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds();
      onUpdate({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
    zoomend() {
      const b = map.getBounds();
      onUpdate({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
}

/**
 * Fits all geo-located properties into view once when they first load.
 * If the bounding zoom would be < 12 (properties too spread out to see
 * 100 m circles), fall back to centering on the centroid at zoom 13.
 */
function MapAutoFit({ geoProps }: { geoProps: Property[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || geoProps.length === 0) return;
    const points = geoProps
      .map(getCoords)
      .filter((c): c is LatLngTuple => c !== null);
    if (points.length === 0) return;
    fitted.current = true;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true, duration: 0.7 });
      return;
    }

    const bounds = L.latLngBounds(points);
    const targetZoom = map.getBoundsZoom(bounds, false, [48, 48] as any);

    if (targetZoom >= 14) {
      // Circles will be clearly visible — fit them all in view
      map.fitBounds(bounds, { padding: [48, 48], animate: true, duration: 0.7 });
    } else {
      // Properties span too large an area for circles to be visible at the
      // fitted zoom; instead center on the largest density cluster at zoom 14.
      const centroidLat = points.reduce((s, p) => s + p[0], 0) / points.length;
      const centroidLng = points.reduce((s, p) => s + p[1], 0) / points.length;
      map.setView([centroidLat, centroidLng], 14, { animate: true, duration: 0.7 });
    }
  }, [geoProps, map]);

  return null;
}

/** Smoothly flies to the selected property whenever activeId changes. */
function FlyToProperty({
  activeId,
  propMap,
}: {
  activeId: number | null;
  propMap: Map<number, LatLngTuple>;
}) {
  const map = useMap();

  useEffect(() => {
    if (activeId === null) return;
    const coords = propMap.get(activeId);
    if (!coords) return;
    map.flyTo(coords, Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.5,
    });
  }, [activeId, propMap, map]);

  return null;
}

// ─── PropertyCircle ────────────────────────────────────────────────────────────
interface PropertyCircleProps {
  p: Property;
  coords: LatLngTuple;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const PropertyCircle = memo(function PropertyCircle({
  p,
  coords,
  isSelected,
  onSelect,
}: PropertyCircleProps) {
  const [hovered, setHovered] = useState(false);

  const radius = getCircleRadius(isSelected, hovered);
  const pathOptions = useMemo(
    () => getCirclePathOptions(isSelected, hovered),
    [isSelected, hovered],
  );

  const eventHandlers = useMemo(
    () => ({
      click: () => onSelect(p.id),
      mouseover: () => setHovered(true),
      mouseout: () => setHovered(false),
    }),
    [p.id, onSelect],
  );

  return (
    <Circle
      center={coords}
      radius={radius}
      pathOptions={pathOptions}
      eventHandlers={eventHandlers}
    />
  );
});

// ─── PropCard ──────────────────────────────────────────────────────────────────
interface PropCardProps {
  p: Property;
  active: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}

const PropCard = memo(function PropCard({
  p,
  active,
  onSelect,
  onNavigate,
}: PropCardProps) {
  const img = firstImg(p);
  const FALLBACK = "/placeholder-property.jpg";

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-md ${
        active
          ? "border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-white"
          : "border-border/60 bg-white"
      }`}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-muted relative overflow-hidden">
        {img ? (
          <img
            src={mediaUrl(img)}
            alt={p.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Home className="w-10 h-10 opacity-30" />
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
            p.listingType === "rent" ? "bg-blue-500" : "bg-teal-600"
          }`}
        >
          {p.listingType === "rent" ? "للإيجار" : "للبيع"}
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5" dir="rtl">
        <p className="font-bold text-sm text-foreground truncate">{p.title}</p>
        <p className="text-gray-900 font-extrabold text-sm mt-0.5">
          {formatPrice(p.price)}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-800 flex-wrap">
          {p.rooms && (
            <span className="flex items-center gap-0.5">
              <Bed className="w-3 h-3 text-gray-600" />
              {p.rooms}
            </span>
          )}
          {p.bathrooms && (
            <span className="flex items-center gap-0.5">
              <Bath className="w-3 h-3 text-gray-600" />
              {p.bathrooms}
            </span>
          )}
          {p.area && (
            <span className="flex items-center gap-0.5">
              <Maximize2 className="w-3 h-3 text-gray-600" />
              {p.area}م²
            </span>
          )}
        </div>
        {p.address && (
          <p className="flex items-center gap-0.5 text-[11px] text-gray-700 mt-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {p.address}
          </p>
        )}

        {/* Navigate — stops propagation so it doesn't also trigger onSelect */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="mt-2 w-full text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-blue-50 transition-colors"
        >
          عرض التفاصيل
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MapSearchPage() {
  const [, setLocation] = useLocation();

  const [bounds, setBounds] = useState<MapBounds>({
    north: BANHA_LAT + 0.15,
    south: BANHA_LAT - 0.15,
    east: BANHA_LNG + 0.15,
    west: BANHA_LNG - 0.15,
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterDeal, setFilterDeal] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSubType, setFilterSubType] = useState("all");
  const [filterRooms, setFilterRooms] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Leaflet map instance ref — set by MapInstanceRef inside MapContainer
  const mapRef = useRef<L.Map | null>(null);
  // Per-card DOM refs for scroll-into-view
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll the selected card into view whenever activeId changes
  useEffect(() => {
    if (activeId === null) return;
    const el = cardRefs.current.get(activeId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: fieldConfigs = [] } = useQuery<FieldConfigRow[]>({
    queryKey: ["property-field-configs"],
    queryFn: () => api.propertyFieldConfigs.list(),
    staleTime: 10 * 60_000,
  });

  const mapFieldRules = useMemo(() => {
    if (filterSubType !== "all")
      return getFieldRulesForMainCategory(filterSubType, fieldConfigs);
    if (filterType !== "all")
      return getFieldRulesForCategorySlug(filterType, fieldConfigs);
    return null;
  }, [filterSubType, filterType, fieldConfigs]);

  const subtypeOptions = useMemo(() => {
    if (filterType === "all") return [];
    return (SLUG_TO_SUBTYPES[filterType] ?? []).map((name) => ({
      value: name,
      label: name,
    }));
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
      return [...a1, ...a2].filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    },
    staleTime: 30_000,
  });

  const allProps: Property[] = useMemo(
    () => (raw ? (raw as Property[]) : []),
    [raw],
  );

  const filtered = useMemo(
    () =>
      allProps.filter((p) => {
        if (filterDeal !== "all" && p.listingType !== filterDeal) return false;
        if (filterSubType !== "all" && p.mainCategory !== filterSubType)
          return false;
        else if (filterType !== "all" && filterSubType === "all") {
          const subs = SLUG_TO_SUBTYPES[filterType] ?? [];
          if (subs.length > 0 && !subs.includes(p.mainCategory)) return false;
        }
        if (filterRooms !== "all" && p.rooms) {
          if (p.rooms < Number(filterRooms)) return false;
        }
        if (
          search &&
          !p.title?.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [allProps, filterDeal, filterType, filterSubType, filterRooms, search],
  );

  // Only properties with real coordinates (shown on map)
  const geoProps = useMemo(
    () => filtered.filter((p) => getCoords(p) !== null),
    [filtered],
  );

  // Pre-computed coords map for fast lookup (avoids repeated parseFloat in render)
  const coordsMap = useMemo(() => {
    const m = new Map<number, LatLngTuple>();
    for (const p of geoProps) {
      const c = getCoords(p);
      if (c) m.set(p.id, c);
    }
    return m;
  }, [geoProps]);

  // Properties visible in current map bounds (sidebar list)
  const inBounds = useMemo(
    () =>
      filtered.filter((p) => {
        const c = coordsMap.get(p.id);
        if (!c) return false;
        return (
          c[0] <= bounds.north &&
          c[0] >= bounds.south &&
          c[1] <= bounds.east &&
          c[1] >= bounds.west
        );
      }),
    [filtered, coordsMap, bounds],
  );

  // ── Callbacks ────────────────────────────────────────────────────────────────
  const handleMapUpdate = useCallback((b: MapBounds) => {
    setBounds(b);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const handleNavigate = useCallback(
    (id: number) => {
      setLocation(`/property/${id}`);
    },
    [setLocation],
  );

  // Stable ref-setter factory
  const setCardRef = useCallback(
    (id: number) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .map-sidebar::-webkit-scrollbar { display: none; }
        .map-sidebar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
        <Header />

        {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-b border-border/60 shadow-sm px-4 py-2 flex items-center gap-2 flex-wrap z-10">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="ابحث بالعنوان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <Select
            value={filterType}
            onValueChange={(v) => {
              setFilterType(v);
              setFilterSubType("all");
              setFilterRooms("all");
            }}
          >
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
            <Select
              value={filterSubType}
              onValueChange={(v) => {
                setFilterSubType(v);
                setFilterRooms("all");
              }}
            >
              <SelectTrigger className="h-8 w-32 rounded-full text-xs">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {subtypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
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

          <span className="text-xs text-muted-foreground mr-auto">
            {inBounds.length} عقار في المنطقة
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-xs gap-1"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
            {sidebarOpen ? "إخفاء القائمة" : "القائمة"}
          </Button>
        </div>

        {/* ── Main Split ──────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden" style={{ direction: "ltr" }}>

          {/* Map column */}
          <div
            className="flex-1 relative z-0 overflow-hidden"
            style={{ borderRadius: 0 }}
          >
            {/* Fade-in wrapper — same pattern as PropertyMap */}
            <div className="absolute inset-0">
              <MapContainer
                center={[BANHA_LAT, BANHA_LNG]}
                zoom={13}
                className="h-full w-full"
                zoomControl={false}
                scrollWheelZoom
                dragging
                doubleClickZoom
                touchZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
                />

                {/* Internals */}
                <MapInstanceRef mapRef={mapRef} />
                <MapListener onUpdate={handleMapUpdate} />
                <MapAutoFit geoProps={geoProps} />
                <FlyToProperty activeId={activeId} propMap={coordsMap} />

                {/* One circle per geo-located property */}
                {geoProps.map((p) => {
                  const coords = coordsMap.get(p.id);
                  if (!coords) return null;
                  return (
                    <PropertyCircle
                      key={p.id}
                      p={p}
                      coords={coords}
                      isSelected={p.id === activeId}
                      onSelect={handleSelect}
                    />
                  );
                })}
              </MapContainer>
            </div>

            {/* Zoom controls — outside MapContainer, uses mapRef */}
            <div className="absolute bottom-6 left-4 flex flex-col gap-1 z-[1000]">
              <button
                className="w-9 h-9 bg-white shadow-md rounded-lg text-xl font-bold flex items-center justify-center hover:bg-gray-50 border border-border/60 transition-colors"
                onClick={() => mapRef.current?.zoomIn()}
                aria-label="تكبير"
              >
                +
              </button>
              <button
                className="w-9 h-9 bg-white shadow-md rounded-lg text-xl font-bold flex items-center justify-center hover:bg-gray-50 border border-border/60 transition-colors"
                onClick={() => mapRef.current?.zoomOut()}
                aria-label="تصغير"
              >
                −
              </button>
            </div>

            {/* Count badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-gray-600 shadow-sm border border-border/40 pointer-events-none select-none">
              {geoProps.length} عقار على الخريطة — انقر على دائرة لاختيار العقار
            </div>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div
              className="w-[380px] shrink-0 bg-gray-50 border-l border-border/60 flex flex-col overflow-hidden"
              dir="rtl"
            >
              <div className="px-3 py-2 bg-white border-b border-border/40 shrink-0">
                <p className="text-sm font-bold text-foreground">
                  {inBounds.length} عقار في المنطقة الحالية
                </p>
                <p className="text-xs text-muted-foreground">
                  حرّك الخريطة لاستعراض المزيد
                </p>
              </div>

              <div className="map-sidebar flex-1 overflow-y-auto p-3">
                {inBounds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                    <MapPin className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      لا توجد عقارات في هذه المنطقة
                    </p>
                    <p className="text-xs text-muted-foreground">
                      حرّك الخريطة أو قلّل التكبير
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {inBounds.map((p) => (
                      <div
                        key={p.id}
                        ref={setCardRef(p.id)}
                      >
                        <PropCard
                          p={p}
                          active={p.id === activeId}
                          onSelect={() => handleSelect(p.id)}
                          onNavigate={() => handleNavigate(p.id)}
                        />
                      </div>
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
