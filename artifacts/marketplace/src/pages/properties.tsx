import { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartSearch } from "@/components/SmartSearch";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Building2,
  Heart, Map, Grid3X3, X, ChevronDown, ChevronUp,
  SlidersHorizontal, TrendingUp, CheckCircle2, Loader2, Bell, BellOff,
  LayoutList, Scale, GitCompare, Eye, Clock, Flag, Layers, Phone, BadgeCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, type Category, type Area, type Subcategory } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureIcon } from "@/components/FeatureIcon";
import { useCompare, addToCompare, removeFromCompare } from "@/lib/compare-store";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";

type DbProp = {
  id: number;
  title: string;
  listingType: string;
  mainCategory: string;
  featured: boolean | null;
  images: string | null;
  address: string | null;
  district: string | null;
  rooms: number | null;
  bathrooms: number | null;
  area: string | null;
  latitude: string | null;
  longitude: string | null;
  price: string | null;
  status: string | null;
  finishing: string | null;
  furnished: string | null;
  paymentMethod: string | null;
  features: string | null;
  floor: number | null;
  createdAt: string | null;
  viewCount: number | null;
  agentName?: string | null;
  agentAvatar?: string | null;
  agentLogo?: string | null;
  verified?: boolean | null;
  providerPhone?: string | null;
  providerWhatsapp?: string | null;
};

type DisplayProp = {
  id: number;
  title: string;
  type: string;
  kind: string;
  featured: boolean;
  img: string;
  imgs: string[];
  location: string;
  district: string;
  beds: number;
  baths: number;
  area: number;
  lat: number;
  lng: number;
  price: string;
  priceNum: number;
  finishing: string;
  furnished: string;
  paymentMethod: string;
  features: string[];
  floor: number | null;
  createdAt: string | null;
  viewCount: number;
  agentName: string;
  agentAvatar: string;
  agentLogo: string;
  verified: boolean;
  phone: string;
  whatsapp: string;
};

function tryJsonArr(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  if (typeof val === "string" && val.startsWith("http")) return [val];
  return [];
}

const LISTING_TYPE_AR: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };

