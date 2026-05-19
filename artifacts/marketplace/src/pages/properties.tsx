import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Building2,
  Heart, Star, Map, Grid3X3, X, ChevronDown, ChevronUp,
  SlidersHorizontal, TrendingUp, CheckCircle2, Loader2, Bell, BellOff,
  LayoutList, Scale, GitCompare, Eye, Clock,
} from "lucide-react";
import { api, type Category, type Area, type Subcategory } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompare, addToCompare, removeFromCompare } from "@/lib/compare-store";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
};

type DisplayProp = {
  id: number;
  title: string;
  type: string;
  kind: string;
  featured: boolean;
  img: string;
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
    location: row.address ?? "",
    district: row.district ?? "",
    beds: row.rooms ?? 0,
    baths: row.bathrooms ?? 0,
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

const FALLBACK = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80";
const MAP_CENTER: [number, number] = [24.7136, 46.6753];

const CITIES: string[] = [];
const KINDS = ["فيلا", "شقة", "مكتب", "دوبلكس", "أرض"];
const TYPES = ["للبيع", "للإيجار"];
const BEDS_OPTIONS = [1, 2, 3, 4, 5];
const PRICE_RANGES = [
  { label: "أقل من 500 ألف", min: 0, max: 500000 },
  { label: "500 ألف – مليون", min: 500000, max: 1000000 },
  { label: "مليون – 3 مليون", min: 1000000, max: 3000000 },
  { label: "أكثر من 3 مليون", min: 3000000, max: Infinity },
];
const AREA_RANGES = [
  { label: "أقل من 150 م²", min: 0, max: 150 },
  { label: "150 – 300 م²", min: 150, max: 300 },
  { label: "300 – 600 م²", min: 300, max: 600 },
  { label: "أكثر من 600 م²", min: 600, max: Infinity },
];

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
  const [selectedPrice, setSelectedPrice] = useState<number | null>(() => {
    if (!initParams.price) return null;
    const [min, max] = initParams.price.split("-").map(Number);
    const idx = PRICE_RANGES.findIndex(r => r.min === min && (r.max === max || (max > 1e7 && r.max === Infinity)));
    return idx >= 0 ? idx : null;
  });
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");
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

  const filtered = useMemo(() => {
    let list = allProps.filter((p) => {
      if (search && !p.title.includes(search) && !p.location.includes(search)) return false;
      if (selectedType && p.type !== selectedType) return false;
      if (selectedKind && !selectedSubKind && p.kind !== selectedKind) return false;
      if (selectedSubKind && p.kind !== selectedSubKind) return false;
      if (selectedCity && !p.location.includes(selectedCity)) return false;
      if (selectedDistrict && p.district !== selectedDistrict && !p.location.includes(selectedDistrict)) return false;
      if (selectedFinishing && p.finishing !== selectedFinishing) return false;
      if (selectedFurnished && p.furnished !== selectedFurnished) return false;
      if (selectedPayment && p.paymentMethod !== selectedPayment) return false;
      if (selectedBeds && p.beds < selectedBeds) return false;
      if (selectedPrice !== null) {
        const r = PRICE_RANGES[selectedPrice];
        if (p.priceNum < r.min || p.priceNum > r.max) return false;
      }
      if (selectedArea !== null) {
        const r = AREA_RANGES[selectedArea];
        if (p.area < r.min || p.area > r.max) return false;
      }
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.priceNum - b.priceNum);
    if (sortBy === "price_desc") list = [...list].sort((a, b) => b.priceNum - a.priceNum);
    if (sortBy === "area") list = [...list].sort((a, b) => b.area - a.area);
    return list;
  }, [allProps, search, selectedType, selectedKind, selectedSubKind, selectedCity, selectedDistrict, selectedFinishing, selectedFurnished, selectedPayment, selectedBeds, selectedPrice, selectedArea, sortBy]);

  const activeCount = [selectedType, selectedKind, selectedSubKind, selectedCity, selectedDistrict, selectedFinishing, selectedFurnished, selectedPayment, selectedBeds !== null ? 1 : null, selectedPrice !== null ? 1 : null, selectedArea !== null ? 1 : null].filter(Boolean).length;

  const clearAll = () => {
    setSelectedType(null); setSelectedKind(null); setSelectedSubKind(null); setSelectedCity(null); setSelectedDistrict(null);
    setSelectedFinishing(null); setSelectedFurnished(null); setSelectedPayment(null);
    setSelectedBeds(null); setSelectedPrice(null); setSelectedArea(null); setSearch("");
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
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <button onClick={() => setLocation("/")} className="hover:text-primary transition-colors">الرئيسية</button>
            <span>/</span>
            <span className="text-gray-700 font-medium">العقارات</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Transaction type tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(selectedType === t ? null : t)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${selectedType === t ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                >
                  {t}
                </button>
              ))}
              {selectedType && (
                <button onClick={() => setSelectedType(null)} className="px-5 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-gray-700">الكل</button>
              )}
            </div>

            {/* Search input */}
            <div className="relative flex-1 min-w-52">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالمدينة أو الحي أو العقار..."
                className="pr-10 h-10 rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white"
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ═══════════════════════════════════════
              RIGHT SIDEBAR — Filters (Dubizzle style)
          ═══════════════════════════════════════ */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden"
              style={{ position: "sticky", top: "9.5rem", height: "calc(100vh - 9.5rem)" }}
            >
              {/* Header — pinned, never scrolls */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
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

              {/* Scrollable filter body — isolated from page scroll */}
              <div className="filters-scroll-area flex-1 overflow-y-auto px-5 pt-4 pb-5">

              {/* Transaction Type */}
              <FilterSection title="نوع الصفقة">
                <div className="flex flex-col gap-2">
                  {TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setSelectedType(selectedType === t ? null : t)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedType === t ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}
                      >
                        {selectedType === t && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span
                        onClick={() => setSelectedType(selectedType === t ? null : t)}
                        className={`text-sm transition-colors ${selectedType === t ? "text-primary font-semibold" : "text-gray-600"}`}
                      >{t}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Property Kind — dynamic from admin real estate categories */}
              <FilterSection title="نوع العقار">
                <div className="flex flex-wrap gap-2">
                  {reCategories.length > 0
                    ? reCategories.map((c) => {
                        const slug = c.slug ?? String(c.id);
                        return (
                          <Chip
                            key={slug}
                            label={c.nameAr}
                            active={selectedKind === slug}
                            onClick={() => {
                              const next = selectedKind === slug ? null : slug;
                              setSelectedKind(next);
                              setSelectedSubKind(null);
                            }}
                          />
                        );
                      })
                    : KINDS.map((k) => (
                        <Chip key={k} label={k} active={selectedKind === k} onClick={() => { setSelectedKind(selectedKind === k ? null : k); setSelectedSubKind(null); }} />
                      ))
                  }
                </div>
                {/* Subcategory chips — appear when a main category is selected */}
                {selectedKind && subCategories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">تخصيص أكثر:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subCategories.map((s) => (
                        <Chip
                          key={s.id}
                          label={s.nameAr}
                          active={selectedSubKind === s.nameAr}
                          onClick={() => setSelectedSubKind(selectedSubKind === s.nameAr ? null : s.nameAr)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </FilterSection>

              {/* Price Range */}
              <FilterSection title="نطاق السعر (جنيه)">
                <div className="flex flex-col gap-2">
                  {PRICE_RANGES.map((r, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedPrice === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}
                      >
                        {selectedPrice === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span
                        onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                        className={`text-sm transition-colors ${selectedPrice === i ? "text-primary font-semibold" : "text-gray-600"}`}
                      >{r.label}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Bedrooms */}
              <FilterSection title="عدد غرف النوم">
                <div className="flex flex-wrap gap-1.5">
                  {BEDS_OPTIONS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBeds(selectedBeds === b ? null : b)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${selectedBeds === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}
                    >
                      {b}+
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Area */}
              <FilterSection title="المساحة" defaultOpen={true}>
                <div className="flex flex-col gap-2">
                  {AREA_RANGES.map((r, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setSelectedArea(selectedArea === i ? null : i)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedArea === i ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}
                      >
                        {selectedArea === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span
                        onClick={() => setSelectedArea(selectedArea === i ? null : i)}
                        className={`text-sm transition-colors ${selectedArea === i ? "text-primary font-semibold" : "text-gray-600"}`}
                      >{r.label}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* District / منطقة */}
              {banhaAreas.length > 0 && (
                <FilterSection title="المنطقة">
                  <div className="flex flex-col gap-2">
                    {banhaAreas.map((a) => (
                      <label key={a.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <div
                          onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedDistrict === a.nameAr ? "bg-primary border-primary" : "border-gray-300 group-hover:border-primary/50"}`}
                        >
                          {selectedDistrict === a.nameAr && <div className="w-2 h-2 rounded-sm bg-white" />}
                        </div>
                        <span
                          onClick={() => setSelectedDistrict(selectedDistrict === a.nameAr ? null : a.nameAr)}
                          className={`text-sm transition-colors ${selectedDistrict === a.nameAr ? "text-primary font-semibold" : "text-gray-600"}`}
                        >{a.nameAr}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Finishing / التشطيب */}
              <FilterSection title="التشطيب" defaultOpen={true}>
                <div className="flex flex-wrap gap-2">
                  {["سوبر لوكس", "لوكس", "عادي", "نص تشطيب", "بدون تشطيب"].map((v) => (
                    <Chip key={v} label={v} active={selectedFinishing === v} onClick={() => setSelectedFinishing(selectedFinishing === v ? null : v)} />
                  ))}
                </div>
              </FilterSection>

              {/* Furnished / التأثيث */}
              <FilterSection title="التأثيث" defaultOpen={true}>
                <div className="flex flex-wrap gap-2">
                  {["مفروش بالكامل", "نص تشطيب", "غير مفروش"].map((v) => (
                    <Chip key={v} label={v} active={selectedFurnished === v} onClick={() => setSelectedFurnished(selectedFurnished === v ? null : v)} />
                  ))}
                </div>
              </FilterSection>

              {/* Payment / نظام الدفع */}
              <FilterSection title="نظام الدفع" defaultOpen={true}>
                <div className="flex flex-wrap gap-2">
                  {["كاش", "تقسيط", "كاش أو تقسيط"].map((v) => (
                    <Chip key={v} label={v} active={selectedPayment === v} onClick={() => setSelectedPayment(selectedPayment === v ? null : v)} />
                  ))}
                </div>
              </FilterSection>

              {/* CTA */}
              {activeCount > 0 && (
                <Button onClick={clearAll} variant="outline" className="w-full rounded-xl text-sm mt-1 border-primary/30 text-primary hover:bg-primary/5">
                  <X className="w-3.5 h-3.5 ml-1" />
                  إزالة كل الفلاتر
                </Button>
              )}
              </div>{/* end .filters-scroll-area */}
            </div>
          </aside>

          {/* ═══════════════════════════════════════
              LEFT — Results
          ═══════════════════════════════════════ */}
          <div className="flex-1 min-w-0 results-scroll-area">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600 text-sm">
                  تم العثور على <span className="font-extrabold text-gray-900 text-base">{filtered.length}</span> عقار
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
                      {filtered.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.03 }}
                        >
                          <div
                            className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row"
                            onClick={() => setLocation(`/property/${p.id}`)}
                            onMouseEnter={() => setHoveredId(p.id)}
                            onMouseLeave={() => setHoveredId(null)}
                          >
                            {/* Image */}
                            <div className="relative w-full sm:w-64 shrink-0 h-52 sm:h-auto overflow-hidden bg-gray-100">
                              <img
                                src={p.img}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                onError={(e) => { e.currentTarget.src = FALLBACK; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent sm:bg-gradient-to-l" />

                              {/* Top badges */}
                              <div className="absolute top-3 right-3 flex gap-1.5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow ${p.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                                  {p.type}
                                </span>
                                {p.featured && (
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-400 text-amber-900 shadow">مميز</span>
                                )}
                              </div>

                              {/* Kind badge */}
                              <div className="absolute bottom-3 right-3 sm:bottom-3 sm:right-3">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-white border border-white/20">
                                  {p.kind}
                                </span>
                              </div>

                              {/* Like */}
                              <button
                                className={`absolute top-3 left-3 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${liked.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500/80"}`}
                                onClick={(e) => toggleLike(p.id, e)}
                              >
                                <Heart className={`w-3.5 h-3.5 ${liked.has(p.id) ? "fill-white" : ""}`} />
                              </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 p-5 flex flex-col justify-between">
                              <div>
                                {/* Price + rating */}
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-gray-900 font-extrabold text-xl leading-none">{p.price}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">جنيه مصري</p>
                                  </div>
                                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-bold text-gray-700">4.8</span>
                                  </div>
                                </div>

                                <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
                                  {p.title}
                                </h3>

                                <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate">{p.location}</span>
                                </div>
                              </div>

                              {/* Date + Views strip */}
                              <div className="flex items-center gap-3 mb-2.5">
                                {p.createdAt && (
                                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock className="w-3 h-3 text-gray-300" />
                                    {timeAgo(p.createdAt)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                  <Eye className="w-3 h-3 text-gray-300" />
                                  {(p.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدة
                                </span>
                              </div>

                              {/* Specs + CTA */}
                              <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                {p.beds > 0 && (
                                  <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                                    <BedDouble className="w-4 h-4 text-gray-400" />{p.beds} غرف
                                  </span>
                                )}
                                {p.baths > 0 && (
                                  <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                                    <Bath className="w-4 h-4 text-gray-400" />{p.baths} حمام
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                                  <Maximize2 className="w-4 h-4 text-gray-400" />{p.area} م²
                                </span>
                                <div className="flex-1" />
                                <button
                                  className={`p-1.5 rounded-lg border transition-all ${isInCompare(p.id) ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-gray-400 hover:border-primary/30 hover:text-primary"}`}
                                  title="أضف للمقارنة"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const r = addToCompare({ id: p.id, title: p.title, price: p.price, priceNum: p.priceNum, image: p.img, location: p.location, beds: p.beds, baths: p.baths, area: p.area, type: p.type, kind: p.kind, year: 0, finishing: "" });
                                    if (r === "added") toast.success("أُضيف للمقارنة ✓");
                                    else if (r === "already") toast("موجود بالفعل");
                                    else toast.error("المقارنة ممتلئة (٤ عقارات)");
                                  }}
                                >
                                  <GitCompare className="w-4 h-4" />
                                </button>
                                <button
                                  className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all"
                                  onClick={(e) => { e.stopPropagation(); setLocation(`/property/${p.id}`); }}
                                >
                                  التفاصيل
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
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
                      {filtered.map((p, idx) => (
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
                            <div className="relative h-48 overflow-hidden bg-gray-100">
                              <img
                                src={p.img}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                onError={(e) => { e.currentTarget.src = FALLBACK; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                              {/* Top badges */}
                              <div className="absolute top-3 right-3 flex gap-1.5">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow ${p.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                                  {p.type}
                                </span>
                                {p.featured && (
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-400 text-amber-900 shadow">مميز</span>
                                )}
                              </div>

                              {/* Kind badge */}
                              <div className="absolute bottom-3 right-3">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-white border border-white/20">
                                  {p.kind}
                                </span>
                              </div>

                              {/* Like */}
                              <button
                                className={`absolute top-3 left-3 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${liked.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500/80"}`}
                                onClick={(e) => toggleLike(p.id, e)}
                              >
                                <Heart className={`w-3.5 h-3.5 ${liked.has(p.id) ? "fill-white" : ""}`} />
                              </button>
                            </div>

                            {/* Body */}
                            <div className="p-4">
                              {/* Price */}
                              <div className="flex items-start justify-between mb-1.5">
                                <div>
                                  <p className="text-gray-900 font-extrabold text-lg leading-none">{p.price}</p>
                                  <p className="text-gray-400 text-xs mt-0.5">جنيه مصري</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-bold text-gray-600">4.8</span>
                                </div>
                              </div>

                              <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                {p.title}
                              </h3>

                              <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{p.location}</span>
                              </div>

                              {/* Date + views */}
                              <div className="flex items-center gap-2.5 mb-2.5">
                                {p.createdAt && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Clock className="w-2.5 h-2.5 text-gray-300" />
                                    {timeAgo(p.createdAt)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <Eye className="w-2.5 h-2.5 text-gray-300" />
                                  {(p.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدة
                                </span>
                              </div>

                              {/* Specs */}
                              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                                {p.beds > 0 && (
                                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                                    <BedDouble className="w-3.5 h-3.5" />{p.beds}
                                  </span>
                                )}
                                {p.baths > 0 && (
                                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                                    <Bath className="w-3.5 h-3.5" />{p.baths}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                  <Maximize2 className="w-3.5 h-3.5" />{p.area} م²
                                </span>
                                <div className="flex-1" />
                                <button
                                  className={`p-1 rounded-lg border transition-all mr-1 ${isInCompare(p.id) ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-gray-400 hover:border-primary/30 hover:text-primary"}`}
                                  title="أضف للمقارنة"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const r = addToCompare({ id: p.id, title: p.title, price: p.price, priceNum: p.priceNum, image: p.img, location: p.location, beds: p.beds, baths: p.baths, area: p.area, type: p.type, kind: p.kind, year: 0, finishing: "" });
                                    if (r === "added") toast.success("أُضيف للمقارنة ✓");
                                    else if (r === "already") toast("موجود بالفعل");
                                    else toast.error("المقارنة ممتلئة (٤ عقارات)");
                                  }}
                                >
                                  <GitCompare className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs text-primary font-semibold">التفاصيل ←</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
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

      {/* ── Stats Strip ── */}
      <div className="bg-white border-t border-gray-200 mt-10 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Building2, value: "+1,200", label: "عقار متاح" },
              { icon: TrendingUp, value: "+340", label: "صفقة هذا الشهر" },
              { icon: MapPin, value: "18", label: "مدينة مغطاة" },
              { icon: CheckCircle2, value: "+5K", label: "عميل راضٍ" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}
