import { useState, useMemo, useEffect, useCallback, useRef } from "react";

/** Dubizzle-style smart scroll: sidebar scrolls independently;
 *  when it hits its boundary the page scroll takes over. */
function useSidebarSmartScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop    = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const goingUp  = e.deltaY < 0;
      const goingDown = e.deltaY > 0;
      if ((goingUp && atTop) || (goingDown && atBottom)) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}
import { useLocation } from "wouter";
import { PropertyImageGallery } from "@/components/property-image-gallery";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { AdBanner } from "@/components/AdBanner";
import {
  Search, MapPin, LayoutGrid, List as ListIcon, X, Loader2,
  BedDouble, Bath, Maximize2, Crown, Eye, Heart, ChevronDown,
  Phone, SlidersHorizontal, Check, Clock,
  Building2, Home, TreePine, Factory, Zap,
  Car, Trees, Waves, Shield, Wifi, Flame, Wind,
  UtensilsCrossed, Star, ArrowUpDown, RotateCcw, ChevronUp, BadgeCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { resolveMainCategory, getFieldRules, type FieldConfigRow } from "@/lib/property-field-rules";
import { DynamicFilterPanel } from "@/components/property-form/DynamicFilterPanel";
import { PropertyTooltip } from "@/components/PropertyTooltip";
import { formatPrice } from "@/lib/format";

/* ─── WhatsApp Icon ─────────────────────────────────────────────── */
const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.54 5.879L.057 23.882l6.162-1.615A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.016-1.38l-.36-.214-3.727.977.996-3.638-.235-.374A9.79 9.79 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818 5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z" />
  </svg>
);