function mapDbProp(row: DbProp, fallback: string): DisplayProp {
  const imgs = tryJsonArr(row.images);
  return {
    id: row.id,
    title: row.title,
    type: LISTING_TYPE_AR[row.listingType] ?? row.listingType,
    kind: row.mainCategory,
    featured: row.featured ?? false,
    img: imgs[0] ?? fallback,
    imgs,
    location: row.address ?? "",
    district: row.district ?? "",
    beds: row.rooms ?? 0,
    baths: row.bathrooms ?? 0,
    agentName: row.agentName ?? "",
    agentAvatar: row.agentAvatar ?? "",
    agentLogo: row.agentLogo ?? "",
    verified: row.verified ?? false,
    phone: (row as any).phone ?? row.providerPhone ?? "",
    whatsapp: (row as any).whatsapp ?? row.providerWhatsapp ?? "",
    area: row.area ? parseFloat(row.area) : 0,
    lat: row.latitude ? parseFloat(row.latitude) : 24.7136,
    lng: row.longitude ? parseFloat(row.longitude) : 46.6753,
    price: row.price ? Number(row.price).toLocaleString("ar-EG") + " ج.م" : "السعر عند الطلب",
    priceNum: row.price ? parseFloat(row.price) : 0,
    finishing: row.finishing ?? "",
    furnished: row.furnished ?? "",
    paymentMethod: row.paymentMethod ?? "",
    features: tryJsonArr(row.features),
    floor: row.floor ?? null,
    createdAt: row.createdAt ?? null,
    viewCount: row.viewCount ?? 0,
  };
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ${Math.floor(diff / 86400) === 1 ? "يوم" : "أيام"}`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 604800)} ${Math.floor(diff / 604800) === 1 ? "أسبوع" : "أسابيع"}`;
  return `منذ ${Math.floor(diff / 2592000)} شهر`;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK = NO_IMAGE_PLACEHOLDER;
const MAP_CENTER: [number, number] = [24.7136, 46.6753];

const CITIES: string[] = [];
const KINDS = ["فيلا", "شقة", "مكتب", "دوبلكس", "أرض"];
const TYPES = ["للبيع", "للإيجار"];

const STATIC_SUBCATS: Record<string, string[]> = {
  residential: ["شقة", "فيلا", "دوبلكس", "روف", "شاليه", "استوديو", "عمارة"],
  commercial:  ["محل", "مكتب", "معرض", "مستودع", "عيادة", "فندق"],
  land:        ["أرض سكنية", "أرض تجارية", "مزرعة", "أرض صناعية"],
  industrial:  ["مصنع", "مستودع صناعي", "ورشة"],
};
const BEDS_OPTIONS = [1, 2, 3, 4, 5];
const BATHS_OPTIONS = [1, 2, 3, 4];
const FLOOR_OPTIONS = ["أرضي", "1", "2", "3", "4", "5+"];
const PRICE_RANGES = [
  { label: "أقل من 500 ألف", min: 0, max: 500000 },
  { label: "500 ألف – مليون", min: 500000, max: 1000000 },
  { label: "مليون – 3 مليون", min: 1000000, max: 3000000 },
  { label: "أكثر من 3 مليون", min: 3000000, max: Infinity },
];
const AREA_RANGES = [
  { label: "أقل من 100 م²", min: 0, max: 100 },
  { label: "100 – 200 م²", min: 100, max: 200 },
  { label: "200 – 400 م²", min: 200, max: 400 },
  { label: "400 – 1000 م²", min: 400, max: 1000 },
  { label: "أكثر من 1000 م²", min: 1000, max: Infinity },
];
const RECENCY_OPTIONS = [
  { label: "اليوم", hours: 24 },
  { label: "هذا الأسبوع", hours: 168 },
  { label: "هذا الشهر", hours: 720 },
];
type DynFeature = { id: number; name: string; icon: string | null; status: string; applicableTypes?: string | null };
const FINISHING_OPTIONS = ["مشطب", "سوبر لوكس", "لوكس", "نص تشطيب", "خام"];
const FURNISHED_OPTIONS = ["مفروش", "مفروش جزئياً", "غير مفروش"];
const PAYMENT_OPTIONS = ["نقدي", "تقسيط", "نقدي أو تقسيط", "بنكي"];

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-right mb-3"
      >
        <span className="font-bold text-gray-800 text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${active ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"}`}
    >
      {label}
    </button>
  );
}

function getUrlParams() {
  const sp = new URLSearchParams(window.location.search);
  const listingTypeMap: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
  const rawListingType = sp.get("listingType");
  const typeFromListing = rawListingType ? (listingTypeMap[rawListingType] ?? null) : null;
  return {
    q: sp.get("q") ?? "",
    mainCategory: sp.get("mainCategory") ?? null,
    type: typeFromListing ?? sp.get("type") ?? null,
    price: sp.get("price") ?? null,
    city: sp.get("city") ?? null,
    district: sp.get("district") ?? null,
  };
}

export default function PropertiesPage() {
  const [, setLocation] = useLocation();

  const initParams = getUrlParams();

  const [allProps, setAllProps] = useState<DisplayProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initParams.q);
  const [selectedType, setSelectedType] = useState<string | null>(initParams.type);
  const [selectedKind, setSelectedKind] = useState<string | null>(initParams.mainCategory);
  const [selectedSubKind, setSelectedSubKind] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(initParams.city);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(initParams.district);
  const [selectedFinishing, setSelectedFinishing] = useState<string | null>(null);
  const [selectedFurnished, setSelectedFurnished] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedBeds, setSelectedBeds] = useState<number | null>(null);
  const [selectedBaths, setSelectedBaths] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedFeaturedOnly, setSelectedFeaturedOnly] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedRecency, setSelectedRecency] = useState<number | null>(null);
  const [reportPropertyId, setReportPropertyId] = useState<number | null>(null);
  const [reportEmail, setReportEmail] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(() => {
    if (!initParams.price) return null;
    const [min, max] = initParams.price.split("-").map(Number);
    const idx = PRICE_RANGES.findIndex(r => r.min === min && (r.max === max || (max > 1e7 && r.max === Infinity)));
    return idx >= 0 ? idx : null;
  });
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "area">("default");
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("بحث محفوظ");
  const [saveSearchEmail, setSaveSearchEmail] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { items: compareItems, isIn: isInCompare } = useCompare();

  const sidebarRef = useRef<HTMLDivElement>(null);
  useSidebarSmartScroll(sidebarRef);

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const selectedCatObj = reCategories.find((c) => (c.slug ?? String(c.id)) === selectedKind);
  const { data: subCategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["re-subcategories", selectedCatObj?.id],
    queryFn: () => api.subcategories.listByCategory(selectedCatObj!.id),
    enabled: !!selectedCatObj,
    staleTime: 5 * 60 * 1000,
  });

  const { data: banhaAreas = [] } = useQuery<Area[]>({
    queryKey: ["areas", 45],
    queryFn: () => api.locations.getAreasByCity(45),
    staleTime: 5 * 60_000,
  });

  const { data: myFavIds = [] } = useQuery<number[]>({
    queryKey: ["property-favorites-ids"],
    queryFn: async () => {
      if (!user) return [];
      const rows = await api.propertyFavorites.list();
      return (rows as any[]).map((r: any) => r.propertyId);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (myFavIds.length) setLiked(new Set(myFavIds));
  }, [myFavIds]);

  const { data: dbFeatures = [] } = useQuery<DynFeature[]>({
    queryKey: ["property-features-filter"],
    queryFn: () => api.propertyFeatures.listByType("feature"),
    staleTime: 5 * 60_000,
  });

  const { data: dbServices = [] } = useQuery<DynFeature[]>({
    queryKey: ["property-services-filter"],
    queryFn: () => api.propertyFeatures.listByType("service"),
    staleTime: 5 * 60_000,
  });

  const allDynFeatures = useMemo(() => [
    ...dbFeatures.filter((f) => f.status === "active"),
    ...dbServices.filter((f) => f.status === "active"),
  ], [dbFeatures, dbServices]);

  useEffect(() => {
    api.properties.list({ status: "active" })
      .then((rows) => setAllProps((rows as unknown as DbProp[]).map((r) => mapDbProp(r, FALLBACK))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleFavMut = useMutation({
    mutationFn: async ({ id, add }: { id: number; add: boolean }) => {
      if (!user) { toast.error("سجّل الدخول أولاً لإضافة للمفضلة"); return; }
      if (add) await api.propertyFavorites.add(id);
      else await api.propertyFavorites.remove(id);
    },
    onSuccess: (_, { id, add }) => {
      setLiked(prev => { const s = new Set(prev); add ? s.add(id) : s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ["property-favorites-ids"] });
      toast.success(add ? "أُضيف للمفضلة" : "حُذف من المفضلة");
    },
    onError: () => toast.error("حدث خطأ، حاول مرة أخرى"),
  });

  const saveSearchMut = useMutation({
    mutationFn: () => {
      if (!user) { toast.error("سجّل الدخول لحفظ البحث"); throw new Error(""); }
      const filters: Record<string, any> = {};
      if (selectedKind) filters.mainCategory = selectedKind;
      if (selectedType) filters.listingType = selectedType;
      if (selectedCity) filters.city = selectedCity;
      if (selectedPrice !== null) filters.maxPrice = PRICE_RANGES[selectedPrice].max;
      return api.savedSearches.create({ name: saveSearchName, email: saveSearchEmail || undefined, filters, notifyEmail: true, notifyApp: true });
    },
    onSuccess: () => { setSaveSearchOpen(false); toast.success("تم حفظ البحث! سنُعلمك عند توفر عقارات تطابقه"); },
    onError: () => toast.error("حدث خطأ أثناء حفظ البحث"),
  });

  const availableCities = useMemo(() =>
    [...new Set(allProps.map(p => p.location).filter(Boolean))].sort(), [allProps]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = allProps.filter((p) => {
      if (search && !p.title.includes(search) && !p.location.includes(search) && !p.district.includes(search)) return false;
      if (selectedType && p.type !== selectedType) return false;
      if (selectedKind && !selectedSubKind && p.kind !== selectedKind) return false;
      if (selectedSubKind && p.kind !== selectedSubKind) return false;
      if (selectedCity && !p.location.includes(selectedCity)) return false;
      if (selectedDistrict && p.district !== selectedDistrict && !p.location.includes(selectedDistrict)) return false;
      if (selectedFinishing && p.finishing !== selectedFinishing) return false;
      if (selectedFurnished && p.furnished !== selectedFurnished) return false;
      if (selectedPayment && p.paymentMethod !== selectedPayment) return false;
      if (selectedBeds && p.beds < selectedBeds) return false;
      if (selectedBaths && p.baths < selectedBaths) return false;
      if (selectedFloor) {
        const floorVal = selectedFloor === "أرضي" ? 0 : selectedFloor === "5+" ? null : Number(selectedFloor);
        if (selectedFloor === "5+") { if ((p.floor ?? 0) < 5) return false; }
        else if (floorVal !== null && p.floor !== floorVal) return false;
      }
      if (selectedPrice !== null) {
        const r = PRICE_RANGES[selectedPrice];
        if (p.priceNum < r.min || p.priceNum > r.max) return false;
      }
      if (selectedArea !== null) {
        const r = AREA_RANGES[selectedArea];
        if (p.area < r.min || p.area > r.max) return false;
      }
      if (selectedFeaturedOnly && !p.featured) return false;
      if (selectedFeatures.length > 0) {
        const pf = p.features.join(" ");
        if (!selectedFeatures.every(f => pf.includes(f))) return false;
      }
      if (selectedRecency !== null) {
        const hours = RECENCY_OPTIONS[selectedRecency].hours;
        if (!p.createdAt) return false;
        if ((now - new Date(p.createdAt).getTime()) > hours * 3600 * 1000) return false;
      }
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.priceNum - b.priceNum);
    if (sortBy === "price_desc") list = [...list].sort((a, b) => b.priceNum - a.priceNum);
    if (sortBy === "area") list = [...list].sort((a, b) => b.area - a.area);
    return list;
  }, [allProps, search, selectedType, selectedKind, selectedSubKind, selectedCity, selectedDistrict, selectedFinishing, selectedFurnished, selectedPayment, selectedBeds, selectedBaths, selectedFloor, selectedPrice, selectedArea, selectedFeaturedOnly, selectedFeatures, selectedRecency, sortBy]);

  const ITEMS_PER_PAGE = 30;

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filtered]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const PaginationBar = () => totalPages <= 1 ? null : (
    <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap" dir="rtl">
      <button
        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
      >السابق</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
          if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((item, idx) => item === "..." ? (
          <span key={`e${idx}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={item}
            onClick={() => { setCurrentPage(item as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === item ? "bg-primary text-white shadow-sm" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
          >{item}</button>
        ))}
      <button
        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
      >التالي</button>
    </div>
  );

  const activeCount = [
    selectedType, selectedKind, selectedSubKind, selectedCity, selectedDistrict,
    selectedFinishing, selectedFurnished, selectedPayment,
    selectedBeds !== null ? 1 : null, selectedBaths !== null ? 1 : null,
    selectedFloor, selectedPrice !== null ? 1 : null, selectedArea !== null ? 1 : null,
    selectedFeaturedOnly ? 1 : null, selectedRecency !== null ? 1 : null,
    ...selectedFeatures,
  ].filter(Boolean).length;

  const clearAll = () => {
    setSelectedType(null); setSelectedKind(null); setSelectedSubKind(null); setSelectedCity(null); setSelectedDistrict(null);
    setSelectedFinishing(null); setSelectedFurnished(null); setSelectedPayment(null);
    setSelectedBeds(null); setSelectedBaths(null); setSelectedFloor(null); setSelectedPrice(null); setSelectedArea(null);
    setSelectedFeaturedOnly(false); setSelectedFeatures([]); setSelectedRecency(null); setSearch("");
  };

  const submitReport = async () => {
    if (!reportEmail.trim() || !reportMessage.trim()) { toast.error("برجاء ملء جميع الحقول"); return; }
    setReportLoading(true);
    try {
      await fetch("/api/property-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: reportPropertyId, email: reportEmail, message: reportMessage }) });
      toast.success("تم إرسال البلاغ بنجاح ✓");
      setReportPropertyId(null); setReportEmail(""); setReportMessage("");
    } catch { toast.error("حدث خطأ، حاول مرة أخرى"); }
    finally { setReportLoading(false); }
  };

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const add = !liked.has(id);
    toggleFavMut.mutate({ id, add });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center" dir="rtl">
        <Header />
        <div className="flex flex-col items-center gap-3 text-gray-400 mt-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm">جارٍ تحميل العقارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]" dir="rtl">
      <Header />

      {/* ── Top Search Bar (Dubizzle-style) ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
              <button onClick={() => setLocation("/")} className="hover:text-primary transition-colors">الرئيسية</button>
              <span>/</span>
              <span className="text-gray-700 font-medium">عقارات</span>
            </div>

            {/* Smart Search — grows to fill available space */}
            <div className="flex-1 min-w-[200px]">
              <SmartSearch
                value={search}
                onChange={setSearch}
                placeholder="ابحث بالمدينة أو الحي أو العقار..."
                variant="bar"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-600 focus:outline-none focus:border-primary/40 cursor-pointer"
            >
              <option value="default">الأحدث أولاً</option>
              <option value="price_asc">السعر: الأقل أولاً</option>
              <option value="price_desc">السعر: الأعلى أولاً</option>
              <option value="area">المساحة: الأكبر أولاً</option>
            </select>

            {/* Save search button */}
            <button
              onClick={() => setSaveSearchOpen(v => !v)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 hover:bg-primary/5 hover:border-primary/30 hover:text-primary flex items-center gap-1.5 transition-all whitespace-nowrap"
              title="احفظ هذا البحث"
            >
              <Bell className="w-4 h-4" />
              حفظ البحث
            </button>

            {/* Mobile filter button — shown on tablet/mobile only */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 hover:bg-primary/5 hover:border-primary/30 hover:text-primary flex items-center gap-1.5 transition-all lg:hidden whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4" />
              فلاتر{activeCount > 0 && ` (${activeCount})`}
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                title="عرض قائمة"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                title="عرض شبكة"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-lg transition-all ${viewMode === "map" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                title="عرض خريطة"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>


          {/* ── Save Search Panel ── */}
          <AnimatePresence>
            {saveSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 items-center py-3 border-t border-gray-100 mt-3">
                  <Bell className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">احفظ هذا البحث وسنُعلمك عند إضافة عقارات تطابقه:</span>
                  <Input
                    value={saveSearchName}
                    onChange={e => setSaveSearchName(e.target.value)}
                    placeholder="اسم البحث"
                    className="h-9 rounded-xl text-sm w-40"
                  />
                  <Input
                    value={saveSearchEmail}
                    onChange={e => setSaveSearchEmail(e.target.value)}
                    placeholder="بريدك الإلكتروني (اختياري)"
                    type="email"
                    className="h-9 rounded-xl text-sm w-56"
                  />
                  <button
                    onClick={() => saveSearchMut.mutate()}
                    disabled={saveSearchMut.isPending}
                    className="h-9 px-4 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {saveSearchMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    حفظ
                  </button>
                  <button onClick={() => setSaveSearchOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>


      {/* ── Main Layout ── */}
      <div className="container mx-auto px-4">
        <div className="flex gap-6">

          {/* ═══════════════════════════════════════
              RIGHT SIDEBAR — Filters
          ═══════════════════════════════════════ */}
          <aside className="w-80 shrink-0 hidden lg:flex lg:flex-col py-6">
            {/* Smart-scroll inner: sticky + independent wheel scroll */}
            <div
              ref={sidebarRef}
              className="sticky top-[136px] max-h-[calc(100vh-152px)] overflow-y-auto no-scrollbar [overscroll-behavior:contain]"
            >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-extrabold text-gray-900 text-sm">الفلاتر</span>
                  {activeCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{activeCount}</span>
                  )}
                </div>
                {activeCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-primary hover:underline font-semibold">مسح الكل</button>
                )}
              </div>

              <div className="px-5 pt-4 pb-5">

                {/* ── العقارات المميزة فقط ── */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="font-bold text-gray-800 text-sm">عقارات مميزة فقط</span>
                    <div
                      onClick={() => setSelectedFeaturedOnly(v => !v)}
                      className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${selectedFeaturedOnly ? "bg-primary" : "bg-gray-200"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedFeaturedOnly ? "right-1" : "left-1"}`} />
                    </div>
                  </label>
                </div>

                {/* ── نوع الصفقة ── */}
                <FilterSection title="نوع الصفقة">
                  <div className="flex gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedType(selectedType === t ? null : t)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${selectedType === t ? "bg-primary text-white border-primary shadow-sm" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* ── نوع العقار ── */}
                <FilterSection title="نوع العقار">
                  <div className="flex flex-wrap gap-2">
                    {reCategories.length > 0
                      ? reCategories.map((c) => {
                          const slug = c.slug ?? String(c.id);
                          return (
                            <Chip key={slug} label={c.nameAr} active={selectedKind === slug}
                              onClick={() => { setSelectedKind(selectedKind === slug ? null : slug); setSelectedSubKind(null); }} />
                          );
                        })
                      : KINDS.map((k) => (
                          <Chip key={k} label={k} active={selectedKind === k} onClick={() => { setSelectedKind(selectedKind === k ? null : k); setSelectedSubKind(null); }} />
                        ))
                    }
                  </div>
                  {selectedKind && (() => {
                    const dbSubs = subCategories.map(s => s.nameAr);
                    const activeSubs = dbSubs.length > 0 ? dbSubs : (STATIC_SUBCATS[selectedKind] ?? []);
                    if (activeSubs.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">التصنيف الفرعي:</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Chip label="الكل" active={!selectedSubKind} onClick={() => setSelectedSubKind(null)} />
                          {activeSubs.map(name => (
                            <Chip key={name} label={name} active={selectedSubKind === name}
                              onClick={() => setSelectedSubKind(selectedSubKind === name ? null : name)} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </FilterSection>

                {/* ── المدينة ── */}
                {availableCities.length > 0 && (
                  <FilterSection title="المدينة / المنطقة">
                    <select
                      value={selectedCity ?? ""}
                      onChange={e => setSelectedCity(e.target.value || null)}
                      className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-700 focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="">كل المدن</option>
                      {availableCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FilterSection>
                )}

                {/* ── نطاق السعر ── */}
                <FilterSection title="نطاق السعر (جنيه)">
                  <div className="flex flex-col gap-2">
                    {PRICE_RANGES.map((r, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <div onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedPrice === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                          {selectedPrice === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                          className={`text-sm transition-colors cursor-pointer ${selectedPrice === i ? "text-primary font-semibold" : "text-gray-600"}`}>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* ── المساحة ── */}
                <FilterSection title="المساحة (م²)">
                  <div className="flex flex-col gap-2">
                    {AREA_RANGES.map((r, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <div onClick={() => setSelectedArea(selectedArea === i ? null : i)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedArea === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                          {selectedArea === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span onClick={() => setSelectedArea(selectedArea === i ? null : i)}
                          className={`text-sm transition-colors cursor-pointer ${selectedArea === i ? "text-primary font-semibold" : "text-gray-600"}`}>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* ── عدد الغرف ── */}
                <FilterSection title="عدد غرف النوم">
                  <div className="flex flex-wrap gap-1.5">
                    {BEDS_OPTIONS.map((b) => (
                      <button key={b} onClick={() => setSelectedBeds(selectedBeds === b ? null : b)}
                        className={`w-11 h-10 rounded-xl text-sm font-bold border-2 transition-all ${selectedBeds === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}>
                        {b}+
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* ── عدد الحمامات ── */}
                <FilterSection title="عدد الحمامات">
                  <div className="flex flex-wrap gap-1.5">
                    {BATHS_OPTIONS.map((b) => (
                      <button key={b} onClick={() => setSelectedBaths(selectedBaths === b ? null : b)}
                        className={`w-11 h-10 rounded-xl text-sm font-bold border-2 transition-all ${selectedBaths === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}>
                        {b}+
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* ── رقم الطابق ── */}
                <FilterSection title="رقم الطابق" defaultOpen={false}>
                  <div className="flex flex-wrap gap-1.5">
                    {FLOOR_OPTIONS.map((f) => (
                      <button key={f} onClick={() => setSelectedFloor(selectedFloor === f ? null : f)}
                        className={`px-3 h-9 rounded-xl text-sm font-bold border-2 transition-all ${selectedFloor === f ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* ── التشطيب ── */}
                <FilterSection title="حالة التشطيب">
                  <div className="flex flex-wrap gap-1.5">
                    {FINISHING_OPTIONS.map((v) => (
                      <Chip key={v} label={v} active={selectedFinishing === v}
                        onClick={() => setSelectedFinishing(selectedFinishing === v ? null : v)} />
                    ))}
                  </div>
                </FilterSection>

                {/* ── التأثيث ── */}
                <FilterSection title="التأثيث">
                  <div className="flex flex-wrap gap-1.5">
                    {FURNISHED_OPTIONS.map((v) => (
                      <Chip key={v} label={v} active={selectedFurnished === v}
                        onClick={() => setSelectedFurnished(selectedFurnished === v ? null : v)} />
                    ))}
                  </div>
                </FilterSection>

                {/* ── نظام الدفع ── */}
                <FilterSection title="نظام الدفع">
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_OPTIONS.map((v) => (
                      <Chip key={v} label={v} active={selectedPayment === v}
                        onClick={() => setSelectedPayment(selectedPayment === v ? null : v)} />
                    ))}
                  </div>
                </FilterSection>

                {/* ── الميزات والمرافق ── */}
                {allDynFeatures.length > 0 && (
                <FilterSection title="الميزات والمرافق" defaultOpen={false}>
                  <div className="flex flex-wrap gap-1.5">
                    {allDynFeatures.map((f) => {
                      const active = selectedFeatures.includes(f.name);
                      return (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFeatures(prev =>
                            active ? prev.filter(x => x !== f.name) : [...prev, f.name]
                          )}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"
                          }`}
                        >
                          <FeatureIcon name={f.icon} className="w-3 h-3 shrink-0" />
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
                )}

                {/* ── تاريخ الإضافة ── */}
                <FilterSection title="تاريخ الإضافة" defaultOpen={false}>
                  <div className="flex flex-col gap-2">
                    {RECENCY_OPTIONS.map((r, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <div onClick={() => setSelectedRecency(selectedRecency === i ? null : i)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedRecency === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                          {selectedRecency === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span onClick={() => setSelectedRecency(selectedRecency === i ? null : i)}
                          className={`text-sm transition-colors cursor-pointer ${selectedRecency === i ? "text-primary font-semibold" : "text-gray-600"}`}>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* ── المنطقة من DB ── */}
                {banhaAreas.length > 0 && (
                  <FilterSection title="الحي / المنطقة" defaultOpen={false}>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                      {banhaAreas.map((a) => (
                        <label key={a.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <div onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedDistrict === a.nameAr ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                            {selectedDistrict === a.nameAr && <div className="w-2 h-2 rounded-sm bg-white" />}
                          </div>
                          <span onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)}
                            className={`text-sm transition-colors cursor-pointer ${selectedDistrict === a.nameAr ? "text-primary font-semibold" : "text-gray-600"}`}>{a.nameAr}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* CTA */}
                {activeCount > 0 && (
                  <Button onClick={clearAll} variant="outline" className="w-full rounded-xl text-sm mt-1 border-primary/30 text-primary hover:bg-primary/5">
                    <X className="w-3.5 h-3.5 ml-1" />
                    إزالة كل الفلاتر ({activeCount})
                  </Button>
                )}
              </div>
            </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════
              LEFT — Results
          ═══════════════════════════════════════ */}
          <div className="flex-1 min-w-0 py-6">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600 text-sm">
                  تم العثور على <span className="font-extrabold text-gray-900 text-base">{filtered.length}</span> عقار
                  {totalPages > 1 && (
                    <span className="text-gray-500 text-xs mr-1">
                      — صفحة {currentPage} من {totalPages}
                    </span>
                  )}
                </span>
                {/* Active filter chips */}
                {selectedType && (
                  <span onClick={() => setSelectedType(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedType} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedKind && (
                  <span onClick={() => { setSelectedKind(null); setSelectedSubKind(null); }} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedCatObj?.nameAr ?? selectedKind} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedSubKind && (
                  <span onClick={() => setSelectedSubKind(null)} className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-teal-200">
                    {selectedSubKind} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedCity && (
                  <span onClick={() => setSelectedCity(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedCity} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedDistrict && (
                  <span onClick={() => setSelectedDistrict(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedDistrict} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedFinishing && (
                  <span onClick={() => setSelectedFinishing(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedFinishing} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedFurnished && (
                  <span onClick={() => setSelectedFurnished(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedFurnished} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedPayment && (
                  <span onClick={() => setSelectedPayment(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedPayment} <X className="w-3 h-3" />
                  </span>
                )}
                {selectedBeds !== null && (
                  <span onClick={() => setSelectedBeds(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {selectedBeds}+ غرف <X className="w-3 h-3" />
                  </span>
                )}
                {selectedPrice !== null && (
                  <span onClick={() => setSelectedPrice(null)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:bg-primary/20">
                    {PRICE_RANGES[selectedPrice].label} <X className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* ── LIST VIEW ── */}
              {viewMode === "list" && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white rounded-3xl border border-gray-200">
                      <Building2 className="w-16 h-16 text-gray-200" />
                      <p className="text-xl font-bold text-gray-400">لا توجد عقارات مطابقة</p>
                      <p className="text-sm text-gray-400">جرّب تعديل الفلاتر أو مسحها</p>
                      <Button onClick={clearAll} variant="outline" className="rounded-full mt-1">مسح الفلاتر</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {paginatedItems.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.03 }}
                        >
                          <div
                            className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-row relative ${p.featured ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"}`}
                            onClick={() => setLocation(`/property/${p.id}`)}
                            onMouseEnter={() => setHoveredId(p.id)}
                            onMouseLeave={() => setHoveredId(null)}
                          >
                            {/* ── Featured ribbon — right edge ── */}
                            {p.featured && (
                              <div className="absolute top-0 right-0 z-30 overflow-hidden w-16 h-16 pointer-events-none">
                                <div className="absolute top-3 -right-4 bg-amber-400 text-amber-900 text-[9px] font-extrabold py-0.5 w-20 text-center shadow-sm rotate-45 origin-center">
                                  مميز ✦
                                </div>
                              </div>
                            )}

                            {/* ── Image ── */}
                            <PropertyImageGallery
                              images={p.imgs}
                              alt={p.title}
                              fallback={FALLBACK}
                              className="shrink-0 w-60 sm:w-80 min-h-[280px]"
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

                              {/* Type badge + time */}
                              <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-20">
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow text-white ${p.type === "للبيع" ? "bg-emerald-500" : "bg-blue-500"}`}>
                                  {p.type}
                                </span>
                              </div>

                              {/* Like button */}
                              <button
                                className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${liked.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/80 border-white/50 text-gray-500 hover:bg-rose-500/80 hover:text-white"}`}
                                onClick={(e) => toggleLike(p.id, e)}
                              >
                                <Heart className={`w-3.5 h-3.5 ${liked.has(p.id) ? "fill-white" : ""}`} />
                              </button>

                              {/* Category label */}
                              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/60 to-transparent text-white text-[9px] font-medium px-2 pb-1.5 pt-3 text-center">
                                {reCategories.find(c => (c.slug ?? String(c.id)) === p.kind)?.nameAr ?? p.kind}
                              </div>
                            </PropertyImageGallery>

                            {/* ── Content ── */}
                            <div className="flex-1 flex flex-col p-6 gap-0 min-w-0">
                              {/* Price */}
                              <div className="flex items-baseline gap-1.5 mb-2">
                                <span className="text-[22px] sm:text-2xl font-black text-gray-900 leading-none tracking-tight">{p.price.replace(" ج.م", "")}</span>
                                <span className="text-sm font-semibold text-gray-800">ج.م</span>
                                {p.type === "للإيجار" && <span className="text-xs text-gray-700">/ شهر</span>}
                              </div>

                              {/* Title */}
                              <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 mb-2">
                                {p.title}
                              </h3>

                              {/* Location */}
                              <div className="flex items-center gap-1 text-gray-800 text-sm mb-3">
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="line-clamp-1">{p.location || p.district || "بنها"}</span>
                              </div>

                              {/* Specs — always show beds */}
                              <div className="flex items-center gap-4 mb-3 flex-wrap">
                                <div className="flex items-center gap-1.5 text-gray-900 text-sm">
                                  <BedDouble className="w-4 h-4 text-gray-600 shrink-0" />
                                  <span className="font-semibold">{p.beds || "—"}</span>
                                  <span className="text-gray-700">غرف</span>
                                </div>
                                {p.baths > 0 && (
                                  <div className="flex items-center gap-1.5 text-gray-900 text-sm">
                                    <Bath className="w-4 h-4 text-gray-600 shrink-0" />
                                    <span className="font-semibold">{p.baths}</span>
                                    <span className="text-gray-700">حمام</span>
                                  </div>
                                )}
                                {p.area > 0 && (
                                  <div className="flex items-center gap-1.5 text-gray-900 text-sm">
                                    <Maximize2 className="w-4 h-4 text-gray-600 shrink-0" />
                                    <span className="font-semibold">{p.area}</span>
                                    <span className="text-gray-700">م²</span>
                                  </div>
                                )}
                              </div>

                              {/* Extra tags: finishing / floor / furnished / payment */}
                              {(p.finishing || p.floor != null || p.furnished || p.paymentMethod) && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {p.finishing && (
                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{p.finishing}</span>
                                  )}
                                  {p.floor != null && (
                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                      {p.floor === 0 ? "دور أرضي" : `دور ${p.floor}`}
                                    </span>
                                  )}
                                  {p.furnished && p.furnished !== "غير مفروش" && (
                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{p.furnished}</span>
                                  )}
                                  {p.paymentMethod && (
                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{p.paymentMethod}</span>
                                  )}
                                </div>
                              )}

                              {/* Divider */}
                              <div className="border-t border-gray-100 mb-3" />

                              {/* Agent row */}
                              {p.agentName && (
                                <div className="flex items-center gap-2 min-w-0 mb-2">
                                  {(p.agentAvatar || p.agentLogo) ? (
                                    <img
                                      src={p.agentAvatar || p.agentLogo}
                                      alt={p.agentName}
                                      className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                                      onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.agentName || "م")}&background=0d9488&color=fff&size=28`; }}
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                                      {p.agentName.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold text-gray-900 truncate">{p.agentName}</span>
                                </div>
                              )}

                              {/* Time + views + compare + flag — one line */}
                              <div className="flex items-center justify-between gap-1">
                                {p.createdAt && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-600 shrink-0" />
                                    <span className="text-xs font-semibold text-gray-900">{timeAgo(p.createdAt)}</span>
                                    {(p.viewCount ?? 0) > 0 && (
                                      <span className="flex items-center gap-0.5 text-gray-700 text-[10px] mr-1">
                                        <Eye className="w-2.5 h-2.5" />{p.viewCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); const r = addToCompare({ id: p.id, title: p.title, price: p.price, priceNum: p.priceNum, image: p.img, location: p.location, beds: p.beds, baths: p.baths, area: p.area, type: p.type, kind: p.kind, year: 0, finishing: "" }); if (r === "added") toast.success("أُضيف للمقارنة ✓"); else if (r === "already") toast("موجود بالفعل"); else toast.error("المقارنة ممتلئة (٤ عقارات)"); }}
                                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${isInCompare(p.id) ? "bg-primary/10 border-primary/40 text-primary" : "border-gray-200 text-gray-600 hover:border-primary/30 hover:text-primary"}`}
                                    title="أضف للمقارنة"
                                  >
                                    <GitCompare className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReportPropertyId(p.id); }}
                                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-rose-500 hover:border-rose-200 transition-all"
                                    title="إبلاغ"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* تواصل مع المعلن */}
                              {(p.whatsapp || p.phone) && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-right">تواصل مع المعلن</p>
                                  <div className="flex items-center gap-2">
                                    {p.whatsapp && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${p.whatsapp.replace(/\D/g,"")}`, "_blank"); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
                                      >
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.54 5.879L.057 23.882l6.162-1.615A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.016-1.38l-.36-.214-3.727.977.996-3.638-.235-.374A9.79 9.79 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818 5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z"/></svg>
                                        واتساب
                                      </button>
                                    )}
                                    {p.phone && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${p.phone}`; }}
                                        className={`flex items-center justify-center gap-1.5 h-10 rounded-xl border border-gray-200 text-gray-700 hover:text-primary hover:border-primary/40 hover:bg-primary/5 text-xs font-bold transition-all ${p.whatsapp ? "px-5" : "flex-1"}`}
                                      >
                                        <Phone className="w-4 h-4 shrink-0" />
                                        اتصال
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <PaginationBar />
                </motion.div>
              )}

              {/* ── GRID VIEW ── */}
              {viewMode === "grid" && (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white rounded-3xl border border-gray-200">
                      <Building2 className="w-16 h-16 text-gray-200" />
                      <p className="text-xl font-bold text-gray-400">لا توجد عقارات مطابقة</p>
                      <p className="text-sm text-gray-400">جرّب تعديل الفلاتر أو مسحها</p>
                      <Button onClick={clearAll} variant="outline" className="rounded-full mt-1">مسح الفلاتر</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {paginatedItems.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: idx * 0.04 }}
                        >
                          <div
                            className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer"
                            onClick={() => setLocation(`/property/${p.id}`)}
                            onMouseEnter={() => setHoveredId(p.id)}
                            onMouseLeave={() => setHoveredId(null)}
                          >
                            {/* Image */}
                            <PropertyImageGallery
                              images={p.imgs}
                              alt={p.title}
                              fallback={FALLBACK}
                              className="h-52"
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                              <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow ${p.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                                  {p.type}
                                </span>
                                {p.featured && (
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-400 text-amber-900 shadow">مميز</span>
                                )}
                              </div>
                              <div className="absolute bottom-3 right-3 z-20">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-white border border-white/20">
                                  {p.kind}
                                </span>
                              </div>
                              <button
                                className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${liked.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500/80"}`}
                                onClick={(e) => toggleLike(p.id, e)}
                              >
                                <Heart className={`w-3.5 h-3.5 ${liked.has(p.id) ? "fill-white" : ""}`} />
                              </button>
                            </PropertyImageGallery>

                            {/* Body */}
                            <div>
                              {/* Price banner */}
                              <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
                                <div>
                                  <p className="text-white font-extrabold text-xl leading-none">{p.price}</p>
                                  <p className="text-primary-foreground/70 text-[11px] mt-0.5">جنيه</p>
                                </div>
                                {p.verified && (
                                  <span className="flex items-center gap-0.5 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/30">
                                    <BadgeCheck className="w-3 h-3 text-teal-200" /> موثّق
                                  </span>
                                )}
                              </div>
                              <div className="p-4 flex flex-col gap-2">
                              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                                {p.title}
                              </h3>
                              <div className="flex items-center gap-1 text-gray-800 text-xs">
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{p.location}</span>
                              </div>

                              {/* Specs — always show beds */}
                              <div className="flex items-center gap-2.5 text-gray-900 text-xs">
                                <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-gray-600" />{p.beds || "—"} غرف</span>
                                {p.baths > 0 && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-gray-600" />{p.baths} حمام</span>}
                                {p.area > 0 && <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-gray-600" />{p.area}م²</span>}
                              </div>

                              {/* Agent + actions */}
                              <div className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-100">
                                {p.agentName && (
                                  <>
                                    {(p.agentAvatar || p.agentLogo) ? (
                                      <img src={p.agentAvatar || p.agentLogo} alt={p.agentName} className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.agentName||"م")}&background=0d9488&color=fff&size=24`; }} />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-[10px]">{p.agentName.charAt(0)}</div>
                                    )}
                                    <span className="text-[11px] text-gray-900 font-semibold truncate flex-1">{p.agentName}</span>
                                  </>
                                )}
                                {!p.agentName && <span className="flex-1" />}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button className="p-1 rounded-lg border border-rose-200 text-rose-400 hover:bg-rose-50 transition-all" title="إبلاغ" onClick={(e) => { e.stopPropagation(); setReportPropertyId(p.id); }}>
                                    <Flag className="w-3 h-3" />
                                  </button>
                                  <button className={`p-1 rounded-lg border transition-all ${isInCompare(p.id) ? "bg-primary/10 border-primary/40 text-primary" : "border-gray-200 text-gray-700 hover:border-primary/30 hover:text-primary"}`} title="قارن" onClick={(e) => { e.stopPropagation(); const r = addToCompare({ id: p.id, title: p.title, price: p.price, priceNum: p.priceNum, image: p.img, location: p.location, beds: p.beds, baths: p.baths, area: p.area, type: p.type, kind: p.kind, year: 0, finishing: "" }); if (r === "added") toast.success("أُضيف للمقارنة ✓"); else if (r === "already") toast("موجود بالفعل"); else toast.error("المقارنة ممتلئة (٤ عقارات)"); }}>
                                    <GitCompare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* تواصل مع المعلن */}
                              {(p.whatsapp || p.phone) && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 mb-1.5 text-right">تواصل مع المعلن</p>
                                  <div className="flex gap-2">
                                    {p.whatsapp && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${p.whatsapp.replace(/\D/g,"")}`, "_blank"); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-sm"
                                      >
                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.54 5.879L.057 23.882l6.162-1.615A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.016-1.38l-.36-.214-3.727.977.996-3.638-.235-.374A9.79 9.79 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818 5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z"/></svg>
                                        واتساب
                                      </button>
                                    )}
                                    {p.phone && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${p.phone}`; }}
                                        className={`flex items-center justify-center gap-1.5 h-9 rounded-xl border border-gray-200 text-gray-700 hover:text-primary hover:border-primary/40 hover:bg-primary/5 text-xs font-bold transition-all ${p.whatsapp ? "px-4" : "flex-1"}`}
                                      >
                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                        اتصال
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <PaginationBar />
                </motion.div>
              )}

              {/* ── MAP VIEW ── */}
              {viewMode === "map" && (
                <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[520px]">
                    {/* Scrollable list */}
                    <div className="w-72 shrink-0 overflow-y-auto space-y-3" style={{ scrollbarWidth: "thin" }}>
                      {filtered.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                          لا توجد عقارات مطابقة
                        </div>
                      )}
                      {filtered.map((p) => (
                        <div
                          key={p.id}
                          className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-all ${hoveredId === p.id ? "border-primary shadow-md" : "border-gray-200 hover:border-primary/30 hover:shadow-sm"}`}
                          onClick={() => setLocation(`/property/${p.id}`)}
                          onMouseEnter={() => setHoveredId(p.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <div className="flex">
                            <div className="w-24 h-20 shrink-0 overflow-hidden">
                              <img src={p.img} alt={p.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                            </div>
                            <div className="p-2.5 flex-1 min-w-0">
                              <p className="text-gray-900 font-extrabold text-sm leading-none mb-0.5">{p.price}</p>
                              <p className="font-semibold text-gray-900 text-xs leading-snug mb-1 line-clamp-1">{p.title}</p>
                              <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
                                <MapPin className="w-2.5 h-2.5 text-primary" /><span className="truncate">{p.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                {p.beds > 0 && <span>{p.beds} غرف</span>}
                                <span>{p.area}م²</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Map */}
                    <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <MapContainer center={MAP_CENTER} zoom={6} className="h-full w-full">
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        {filtered.map((p) => (
                          <Marker
                            key={p.id}
                            position={[p.lat, p.lng]}
                            eventHandlers={{
                              mouseover: () => setHoveredId(p.id),
                              mouseout: () => setHoveredId(null),
                              click: () => setLocation(`/property/${p.id}`),
                            }}
                          >
                            <Popup>
                              <div className="text-right min-w-[180px]" dir="rtl" onClick={() => setLocation(`/property/${p.id}`)}>
                                <img src={p.img} alt={p.title} className="w-full h-20 object-cover rounded-lg mb-2" onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                                <p className="font-extrabold text-gray-900 text-sm mb-0.5">{p.price} <span className="text-xs text-gray-400 font-normal">ج.م</span></p>
                                <p className="font-bold text-gray-900 text-xs mb-0.5">{p.title}</p>
                                <p className="text-xs text-gray-500">{p.location}</p>
                                <p className="text-xs text-primary font-semibold mt-1.5 cursor-pointer">عرض التفاصيل ←</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Mobile Filters Sheet ── */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="right" className="w-80 max-w-full p-0 flex flex-col overflow-hidden" dir="rtl">
          <SheetHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-extrabold text-gray-900 m-0">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              الفلاتر
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{activeCount}</span>
              )}
            </SheetTitle>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-primary hover:underline font-semibold">مسح الكل</button>
            )}
          </SheetHeader>

          <div className="filters-scroll-area flex-1 overflow-y-auto px-5 pt-4 pb-5">
            {/* Transaction Type */}
            <FilterSection title="نوع الصفقة">
              <div className="flex flex-col gap-2">
                {TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
                    <div onClick={() => setSelectedType(selectedType === t ? null : t)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedType === t ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                      {selectedType === t && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                    <span onClick={() => setSelectedType(selectedType === t ? null : t)} className={`text-sm transition-colors ${selectedType === t ? "text-primary font-semibold" : "text-gray-600"}`}>{t}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Property Kind */}
            <FilterSection title="نوع العقار">
              <div className="flex flex-wrap gap-2">
                {reCategories.length > 0
                  ? reCategories.map((c) => {
                      const slug = c.slug ?? String(c.id);
                      return <Chip key={slug} label={c.nameAr} active={selectedKind === slug} onClick={() => { const next = selectedKind === slug ? null : slug; setSelectedKind(next); setSelectedSubKind(null); }} />;
                    })
                  : KINDS.map((k) => <Chip key={k} label={k} active={selectedKind === k} onClick={() => { setSelectedKind(selectedKind === k ? null : k); setSelectedSubKind(null); }} />)
                }
              </div>
              {selectedKind && subCategories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">تخصيص أكثر:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subCategories.map((s) => <Chip key={s.id} label={s.nameAr} active={selectedSubKind === s.nameAr} onClick={() => setSelectedSubKind(selectedSubKind === s.nameAr ? null : s.nameAr)} />)}
                  </div>
                </div>
              )}
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="نطاق السعر (جنيه)">
              <div className="flex flex-col gap-2">
                {PRICE_RANGES.map((r, i) => (
                  <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                    <div onClick={() => setSelectedPrice(selectedPrice === i ? null : i)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedPrice === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                      {selectedPrice === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span onClick={() => setSelectedPrice(selectedPrice === i ? null : i)} className={`text-sm transition-colors ${selectedPrice === i ? "text-primary font-semibold" : "text-gray-600"}`}>{r.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Bedrooms */}
            <FilterSection title="عدد غرف النوم">
              <div className="flex flex-wrap gap-1.5">
                {BEDS_OPTIONS.map((b) => (
                  <button key={b} onClick={() => setSelectedBeds(selectedBeds === b ? null : b)} className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${selectedBeds === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}>{b}+</button>
                ))}
              </div>
            </FilterSection>

            {/* Area */}
            <FilterSection title="المساحة" defaultOpen={true}>
              <div className="flex flex-col gap-2">
                {AREA_RANGES.map((r, i) => (
                  <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                    <div onClick={() => setSelectedArea(selectedArea === i ? null : i)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedArea === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                      {selectedArea === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span onClick={() => setSelectedArea(selectedArea === i ? null : i)} className={`text-sm transition-colors ${selectedArea === i ? "text-primary font-semibold" : "text-gray-600"}`}>{r.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* District */}
            {banhaAreas.length > 0 && (
              <FilterSection title="المنطقة">
                <div className="flex flex-col gap-2">
                  {banhaAreas.map((a) => (
                    <label key={a.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <div onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedDistrict === a.nameAr ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
                        {selectedDistrict === a.nameAr && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)} className={`text-sm transition-colors ${selectedDistrict === a.nameAr ? "text-primary font-semibold" : "text-gray-600"}`}>{a.nameAr}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Finishing */}
            <FilterSection title="التشطيب" defaultOpen={true}>
              <div className="flex flex-wrap gap-2">
                {["سوبر لوكس", "لوكس", "عادي", "نص تشطيب", "بدون تشطيب"].map((v) => (
                  <Chip key={v} label={v} active={selectedFinishing === v} onClick={() => setSelectedFinishing(selectedFinishing === v ? null : v)} />
                ))}
              </div>
            </FilterSection>

            {/* Furnished */}
            <FilterSection title="التأثيث" defaultOpen={true}>
              <div className="flex flex-wrap gap-2">
                {["مفروش بالكامل", "نص تشطيب", "غير مفروش"].map((v) => (
                  <Chip key={v} label={v} active={selectedFurnished === v} onClick={() => setSelectedFurnished(selectedFurnished === v ? null : v)} />
                ))}
              </div>
            </FilterSection>

            {/* Payment */}
            <FilterSection title="نظام الدفع" defaultOpen={true}>
              <div className="flex flex-wrap gap-2">
                {["كاش", "تقسيط", "كاش أو تقسيط"].map((v) => (
                  <Chip key={v} label={v} active={selectedPayment === v} onClick={() => setSelectedPayment(selectedPayment === v ? null : v)} />
                ))}
              </div>
            </FilterSection>

            {/* Features - dynamic from DB */}
            {allDynFeatures.length > 0 && (
              <FilterSection title="الميزات والمرافق" defaultOpen={false}>
                <div className="flex flex-wrap gap-1.5">
                  {allDynFeatures.map((f) => {
                    const active = selectedFeatures.includes(f.name);
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFeatures(prev =>
                          active ? prev.filter(x => x !== f.name) : [...prev, f.name]
                        )}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary"
                        }`}
                      >
                        <FeatureIcon name={f.icon} className="w-3 h-3 shrink-0" />
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}
          </div>

          {/* Mobile Sheet footer */}
          <div className="shrink-0 px-5 pt-3 pb-5 border-t border-gray-100 flex gap-2">
            {activeCount > 0 && (
              <Button onClick={() => { clearAll(); }} variant="outline" className="flex-1 rounded-xl text-sm border-primary/30 text-primary hover:bg-primary/5">
                <X className="w-3.5 h-3.5 ml-1" />
                مسح الفلاتر
              </Button>
            )}
            <Button onClick={() => setMobileFiltersOpen(false)} className="flex-1 rounded-xl text-sm bg-primary hover:bg-primary/90 text-white">
              عرض {filtered.length} عقار
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Floating Compare Bar ── */}
      <AnimatePresence>
        {compareItems.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                <Scale className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-gray-900 shrink-0">مقارنة ({compareItems.length}/4)</span>
                <div className="flex items-center gap-2 mr-2">
                  {compareItems.map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 bg-primary/8 rounded-xl px-3 py-1.5 shrink-0">
                      <img src={item.image} alt="" className="w-7 h-7 rounded-lg object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                      <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">{item.title}</span>
                      <button onClick={() => removeFromCompare(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setLocation("/compare")} disabled={compareItems.length < 2} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all">
                  قارن الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RealEstateFooter />

      {/* ── Report Dialog ── */}
      <Dialog open={reportPropertyId !== null} onOpenChange={(o) => { if (!o) { setReportPropertyId(null); setReportEmail(""); setReportMessage(""); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Flag className="w-4 h-4" />
              الإبلاغ عن إساءة
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-email">البريد الإلكتروني</Label>
              <Input id="rep-email" type="email" placeholder="example@email.com" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-msg">تفاصيل البلاغ</Label>
              <Textarea id="rep-msg" rows={4} placeholder="اكتب تفاصيل المشكلة هنا..." value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button onClick={submitReport} disabled={reportLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال البلاغ"}
            </Button>
            <Button variant="outline" onClick={() => { setReportPropertyId(null); setReportEmail(""); setReportMessage(""); }}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