/* ─── Maps ───────────────────────────────────────────────────────── */
const LISTING_TYPE_MAP: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const CATEGORY_MAP: Record<string, string> = {
  residential: "سكني", commercial: "تجاري", land: "أراضي", industrial: "صناعي",
};
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  residential: <Home className="w-4 h-4" />,
  commercial: <Building2 className="w-4 h-4" />,
  land: <TreePine className="w-4 h-4" />,
  industrial: <Factory className="w-4 h-4" />,
};
const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  residential: [
    { value: "apartment", label: "شقة" }, { value: "villa", label: "فيلا" },
    { value: "duplex", label: "دوبلكس" }, { value: "roof", label: "روف" },
    { value: "chalet", label: "شاليه" }, { value: "studio", label: "استوديو" },
    { value: "building", label: "عمارة" },
  ],
  commercial: [
    { value: "shop", label: "محل" }, { value: "office", label: "مكتب" },
    { value: "showroom", label: "معرض" }, { value: "warehouse", label: "مستودع" },
    { value: "clinic", label: "عيادة" }, { value: "hotel", label: "فندق" },
  ],
  land: [
    { value: "residential_land", label: "أرض سكنية" },
    { value: "commercial_land", label: "أرض تجارية" },
    { value: "farm", label: "مزرعة" },
    { value: "industrial_land", label: "أرض صناعية" },
  ],
};
const BEDS_OPTS = [
  { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
  { value: "4", label: "4" }, { value: "5", label: "5+" },
];
const BATHS_OPTS = [
  { value: "1", label: "1" }, { value: "2", label: "2" },
  { value: "3", label: "3" }, { value: "4", label: "4+" },
];
const FLOOR_OPTS = [
  { value: "0", label: "أرضي" }, { value: "1", label: "1" }, { value: "2", label: "2" },
  { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5+" },
];
const FINISHING_OPTS = [
  { value: "full", label: "تشطيب كامل" },
  { value: "half", label: "نصف تشطيب" },
  { value: "none", label: "بدون تشطيب" },
  { value: "luxury", label: "تشطيب فندقي" },
  { value: "super_luxury", label: "سوبر لوكس" },
];
const CONDITION_OPTS = [
  { value: "new", label: "جديد" },
  { value: "used", label: "مستعمل" },
  { value: "under_construction", label: "تحت الإنشاء" },
];
const FURNISHED_OPTS = [
  { value: "furnished", label: "مفروش" },
  { value: "semi", label: "نصف مفروش" },
  { value: "unfurnished", label: "غير مفروش" },
];
const DIRECTION_OPTS = [
  { value: "north", label: "بحري" }, { value: "south", label: "قبلي" },
  { value: "east", label: "شرقي" }, { value: "west", label: "غربي" },
  { value: "north_east", label: "بحري شرقي" }, { value: "north_west", label: "بحري غربي" },
  { value: "south_east", label: "قبلي شرقي" }, { value: "south_west", label: "قبلي غربي" },
];
const FACADE_OPTS = [
  { value: "street", label: "شارع" }, { value: "corner", label: "ركن" },
  { value: "garden", label: "حديقة" }, { value: "pool", label: "بحيرة / حمام" },
];
const PAYMENT_OPTS = [
  { value: "cash", label: "كاش" }, { value: "installment", label: "تقسيط" },
  { value: "both", label: "كاش أو تقسيط" },
];
const RENT_DURATION_OPTS = [
  { value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" }, { value: "yearly", label: "سنوي" },
];
const ADVERTISER_OPTS = [
  { value: "owner", label: "مالك" }, { value: "agent", label: "وسيط" },
  { value: "company", label: "شركة" },
];
const AGE_OPTS = [
  { value: "0", max: "1", label: "أقل من سنة" },
  { value: "1", max: "5", label: "1 — 5 سنوات" },
  { value: "5", max: "10", label: "5 — 10 سنوات" },
  { value: "10", max: "20", label: "10 — 20 سنة" },
  { value: "20", max: "100", label: "أكثر من 20 سنة" },
];
// AMENITIES and NEARBY_SERVICES are loaded dynamically from the API (see SearchPage)
const SORT_OPTS = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "area_asc", label: "المساحة: الأصغر أولاً" },
  { value: "area_desc", label: "المساحة: الأكبر أولاً" },
  { value: "popular", label: "الأكثر مشاهدة" },
];
const DEFAULT_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

/* ─── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "منذ لحظات";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} ${day === 1 ? "يوم" : "أيام"}`;
  return `منذ ${Math.floor(day / 30)} شهر`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface PropertyResult {
  id: number; title: string; description: string | null;
  mainCategory: string; subCategory: string | null;
  listingType: string; price: string | null;
  area: string | null; rooms: number | null; bathrooms: number | null;
  floor: number | null; buildYear: number | null;
  finishing: string | null; condition: string | null; furnished: string | null;
  direction: string | null; paymentMethod: string | null;
  advertiserType: string | null; urgent: boolean | null;
  district: string | null; address: string | null; compound: string | null;
  images: string | null; phone: string | null; whatsapp: string | null;
  features: string | null; nearbyServices: string | null;
  status: string | null; featured: boolean | null;
  viewCount: number; createdAt: string;
  agentName?: string | null; agentAvatar?: string | null;
  agentLogo?: string | null; verified?: boolean | null;
  providerId?: number | null;
}

/* ─── Filter state interface ─────────────────────────────────────── */
interface Filters {
  q: string;
  listingType: string;
  category: string;
  subCategory: string;
  city: string;
  district: string;
  compound: string;
  street: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  rooms: string;
  bathrooms: string;
  floor: string;
  ageRange: string;
  finishing: string;
  condition: string;
  furnished: string;
  direction: string;
  facade: string;
  paymentMethod: string;
  rentDuration: string;
  advertiserType: string;
  amenities: string[];
  nearbyServices: string[];
  featured: boolean;
  urgent: boolean;
  sortBy: string;
}

const DEFAULT_FILTERS: Filters = {
  q: "", listingType: "all", category: "all", subCategory: "all",
  city: "", district: "", compound: "", street: "",
  priceMin: "", priceMax: "", areaMin: "", areaMax: "",
  rooms: "", bathrooms: "", floor: "", ageRange: "",
  finishing: "", condition: "", furnished: "", direction: "", facade: "",
  paymentMethod: "", rentDuration: "", advertiserType: "",
  amenities: [], nearbyServices: [], featured: false, urgent: false,
  sortBy: "newest",
};

/* ─── Accordion Section ────────────────────────────────────────────── */
function Section({ title, children, open: defaultOpen = true, badge, onReset }: {
  title: string; children: React.ReactNode; open?: boolean; badge?: number; onReset?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-7 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 group"
        >
          <span className="text-[13px] font-bold text-zinc-900">{title}</span>
          {badge != null && badge > 0 && (
            <span className="w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">{badge}</span>
          )}
          <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {onReset && badge != null && badge > 0 && (
          <button onClick={onReset} className="text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors">
            إعادة
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Pill button ────────────────────────────────────────────────── */
function Pill({ active, onClick, children, sm }: {
  active: boolean; onClick: () => void; children: React.ReactNode; sm?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-semibold transition-all select-none
        ${sm ? "px-3 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]"}
        ${active
          ? "bg-primary text-white shadow-sm"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
        }`}
    >
      {children}
    </button>
  );
}

/* ─── Dynamic features/services panel for search sidebar ────────── */
function DynamicFeaturesPanel({ group, category, amenities, nearbyServices, onAmenitiesChange, onNearbyChange }: {
  group: string; category: string;
  amenities: string[]; nearbyServices: string[];
  onAmenitiesChange: (vals: string[]) => void;
  onNearbyChange: (vals: string[]) => void;
}) {
  const { data: featuresList = [] } = useQuery<any[]>({
    queryKey: ["dynamic-filters", group, category, "feature"],
    queryFn: () => api.propertyFeatures.dynamicFilters(group, category, "feature"),
    staleTime: 5 * 60_000,
  });
  const { data: servicesList = [] } = useQuery<any[]>({
    queryKey: ["dynamic-filters", "all", "", "service"],
    queryFn: () => api.propertyFeatures.dynamicFilters("all", "", "service"),
    staleTime: 5 * 60_000,
  });
  return (
    <>
      {featuresList.length > 0 && (
        <Section title="المميزات والمرافق" open={false} badge={amenities.length}>
          <DynamicFilterPanel
            group={group} category={category}
            selected={amenities} onChange={onAmenitiesChange}
            compact
          />
        </Section>
      )}
      {servicesList.length > 0 && (
        <Section title="قرب الخدمات والمواصلات" open={false} badge={nearbyServices.length}>
          <DynamicFilterPanel
            group="all" category=""
            selected={nearbyServices} onChange={onNearbyChange}
            featureType="service" compact
          />
        </Section>
      )}
    </>
  );
}

/* ─── Toggle option (checkbox style) ─────────────────────────────── */
function ToggleOpt({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full py-1.5 group text-right"
    >
      <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0
        ${active ? "bg-primary border-primary" : "border-zinc-300 group-hover:border-zinc-400"}`}>
        {active && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className={`text-[13px] transition-colors leading-snug
        ${active ? "text-zinc-900 font-semibold" : "text-zinc-600 group-hover:text-zinc-800"}`}>
        {children}
      </span>
    </button>
  );
}

/* ─── Price / Area range inputs ──────────────────────────────────── */
function RangeInputs({ minVal, maxVal, onMin, onMax, placeholder }: {
  minVal: string; maxVal: string;
  onMin: (v: string) => void; onMax: (v: string) => void;
  suffix?: string; placeholder?: [string, string];
}) {
  function formatDisplay(val: string) {
    if (!val) return "";
    const n = Number(val.replace(/,/g, ""));
    return isNaN(n) ? val : n.toLocaleString("en-US");
  }
  return (
    <div className="flex items-stretch border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {/* Max value — left side (RTL) */}
      <div className="flex-1">
        <input
          type="text" inputMode="numeric"
          placeholder={placeholder?.[1] ?? "حد أقصى"}
          value={formatDisplay(maxVal)}
          onChange={e => onMax(e.target.value.replace(/,/g, ""))}
          className="w-full h-10 px-3 text-sm text-center focus:outline-none placeholder:text-zinc-400 bg-transparent"
          dir="ltr"
        />
      </div>
      {/* Separator */}
      <div className="flex items-center px-2 border-x border-zinc-200 text-zinc-400 text-xs font-semibold select-none">
        إلى
      </div>
      {/* Min value — right side (RTL) */}
      <div className="flex-1">
        <input
          type="text" inputMode="numeric"
          placeholder={placeholder?.[0] ?? "الحد الأدنى"}
          value={formatDisplay(minVal)}
          onChange={e => onMin(e.target.value.replace(/,/g, ""))}
          className="w-full h-10 px-3 text-sm text-center focus:outline-none placeholder:text-zinc-400 bg-transparent"
          dir="ltr"
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function SearchPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [path] = useLocation();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [mobileFilters, setMobileFilters] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  useSidebarSmartScroll(filterPanelRef);

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const urlSig = typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}` : path;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setFilters(prev => ({
      ...prev,
      q: sp.get("q") ?? "",
      listingType: sp.get("listingType") ?? "all",
      category: sp.get("category") ?? "all",
      subCategory: sp.get("subCategory") ?? "all",
      city: sp.get("city") ?? "",
      district: sp.get("district") ?? "",
      compound: sp.get("compound") ?? "",
    }));
  }, [urlSig]);

  useEffect(() => { set("subCategory", "all"); }, [filters.category]);

  // Auto-correct: if min > max, snap max up to min immediately
  useEffect(() => {
    if (filters.priceMin && filters.priceMax && Number(filters.priceMin) > Number(filters.priceMax)) {
      set("priceMax", filters.priceMin);
    }
  }, [filters.priceMin, filters.priceMax]);

  useEffect(() => {
    if (filters.areaMin && filters.areaMax && Number(filters.areaMin) > Number(filters.areaMax)) {
      set("areaMax", filters.areaMin);
    }
  }, [filters.areaMin, filters.areaMax]);

  const debouncedFilters = useDebounce(filters, 400);

  const buildParams = useCallback((f: Filters) => {
    const p: Record<string, string> = { status: "active" };
    if (f.q.trim()) p.search = f.q.trim();
    if (f.listingType !== "all") p.listingType = f.listingType;
    if (f.category !== "all") p.category = f.category;
    if (f.subCategory !== "all") p.subCategory = f.subCategory;
    if (f.city.trim()) p.city = f.city.trim();
    if (f.district.trim()) p.district = f.district.trim();
    if (f.compound.trim()) p.compound = f.compound.trim();
    if (f.street.trim()) p.street = f.street.trim();
    if (f.priceMin) p.priceMin = f.priceMin;
    if (f.priceMax) p.priceMax = f.priceMax;
    if (f.areaMin) p.areaMin = f.areaMin;
    if (f.areaMax) p.areaMax = f.areaMax;
    if (f.rooms) p.rooms = f.rooms;
    if (f.bathrooms) p.bathrooms = f.bathrooms;
    if (f.floor) p.floor = f.floor;
    if (f.ageRange) {
      const ag = AGE_OPTS.find(a => a.value === f.ageRange);
      if (ag) { p.ageMin = ag.value; p.ageMax = ag.max; }
    }
    if (f.finishing) p.finishing = f.finishing;
    if (f.condition) p.condition = f.condition;
    if (f.furnished) p.furnished = f.furnished;
    if (f.direction) p.direction = f.direction;
    if (f.facade) p.facade = f.facade;
    if (f.paymentMethod) p.paymentMethod = f.paymentMethod;
    if (f.rentDuration) p.rentDuration = f.rentDuration;
    if (f.advertiserType) p.advertiserType = f.advertiserType;
    if (f.amenities.length > 0) p.features = f.amenities.join(",");
    if (f.nearbyServices.length > 0) p.nearbyServices = f.nearbyServices.join(",");
    if (f.featured) p.featured = "true";
    if (f.urgent) p.urgent = "true";
    if (f.sortBy !== "newest") p.sortBy = f.sortBy;
    return p;
  }, []);

  const { data: properties = [], isFetching } = useQuery<PropertyResult[]>({
    queryKey: ["properties-search", debouncedFilters],
    queryFn: async () => {
      const params = buildParams(debouncedFilters);
      const res = await fetch(`/api/properties?${new URLSearchParams(params)}`, { credentials: "include" });
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 15_000,
  });

  const activeMainCategory = useMemo(
    () => resolveMainCategory(filters.category, filters.subCategory),
    [filters.category, filters.subCategory]
  );

  const { data: fieldConfigs = [] } = useQuery<FieldConfigRow[]>({
    queryKey: ["property-field-configs"],
    queryFn:  () => api.propertyFieldConfigs.list(),
    staleTime: 10 * 60_000,
  });

  const fieldRules = useMemo(
    () => getFieldRules(filters.category, filters.subCategory, fieldConfigs),
    [filters.category, filters.subCategory, fieldConfigs]
  );

  const results = useMemo(() => {
    let arr = [...properties];
    if (filters.sortBy === "price_asc") arr.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    else if (filters.sortBy === "price_desc") arr.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    else if (filters.sortBy === "popular") arr.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    else if (filters.sortBy === "area_asc") arr.sort((a, b) => Number(a.area ?? 0) - Number(b.area ?? 0));
    else if (filters.sortBy === "area_desc") arr.sort((a, b) => Number(b.area ?? 0) - Number(a.area ?? 0));
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    arr.sort((a, b) => ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) - ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)));
    return arr;
  }, [properties, filters.sortBy]);

  const applySearch = useCallback(() => {
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.listingType !== "all") p.set("listingType", filters.listingType);
    if (filters.category !== "all") p.set("category", filters.category);
    if (filters.subCategory !== "all") p.set("subCategory", filters.subCategory);
    if (filters.city.trim()) p.set("city", filters.city.trim());
    setLocation(`/search?${p.toString()}`);
    setMobileFilters(false);
  }, [filters]);

  const resetAll = () => {
    setFilters(DEFAULT_FILTERS);
    setLocation("/search");
  };

  const toggleSave = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAmenity = (key: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter(k => k !== key)
        : [...prev.amenities, key],
    }));
  };

  const toggleNearby = (key: string) => {
    setFilters(prev => ({
      ...prev,
      nearbyServices: prev.nearbyServices.includes(key)
        ? prev.nearbyServices.filter(k => k !== key)
        : [...prev.nearbyServices, key],
    }));
  };

  const currentSubcats = filters.category !== "all" ? (SUBCATEGORIES[filters.category] ?? []) : [];

  const activeCount = [
    filters.listingType !== "all",
    filters.category !== "all",
    filters.subCategory !== "all",
    filters.city.trim() !== "",
    filters.district.trim() !== "",
    filters.compound.trim() !== "",
    filters.street.trim() !== "",
    filters.priceMin !== "" || filters.priceMax !== "",
    filters.areaMin !== "" || filters.areaMax !== "",
    filters.rooms !== "",
    filters.bathrooms !== "",
    filters.floor !== "",
    filters.ageRange !== "",
    filters.finishing !== "",
    filters.condition !== "",
    filters.furnished !== "",
    filters.direction !== "",
    filters.facade !== "",
    filters.paymentMethod !== "",
    filters.rentDuration !== "",
    filters.advertiserType !== "",
    filters.amenities.length > 0,
    filters.nearbyServices.length > 0,
    filters.featured,
    filters.urgent,
  ].filter(Boolean).length;

  /* ── Active filter chips ───────────────────────────────────────── */
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.listingType !== "all") chips.push({ key: "lt", label: LISTING_TYPE_MAP[filters.listingType] ?? filters.listingType, clear: () => set("listingType", "all") });
  if (filters.category !== "all") chips.push({ key: "cat", label: CATEGORY_MAP[filters.category] ?? filters.category, clear: () => { set("category", "all"); set("subCategory", "all"); } });
  if (filters.subCategory !== "all") { const l = currentSubcats.find(s => s.value === filters.subCategory)?.label; if (l) chips.push({ key: "sub", label: l, clear: () => set("subCategory", "all") }); }
  if (filters.city) chips.push({ key: "city", label: filters.city, clear: () => set("city", "") });
  if (filters.district) chips.push({ key: "district", label: filters.district, clear: () => set("district", "") });
  if (filters.compound) chips.push({ key: "compound", label: filters.compound, clear: () => set("compound", "") });
  if (filters.rooms) chips.push({ key: "rooms", label: `${filters.rooms}+ غرف`, clear: () => set("rooms", "") });
  if (filters.bathrooms) chips.push({ key: "baths", label: `${filters.bathrooms}+ حمام`, clear: () => set("bathrooms", "") });
  if (filters.priceMin || filters.priceMax) chips.push({ key: "price", label: `${filters.priceMin || "0"} — ${filters.priceMax || "∞"} ج.م`, clear: () => { set("priceMin", ""); set("priceMax", ""); } });
  if (filters.areaMin || filters.areaMax) chips.push({ key: "area", label: `${filters.areaMin || "0"} — ${filters.areaMax || "∞"} م²`, clear: () => { set("areaMin", ""); set("areaMax", ""); } });
  if (filters.finishing) chips.push({ key: "fin", label: FINISHING_OPTS.find(o => o.value === filters.finishing)?.label ?? filters.finishing, clear: () => set("finishing", "") });
  if (filters.condition) chips.push({ key: "cond", label: CONDITION_OPTS.find(o => o.value === filters.condition)?.label ?? filters.condition, clear: () => set("condition", "") });
  if (filters.furnished) chips.push({ key: "furn", label: FURNISHED_OPTS.find(o => o.value === filters.furnished)?.label ?? filters.furnished, clear: () => set("furnished", "") });
  if (filters.direction) chips.push({ key: "dir", label: DIRECTION_OPTS.find(o => o.value === filters.direction)?.label ?? filters.direction, clear: () => set("direction", "") });
  if (filters.paymentMethod) chips.push({ key: "pay", label: PAYMENT_OPTS.find(o => o.value === filters.paymentMethod)?.label ?? filters.paymentMethod, clear: () => set("paymentMethod", "") });
  if (filters.advertiserType) chips.push({ key: "adv", label: ADVERTISER_OPTS.find(o => o.value === filters.advertiserType)?.label ?? filters.advertiserType, clear: () => set("advertiserType", "") });
  if (filters.featured) chips.push({ key: "featured", label: "مميزة", clear: () => set("featured", false) });
  if (filters.urgent) chips.push({ key: "urgent", label: "عاجل", clear: () => set("urgent", false) });
  if (filters.amenities.length > 0) chips.push({ key: "amenities", label: `${filters.amenities.length} مميزات`, clear: () => set("amenities", []) });
  if (filters.nearbyServices.length > 0) chips.push({ key: "nearby", label: `قرب ${filters.nearbyServices.length} خدمة`, clear: () => set("nearbyServices", []) });

  /* ── Filter Panel ────────────────────────────────────────────────── */
  const FilterPanel = () => (
    <div dir="rtl">

      {/* الغرض */}
      <Section title="الغرض" onReset={() => { set("listingType", "all"); set("rentDuration", ""); }} badge={filters.listingType !== "all" ? 1 : 0}>
        <div className="flex gap-2">
          {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
            <button
              key={o.v}
              onClick={() => { set("listingType", o.v); if (o.v !== "rent") set("rentDuration", ""); }}
              className={`flex-1 h-9 rounded-full text-[13px] font-bold transition-all
                ${filters.listingType === o.v
                  ? "bg-primary text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Section>

      {/* نوع العقار */}
      <Section title="نوع العقار" onReset={() => { set("category", "all"); set("subCategory", "all"); }} badge={filters.category !== "all" ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "all", l: "الكل" },
            { v: "residential", l: "سكني" },
            { v: "commercial", l: "تجاري" },
            { v: "land", l: "أراضي" },
            { v: "industrial", l: "صناعي" },
          ].map(o => (
            <button
              key={o.v}
              onClick={() => { set("category", o.v); set("subCategory", "all"); }}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all
                ${filters.category === o.v
                  ? "bg-primary text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"}`}
            >
              {o.l}
            </button>
          ))}
        </div>
        {currentSubcats.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">التصنيف الفرعي</p>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "all", label: "الكل" }, ...currentSubcats].map(s => (
                <Pill key={s.value} active={filters.subCategory === s.value} onClick={() => set("subCategory", s.value)} sm>
                  {s.label}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* الموقع */}
      <Section title="الموقع" badge={[filters.city, filters.district, filters.compound, filters.street].filter(Boolean).length} onReset={() => { set("city", ""); set("district", ""); set("compound", ""); set("street", ""); }}>
        <div className="space-y-2">
          {[
            { field: "city" as const, placeholder: "المدينة...", icon: "🏙" },
            { field: "district" as const, placeholder: "الحي أو المنطقة...", icon: "📍" },
            { field: "compound" as const, placeholder: "الكمبوند...", icon: "🏘" },
            { field: "street" as const, placeholder: "الشارع...", icon: "🛣" },
          ].map(({ field, placeholder, icon }) => (
            <div key={field} className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">{icon}</span>
              <input
                placeholder={placeholder}
                value={filters[field]}
                onChange={e => set(field, e.target.value)}
                className="w-full pr-8 pl-3 h-9 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-zinc-400"
                dir="rtl"
              />
              {filters[field] && (
                <button onClick={() => set(field, "")} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* السعر */}
      <Section title="السعر (ج.م)" open={false} badge={filters.priceMin || filters.priceMax ? 1 : 0} onReset={() => { set("priceMin", ""); set("priceMax", ""); }}>
        <RangeInputs
          minVal={filters.priceMin} maxVal={filters.priceMax}
          onMin={v => set("priceMin", v)} onMax={v => set("priceMax", v)}
          placeholder={["الحد الأدنى", "حد أقصى"]}
        />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            { label: "< 500ألف", min: "", max: "500000" },
            { label: "500ألف–مليون", min: "500000", max: "1000000" },
            { label: "1–2 مليون", min: "1000000", max: "2000000" },
            { label: "2–5 مليون", min: "2000000", max: "5000000" },
            { label: "> 5 مليون", min: "5000000", max: "" },
          ].map(r => (
            <button
              key={r.label}
              onClick={() => { set("priceMin", r.min); set("priceMax", r.max); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                ${filters.priceMin === r.min && filters.priceMax === r.max
                  ? "bg-primary text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      {/* المساحة */}
      <Section title="المساحة (م²)" open={false} badge={filters.areaMin || filters.areaMax ? 1 : 0} onReset={() => { set("areaMin", ""); set("areaMax", ""); }}>
        <RangeInputs
          minVal={filters.areaMin} maxVal={filters.areaMax}
          onMin={v => set("areaMin", v)} onMax={v => set("areaMax", v)}
          placeholder={["الحد الأدنى", "حد أقصى"]}
        />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            { label: "< 100م²", min: "", max: "100" },
            { label: "100–200م²", min: "100", max: "200" },
            { label: "200–500م²", min: "200", max: "500" },
            { label: "> 500م²", min: "500", max: "" },
          ].map(r => (
            <button
              key={r.label}
              onClick={() => { set("areaMin", r.min); set("areaMax", r.max); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                ${filters.areaMin === r.min && filters.areaMax === r.max
                  ? "bg-primary text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      {/* الغرف والحمامات */}
      {(fieldRules.rooms || fieldRules.bathrooms) && (
      <Section title="الغرف والحمامات" open={false} badge={(filters.rooms ? 1 : 0) + (filters.bathrooms ? 1 : 0)}>
        <div className="space-y-3">
          {fieldRules.rooms && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 mb-2">غرف النوم</p>
            <div className="flex gap-1.5 flex-wrap">
              {BEDS_OPTS.map(b => (
                <Pill key={b.value} active={filters.rooms === b.value} onClick={() => set("rooms", filters.rooms === b.value ? "" : b.value)} sm>
                  {b.label}
                </Pill>
              ))}
            </div>
          </div>
          )}
          {fieldRules.bathrooms && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 mb-2">الحمامات</p>
            <div className="flex gap-1.5 flex-wrap">
              {BATHS_OPTS.map(b => (
                <Pill key={b.value} active={filters.bathrooms === b.value} onClick={() => set("bathrooms", filters.bathrooms === b.value ? "" : b.value)} sm>
                  {b.label}
                </Pill>
              ))}
            </div>
          </div>
          )}
        </div>
      </Section>
      )}

      {/* الطابق */}
      {fieldRules.floor && (
      <Section title="الطابق" open={false} badge={filters.floor ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {FLOOR_OPTS.map(o => (
            <Pill key={o.value} active={filters.floor === o.value} onClick={() => set("floor", filters.floor === o.value ? "" : o.value)} sm>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>
      )}

      {/* عمر العقار */}
      {fieldRules.buildYear && (
      <Section title="عمر العقار" open={false} badge={filters.ageRange ? 1 : 0}>
        <div className="space-y-0.5">
          {AGE_OPTS.map(o => (
            <ToggleOpt key={o.value} active={filters.ageRange === o.value} onClick={() => set("ageRange", filters.ageRange === o.value ? "" : o.value)}>
              {o.label}
            </ToggleOpt>
          ))}
        </div>
      </Section>
      )}

      {/* التشطيب */}
      {fieldRules.finishing && (
      <Section title="التشطيب" open={false} badge={filters.finishing ? 1 : 0}>
        <div className="space-y-0.5">
          {FINISHING_OPTS.map(o => (
            <ToggleOpt key={o.value} active={filters.finishing === o.value} onClick={() => set("finishing", filters.finishing === o.value ? "" : o.value)}>
              {o.label}
            </ToggleOpt>
          ))}
        </div>
      </Section>
      )}

      {/* حالة العقار */}
      {fieldRules.condition && (
      <Section title="حالة العقار" open={false} badge={filters.condition ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {CONDITION_OPTS.map(o => (
            <Pill key={o.value} active={filters.condition === o.value} onClick={() => set("condition", filters.condition === o.value ? "" : o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>
      )}

      {/* الفرش */}
      {fieldRules.furnished && (
      <Section title="الفرش" open={false} badge={filters.furnished ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {FURNISHED_OPTS.map(o => (
            <Pill key={o.value} active={filters.furnished === o.value} onClick={() => set("furnished", filters.furnished === o.value ? "" : o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>
      )}

      {/* الاتجاه والواجهة */}
      {(fieldRules.direction || fieldRules.facade) && (
      <Section title="الاتجاه والواجهة" open={false} badge={(filters.direction ? 1 : 0) + (filters.facade ? 1 : 0)} onReset={() => { set("direction", ""); set("facade", ""); }}>
        <div className="space-y-3">
          {fieldRules.direction && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 mb-2">اتجاه العقار</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DIRECTION_OPTS.map(o => (
                <button
                  key={o.value}
                  onClick={() => set("direction", filters.direction === o.value ? "" : o.value)}
                  className={`py-1.5 px-2 rounded-full text-[12px] font-semibold transition-all text-center
                    ${filters.direction === o.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          )}
          {fieldRules.facade && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 mb-2">واجهة العقار</p>
            <div className="flex flex-wrap gap-1.5">
              {FACADE_OPTS.map(o => (
                <Pill key={o.value} active={filters.facade === o.value} onClick={() => set("facade", filters.facade === o.value ? "" : o.value)} sm>
                  {o.label}
                </Pill>
              ))}
            </div>
          </div>
          )}
        </div>
      </Section>
      )}

      {/* نوع الدفع */}
      {fieldRules.paymentMethod && (
      <Section title="نوع الدفع" open={false} badge={filters.paymentMethod ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_OPTS.map(o => (
            <Pill key={o.value} active={filters.paymentMethod === o.value} onClick={() => set("paymentMethod", filters.paymentMethod === o.value ? "" : o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>
      )}

      {/* مدة الإيجار */}
      {(filters.listingType === "rent" || filters.listingType === "all") && (
        <Section title="مدة الإيجار" open={false} badge={filters.rentDuration ? 1 : 0}>
          <div className="flex flex-wrap gap-1.5">
            {RENT_DURATION_OPTS.map(o => (
              <Pill key={o.value} active={filters.rentDuration === o.value} onClick={() => set("rentDuration", filters.rentDuration === o.value ? "" : o.value)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </Section>
      )}

      {/* نوع المعلن */}
      <Section title="نوع المعلن" open={false} badge={filters.advertiserType ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {ADVERTISER_OPTS.map(o => (
            <Pill key={o.value} active={filters.advertiserType === o.value} onClick={() => set("advertiserType", filters.advertiserType === o.value ? "" : o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </Section>

      {/* المميزات والمرافق — dynamic filters engine */}
      <DynamicFeaturesPanel
        group={filters.category !== "all" ? filters.category : "all"}
        category={activeMainCategory ?? ""}
        amenities={filters.amenities}
        nearbyServices={filters.nearbyServices}
        onAmenitiesChange={(vals) => setFilters((f) => ({ ...f, amenities: vals }))}
        onNearbyChange={(vals) => setFilters((f) => ({ ...f, nearbyServices: vals }))}
      />

      {/* إعلانات خاصة */}
      <Section title="إعلانات خاصة">
        <div className="space-y-1">
          <button
            onClick={() => set("featured", !filters.featured)}
            className="flex items-center gap-2.5 w-full py-1.5 group"
          >
            <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0
              ${filters.featured ? "bg-amber-500 border-amber-500" : "border-zinc-300 group-hover:border-zinc-400"}`}>
              {filters.featured && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className={`text-[13px] transition-colors ${filters.featured ? "text-zinc-900 font-semibold" : "text-zinc-600 group-hover:text-zinc-800"}`}>
                العقارات المميزة فقط
              </span>
            </div>
          </button>
          <button
            onClick={() => set("urgent", !filters.urgent)}
            className="flex items-center gap-2.5 w-full py-1.5 group"
          >
            <div className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0
              ${filters.urgent ? "bg-red-500 border-red-500" : "border-zinc-300 group-hover:border-zinc-400"}`}>
              {filters.urgent && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className={`text-[13px] transition-colors ${filters.urgent ? "text-zinc-900 font-semibold" : "text-zinc-600 group-hover:text-zinc-800"}`}>
                الإعلانات العاجلة فقط
              </span>
            </div>
          </button>
        </div>
      </Section>

      {/* Actions */}
      <div className="pt-4 space-y-2">
        <button
          onClick={applySearch}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-[13px] transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          عرض النتائج
        </button>
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="w-full h-9 text-zinc-500 hover:text-zinc-800 font-semibold rounded-2xl text-[13px] transition-all flex items-center justify-center gap-1.5 hover:bg-zinc-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            مسح كل الفلاتر ({activeCount})
          </button>
        )}
      </div>
    </div>
  );

  /* ── List Card — Nawy-style ──────────────────────────────────── */
  const ListCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const priceStr = Number(p.price) ? Number(p.price).toLocaleString("en-US") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const loc = [p.district, p.address].filter(Boolean).join("، ") || "بنها";
    const wa = (p.whatsapp ?? p.phone ?? "").replace(/\D/g, "");
    const descSnippet = p.description ? p.description.slice(0, 110) : null;
    const logoSrc = p.agentLogo || p.agentAvatar;

    return (
      <PropertyTooltip property={{ id: p.id, title: p.title, description: p.description, price: p.price, listingType: p.listingType, district: p.district, address: p.address, mainCategory: CATEGORY_MAP[p.mainCategory] ?? p.mainCategory, rooms: p.rooms, bathrooms: p.bathrooms, area: p.area, images: p.images }}>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(idx, 5) * 0.04 }}
        className={`group relative bg-white rounded-lg overflow-hidden cursor-pointer flex flex-row h-[176px]
          border transition-colors duration-150
          ${p.featured
            ? "border-amber-200 hover:border-amber-300"
            : p.urgent
            ? "border-red-200 hover:border-red-300"
            : "border-zinc-200 hover:border-zinc-300"}`}
        onClick={() => setLocation(`/property/${p.id}`)}
      >
        {/* ── Image — RIGHT side in RTL (first in DOM) ── */}
        <PropertyImageGallery
          images={imgs} alt={p.title} fallback={DEFAULT_IMG}
          className="shrink-0 w-[240px] sm:w-[290px]"
        >
          {/* Action buttons — top-left of image */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
            <button
              onClick={e => toggleSave(p.id, e)}
              className={`w-7 h-7 rounded-full flex items-center justify-center bg-white/90 transition-all
                ${saved.has(p.id) ? "text-rose-500" : "text-zinc-400 hover:text-rose-500"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-rose-500" : ""}`} />
            </button>
          </div>


          {/* Featured / Urgent badge — top-right of image */}
          {p.featured && (
            <div className="absolute top-2 right-2 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-white">
                <Crown className="w-2.5 h-2.5 shrink-0" /> مميز
              </span>
            </div>
          )}
          {!p.featured && p.urgent && (
            <div className="absolute top-2 right-2 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
                <Zap className="w-2.5 h-2.5 shrink-0" /> عاجل
              </span>
            </div>
          )}
        </PropertyImageGallery>

        {/* ── Content — LEFT side in RTL ── */}
        <div className="flex-1 flex flex-col px-4 py-3 min-w-0 overflow-hidden">

          {/* Row 1: Location + listing type badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] font-medium text-zinc-600 truncate">{loc}</span>
              {p.compound && <span className="text-[10px] text-zinc-400 shrink-0 truncate">· {p.compound}</span>}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/8 text-primary shrink-0 whitespace-nowrap">
              {typeAr}
            </span>
          </div>

          {/* Row 2: Company logo + name + verified */}
          {p.agentName && (
            <div className="flex items-center gap-1.5 mb-2">
              {p.agentLogo && (
                <div className="h-5 px-1.5 rounded border border-zinc-200 bg-white flex items-center justify-center shrink-0" style={{ maxWidth: 64 }}>
                  <img src={p.agentLogo} alt={p.agentName} className="h-3.5 w-auto object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <span
                className={`text-[11px] font-semibold text-zinc-500 truncate ${p.providerId ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                onClick={p.providerId ? e => { e.stopPropagation(); setLocation(`/provider/${p.providerId}`); } : undefined}
              >
                {p.agentName}
              </span>
              {p.verified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                  <BadgeCheck className="w-2.5 h-2.5 text-teal-500" /> موثّق
                </span>
              )}
            </div>
          )}

          {/* Row 3: Title */}
          <h2 className="font-bold text-[13px] text-zinc-900 leading-snug line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {p.title}
          </h2>

          {/* Row 4: Description snippet */}
          {descSnippet && (
            <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed mb-2 flex-shrink-0">
              {descSnippet}
            </p>
          )}

          {/* Row 5: Specs — compact inline */}
          {(p.rooms != null || p.bathrooms != null || p.area != null) && (
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              {p.rooms != null && (
                <span className="flex items-center gap-0.5 text-[11px] text-zinc-400">
                  <BedDouble className="w-3 h-3 text-zinc-300 shrink-0" />{p.rooms} غرف
                </span>
              )}
              {p.bathrooms != null && (
                <span className="flex items-center gap-0.5 text-[11px] text-zinc-400">
                  <Bath className="w-3 h-3 text-zinc-300 shrink-0" />{p.bathrooms} حمام
                </span>
              )}
              {p.area != null && (
                <span className="flex items-center gap-0.5 text-[11px] text-zinc-400">
                  <Maximize2 className="w-3 h-3 text-zinc-300 shrink-0" />{Number(p.area).toLocaleString("ar-EG")} م²
                </span>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Row 6: Price + contact buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {priceStr ? (
                <div dir="ltr" className="text-[15px] font-black text-zinc-900 leading-none">
                  {priceStr}
                  <span className="text-[11px] font-bold text-zinc-700 mr-1">ج.م</span>
                  {p.listingType === "rent" && (
                    <span className="text-[10px] text-zinc-600">
                      / {(p as any).rentDuration === "monthly" ? "شهر" : (p as any).rentDuration === "yearly" ? "سنة" : ""}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-zinc-600">السعر عند الاتصال</span>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Clock className="w-2.5 h-2.5" />{timeAgo(p.createdAt)}
                </span>
                {p.viewCount > 0 && (
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    {p.viewCount.toLocaleString("ar-EG")} مشاهدات
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {wa && (
                <button
                  onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${wa}`, "_blank"); }}
                  className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] font-bold px-2.5 h-7 rounded-lg transition-all"
                >
                  <WaIcon />
                  واتساب
                </button>
              )}
              {p.phone && (
                <button
                  onClick={e => { e.stopPropagation(); window.location.href = `tel:${p.phone}`; }}
                  className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-primary hover:border-primary/40 transition-all"
                >
                  <Phone className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.article>
      </PropertyTooltip>
    );
  };

  /* ── Grid Card ─────────────────────────────────────────────────── */
  const GridCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const priceStr = Number(p.price) ? Number(p.price).toLocaleString("en-US") : null;
    const loc = [p.district, p.address].filter(Boolean).join("، ") || "بنها";

    return (
      <PropertyTooltip property={{ id: p.id, title: p.title, description: p.description, price: p.price, listingType: p.listingType, district: p.district, address: p.address, mainCategory: CATEGORY_MAP[p.mainCategory] ?? p.mainCategory, rooms: p.rooms, bathrooms: p.bathrooms, area: p.area, images: p.images }}>
      <motion.article
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: Math.min(idx, 6) * 0.06 }}
        onClick={() => setLocation(`/property/${p.id}`)}
        className={`group bg-white rounded-xl overflow-hidden cursor-pointer transition-colors duration-150
          ${p.featured ? "border border-amber-200 hover:border-amber-300"
          : p.urgent ? "border border-red-200 hover:border-red-300"
          : "border border-zinc-200/80 hover:border-zinc-300"}`}
      >
        <PropertyImageGallery images={imgs} alt={p.title} fallback={DEFAULT_IMG} className="h-48">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
          {/* Premium featured badge */}
          {p.featured && (
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: "linear-gradient(135deg,#f59e0b 0%,#fbbf24 50%,#f59e0b 100%)",
                  color: "#fff",
                  boxShadow: "0 3px 10px rgba(245,158,11,0.5), 0 1px 3px rgba(0,0,0,0.2)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                }}
              >
                <Crown className="w-3 h-3 shrink-0" /> مميز
              </span>
            </div>
          )}
          <button onClick={e => toggleSave(p.id, e)}
            className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all
              ${saved.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/90 border-white/60 text-zinc-500 hover:text-rose-500"}`}>
            <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-white" : ""}`} />
          </button>

        </PropertyImageGallery>
        <div className="p-3.5">
          {/* Price — right-aligned (justify-start = visual right in RTL) */}
          <div className="mb-2 flex justify-start items-baseline gap-1.5">
            {priceStr ? (
              <>
                <span className="text-sm font-bold text-gray-600">ج.م</span>
                <span dir="ltr" className="text-black font-black text-xl leading-none">{priceStr}</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-zinc-500">السعر عند الاتصال</span>
            )}
          </div>
          <h2 className="font-bold text-sm text-zinc-900 leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">{p.title}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 flex-wrap">
            {p.rooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 text-zinc-300" />{p.rooms} غرف</span>}
            {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3 h-3 text-zinc-300" />{p.bathrooms} حمام</span>}
            {p.area != null && <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3 text-zinc-300" />{Number(p.area).toLocaleString("ar-EG")} م²</span>}
          </div>
          {(p.finishing || p.furnished) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {p.finishing && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{FINISHING_OPTS.find(o => o.value === p.finishing)?.label ?? p.finishing}</span>}
              {p.furnished && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">{FURNISHED_OPTS.find(o => o.value === p.furnished)?.label ?? p.furnished}</span>}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-zinc-600 mb-2.5">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="line-clamp-1 font-medium">{loc}</span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {p.agentLogo && (
                <div className="h-5 px-1 rounded border border-zinc-200 bg-white flex items-center justify-center shrink-0" style={{ maxWidth: 60 }}>
                  <img src={p.agentLogo} alt={p.agentName ?? ""} className="h-3.5 w-auto object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Clock className="w-2.5 h-2.5" />{timeAgo(p.createdAt)}</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold shrink-0">{(p.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدات</span>
          </div>
        </div>
      </motion.article>
      </PropertyTooltip>
    );
  };

  /* ── Loading Skeleton ─────────────────────────────────────────── */
  const Skeleton = () => (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex h-44 animate-pulse">
          <div className="w-64 shrink-0 bg-zinc-200" />
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="h-6 w-32 bg-zinc-200 rounded-lg" />
            <div className="h-4 w-3/4 bg-zinc-100 rounded-lg" />
            <div className="h-3.5 w-1/2 bg-zinc-100 rounded-lg" />
            <div className="flex gap-2 mt-1">{[52, 64, 56].map(w => <div key={w} className="h-7 bg-zinc-100 rounded-lg" style={{ width: w }} />)}</div>
            <div className="flex-1" />
            <div className="flex justify-between border-t border-zinc-100 pt-2">
              <div className="h-3 w-20 bg-zinc-100 rounded" />
              <div className="flex gap-1.5"><div className="h-7 w-7 bg-zinc-100 rounded-lg" /><div className="h-7 w-7 bg-zinc-100 rounded-lg" /></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white" dir="rtl">
      <Header />

      {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
      <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 h-10
              focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                placeholder="ابحث بالعنوان، الحي، الكمبوند..."
                value={filters.q}
                onChange={e => set("q", e.target.value)}
                onKeyDown={e => e.key === "Enter" && applySearch()}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-zinc-400 text-zinc-900"
                dir="rtl"
              />
              {filters.q && (
                <button onClick={() => set("q", "")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type pills — desktop */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
                <button key={o.v} onClick={() => set("listingType", o.v)}
                  className={`px-4 h-7 rounded-lg text-sm font-bold transition-all
                    ${filters.listingType === o.v ? "bg-white text-primary shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-800"}`}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="hidden sm:flex items-center gap-1.5 border border-zinc-200 rounded-xl px-3 h-10 bg-white">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={filters.sortBy}
                onChange={e => set("sortBy", e.target.value)}
                className="text-sm bg-transparent border-none outline-none text-zinc-700 font-medium cursor-pointer"
                dir="rtl"
              >
                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* View mode */}
            <div className="hidden sm:flex items-center gap-0.5 border border-zinc-200 rounded-xl p-1 bg-white">
              <button onClick={() => setViewMode("list")}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("grid")}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile filter button */}
            <button onClick={() => setMobileFilters(true)}
              className="lg:hidden relative h-10 w-10 flex items-center justify-center border border-zinc-200 bg-white rounded-xl text-zinc-600 hover:border-primary/40 transition-all">
              <SlidersHorizontal className="w-4 h-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">{activeCount}</span>
              )}
            </button>
          </div>

          {/* Active chips */}
          {chips.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {chips.map(chip => (
                <motion.button
                  key={chip.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 bg-primary/8 text-primary text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </motion.button>
              ))}
              <button onClick={resetAll} className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 transition-colors underline underline-offset-2">
                مسح الكل
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5 flex gap-5 flex-1">

        {/* ── Desktop Sidebar ──────────────────────────────────────── */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div
            ref={filterPanelRef}
            className="sticky top-[130px] max-h-[calc(100vh-150px)] overflow-y-auto no-scrollbar [overscroll-behavior:contain]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 text-[15px]">الفلاتر</span>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">{activeCount}</span>
                )}
              </div>
              {activeCount > 0 && (
                <button onClick={resetAll} className="text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> مسح الكل
                </button>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* ── Results ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Result count + sort (mobile) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isFetching
                ? <span className="flex items-center gap-1.5 text-sm text-zinc-500"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />جارٍ البحث...</span>
                : <span className="text-sm font-semibold text-zinc-700">{results.length.toLocaleString("ar-EG")} <span className="font-normal text-zinc-500">نتيجة</span></span>
              }
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <select value={filters.sortBy} onChange={e => set("sortBy", e.target.value)}
                className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white outline-none text-zinc-700" dir="rtl">
                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex items-center gap-0.5 border border-zinc-200 rounded-lg p-0.5 bg-white">
                <button onClick={() => setViewMode("list")} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${viewMode === "list" ? "bg-primary text-white" : "text-zinc-400"}`}><ListIcon className="w-3 h-3" /></button>
                <button onClick={() => setViewMode("grid")} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-primary text-white" : "text-zinc-400"}`}><LayoutGrid className="w-3 h-3" /></button>
              </div>
            </div>
          </div>

          {/* Ad: أعلى نتائج البحث */}
          <AdBanner position="search_top" className="mb-4" />

          {/* Results */}
          {isFetching && results.length === 0 ? (
            <Skeleton />
          ) : results.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200">
              <Search className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-600 mb-2">لا توجد نتائج</h3>
              <p className="text-sm text-zinc-400 mb-4">جرب تغيير الفلاتر أو توسيع نطاق البحث</p>
              <button onClick={resetAll} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
                مسح الفلاتر
              </button>
            </div>
          ) : viewMode === "list" ? (
            <div className="flex flex-col gap-3">
              {results.flatMap((p, i) => {
                const card = <ListCard key={p.id} p={p} idx={i} />;
                const showInline = (i + 1) % 5 === 0 && i < results.length - 1;
                return showInline
                  ? [card, <AdBanner key={`inline-${i}`} position="search_inline" />]
                  : [card];
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.flatMap((p, i) => {
                const card = <GridCard key={p.id} p={p} idx={i} />;
                const showInline = (i + 1) % 6 === 0 && i < results.length - 1;
                return showInline
                  ? [card, <div key={`inline-${i}`} className="col-span-full"><AdBanner position="search_inline" /></div>]
                  : [card];
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile Filter Drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
              onClick={() => setMobileFilters(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white z-50 shadow-2xl flex flex-col"
              dir="rtl"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-bold text-zinc-800">الفلاتر</span>
                  {activeCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">{activeCount}</span>
                  )}
                </div>
                <button onClick={() => setMobileFilters(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <FilterPanel />
              </div>
              <div className="p-4 border-t border-zinc-200 bg-white">
                <button onClick={() => setMobileFilters(false)}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Search className="w-4 h-4" />
                  عرض {results.length.toLocaleString("ar-EG")} نتيجة
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <RealEstateFooter />
    </div>
  );
}
