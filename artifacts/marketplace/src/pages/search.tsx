import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import {
  Search, MapPin, LayoutGrid, List as ListIcon, X, Loader2,
  BedDouble, Bath, Maximize2, Crown, Eye, Heart, ChevronDown,
  Phone, SlidersHorizontal, Check, ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

/* ─── WhatsApp Icon ──────────────────────────────────────────────── */
const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.54 5.879L.057 23.882l6.162-1.615A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.016-1.38l-.36-.214-3.727.977.996-3.638-.235-.374A9.79 9.79 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818 5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z" />
  </svg>
);

/* ─── Constants ──────────────────────────────────────────────────── */
const LISTING_TYPE_MAP: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const CATEGORY_MAP: Record<string, string> = { residential: "سكني", commercial: "تجاري", land: "أراضي", industrial: "صناعي" };
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
    { value: "residential_land", label: "أرض سكنية" }, { value: "commercial_land", label: "أرض تجارية" },
    { value: "farm", label: "مزرعة" }, { value: "industrial_land", label: "أرض صناعية" },
  ],
};
const BEDS_OPTS = ["1", "2", "3", "4", "5+"];
const BATHS_OPTS = ["1", "2", "3", "4+"];
const PRICE_RANGES = [
  { label: "أقل من 500 ألف", min: 0, max: 500_000 },
  { label: "500 ألف — مليون", min: 500_000, max: 1_000_000 },
  { label: "مليون — 2 مليون", min: 1_000_000, max: 2_000_000 },
  { label: "2 مليون — 5 مليون", min: 2_000_000, max: 5_000_000 },
  { label: "أكثر من 5 مليون", min: 5_000_000, max: Infinity },
];
const AREA_RANGES = [
  { label: "أقل من 100 م²", min: 0, max: 100 },
  { label: "100 — 200 م²", min: 100, max: 200 },
  { label: "200 — 500 م²", min: 200, max: 500 },
  { label: "أكثر من 500 م²", min: 500, max: Infinity },
];
const SORT_OPTS = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "popular", label: "الأكثر مشاهدة" },
];
const DEFAULT_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "منذ لحظات";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  return `منذ ${Math.floor(day / 30)} شهر`;
}

interface PropertyResult {
  id: number; title: string; description: string | null;
  mainCategory: string; subCategory: string | null;
  listingType: string; price: string | null;
  area: string | null; rooms: number | null; bathrooms: number | null;
  district: string | null; address: string | null;
  images: string | null; phone: string | null; whatsapp: string | null;
  status: string | null; featured: boolean | null;
  viewCount: number; createdAt: string;
  agentName?: string | null; agentAvatar?: string | null;
  agentLogo?: string | null; verified?: boolean | null;
}

/* ─── FilterSection ──────────────────────────────────────────────── */
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-5 mb-5 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="font-bold text-sm text-gray-800">{title}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/* ─── RadioRow ───────────────────────────────────────────────────── */
function RadioRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between w-full py-1.5 group">
      <span className={`text-sm transition-colors ${checked ? "text-primary font-semibold" : "text-gray-600 group-hover:text-gray-900"}`}>{label}</span>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${checked ? "border-primary bg-primary" : "border-gray-300 group-hover:border-primary/50"}`}>
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function SearchPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [path] = useLocation();

  /* State */
  const [q, setQ] = useState("");
  const [listingType, setListingType] = useState("all");
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [city, setCity] = useState("");
  const [beds, setBeds] = useState<string | null>(null);
  const [baths, setBaths] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [areaRange, setAreaRange] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [mobileFilters, setMobileFilters] = useState(false);

  const urlSig = typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}` : path;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get("q") ?? "");
    setListingType(sp.get("listingType") ?? "all");
    const cat = sp.get("category") ?? "all";
    setCategory(cat);
    setSubCategory(sp.get("subCategory") ?? "all");
    setCity(sp.get("city") ?? "");
  }, [urlSig]);

  useEffect(() => { setSubCategory("all"); }, [category]);

  const currentSubcats = category !== "all" ? (SUBCATEGORIES[category] ?? []) : [];

  /* Fetch */
  const { data: properties = [], isFetching } = useQuery<PropertyResult[]>({
    queryKey: ["properties-search", q, listingType, category, city],
    queryFn: async () => {
      const params: Record<string, string> = { status: "active" };
      if (q.trim()) params.search = q.trim();
      if (listingType !== "all") params.listingType = listingType;
      if (category !== "all") params.category = category;
      if (city.trim()) params.city = city.trim();
      const res = await fetch(`/api/properties?${new URLSearchParams(params)}`, { credentials: "include" });
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 30_000,
  });

  /* Filter + Sort client-side */
  const results = useMemo(() => {
    let arr = [...properties];
    if (subCategory !== "all") arr = arr.filter(p => p.subCategory === subCategory);
    if (beds) {
      const n = beds === "5+" ? 5 : parseInt(beds);
      arr = arr.filter(p => (p.rooms ?? 0) >= n);
    }
    if (baths) {
      const n = baths === "4+" ? 4 : parseInt(baths);
      arr = arr.filter(p => (p.bathrooms ?? 0) >= n);
    }
    if (priceRange !== null) {
      const r = PRICE_RANGES[priceRange];
      arr = arr.filter(p => { const v = Number(p.price ?? 0); return v >= r.min && v <= r.max; });
    }
    if (areaRange !== null) {
      const r = AREA_RANGES[areaRange];
      arr = arr.filter(p => { const v = Number(p.area ?? 0); return v >= r.min && v <= r.max; });
    }
    if (sortBy === "price_asc") arr.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    else if (sortBy === "price_desc") arr.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    else if (sortBy === "popular") arr.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return arr;
  }, [properties, subCategory, beds, baths, priceRange, areaRange, sortBy]);

  const applySearch = useCallback(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (listingType !== "all") p.set("listingType", listingType);
    if (category !== "all") p.set("category", category);
    if (subCategory !== "all") p.set("subCategory", subCategory);
    if (city.trim()) p.set("city", city.trim());
    setLocation(`/search?${p.toString()}`);
    setMobileFilters(false);
  }, [q, listingType, category, subCategory, city]);

  const clearAll = () => {
    setQ(""); setListingType("all"); setCategory("all"); setSubCategory("all");
    setCity(""); setBeds(null); setBaths(null); setPriceRange(null); setAreaRange(null);
    setLocation("/search");
  };

  const toggleSave = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  /* Active filter count */
  const activeCount = [
    listingType !== "all", category !== "all", subCategory !== "all",
    city.trim() !== "", beds !== null, baths !== null,
    priceRange !== null, areaRange !== null,
  ].filter(Boolean).length;

  /* ── Filter Panel ─────────────────────────────────────────────── */
  const FilterPanel = () => (
    <div>
      {/* Search within filters */}
      <div className="relative mb-5">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          placeholder="بحث بالعنوان أو الحي..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && applySearch()}
          className="w-full pr-9 pl-3 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all bg-gray-50"
          dir="rtl"
        />
      </div>

      {/* Transaction type */}
      <FilterSection title="نوع الإعلان">
        {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
          <RadioRow key={o.v} label={o.l} checked={listingType === o.v} onClick={() => setListingType(o.v)} />
        ))}
      </FilterSection>

      {/* Category */}
      <FilterSection title="نوع العقار">
        {[{ v: "all", l: "الكل" }, { v: "residential", l: "سكني" }, { v: "commercial", l: "تجاري" }, { v: "land", l: "أراضي" }, { v: "industrial", l: "صناعي" }].map(o => (
          <RadioRow key={o.v} label={o.l} checked={category === o.v} onClick={() => { setCategory(o.v); setSubCategory("all"); }} />
        ))}
        {currentSubcats.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">التصنيف الفرعي</p>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "all", label: "الكل" }, ...currentSubcats].map(s => (
                <button
                  key={s.value}
                  onClick={() => setSubCategory(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${subCategory === s.value ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </FilterSection>

      {/* City / District */}
      <FilterSection title="المدينة / الحي">
        <input
          placeholder="ادخل اسم الحي أو المدينة..."
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === "Enter" && applySearch()}
          className="w-full px-3 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all bg-gray-50"
          dir="rtl"
        />
      </FilterSection>

      {/* Price range */}
      <FilterSection title="نطاق السعر (ج.م)">
        {PRICE_RANGES.map((r, i) => (
          <RadioRow key={i} label={r.label} checked={priceRange === i} onClick={() => setPriceRange(priceRange === i ? null : i)} />
        ))}
      </FilterSection>

      {/* Bedrooms */}
      <FilterSection title="غرف النوم">
        <div className="flex gap-1.5 flex-wrap">
          {BEDS_OPTS.map(b => (
            <button
              key={b}
              onClick={() => setBeds(beds === b ? null : b)}
              className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${beds === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Bathrooms */}
      <FilterSection title="الحمامات">
        <div className="flex gap-1.5 flex-wrap">
          {BATHS_OPTS.map(b => (
            <button
              key={b}
              onClick={() => setBaths(baths === b ? null : b)}
              className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${baths === b ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary/50"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Area */}
      <FilterSection title="المساحة" defaultOpen={false}>
        {AREA_RANGES.map((r, i) => (
          <RadioRow key={i} label={r.label} checked={areaRange === i} onClick={() => setAreaRange(areaRange === i ? null : i)} />
        ))}
      </FilterSection>

      {/* Actions */}
      <div className="space-y-2 mt-4">
        <button
          onClick={applySearch}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow"
        >
          تطبيق الفلاتر
        </button>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="w-full h-10 border border-red-200 text-red-500 hover:bg-red-50 font-semibold rounded-xl text-sm transition-all"
          >
            مسح الفلاتر ({activeCount})
          </button>
        )}
      </div>
    </div>
  );

  /* ── List Card ───────────────────────────────────────────────────── */
  const ListCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const thumb = imgs[0] ?? DEFAULT_IMG;
    const priceNum = Number(p.price);
    const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const loc = [p.district, p.address].filter(Boolean).join("، ") || "بنها";
    const wa = (p.whatsapp ?? p.phone ?? "").replace(/\D/g, "");

    return (
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(idx, 6) * 0.04 }}
        className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-row
          ${p.featured ? "border-amber-300 shadow-md shadow-amber-100/60" : "border-gray-200 hover:border-primary/20 shadow-sm"}`}
        onClick={() => setLocation(`/property/${p.id}`)}
      >
        {/* Image — RIGHT (first in RTL DOM) */}
        <div className="relative shrink-0 w-52 sm:w-64 overflow-hidden bg-gray-100">
          <img
            src={thumb} alt={p.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          {/* overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/10" />

          {/* Top badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg text-white shadow-sm
              ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {p.featured && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-500 text-white shadow-sm">
                <Crown className="w-3 h-3" /> مميز
              </span>
            )}
            {p.verified && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-600 text-white shadow-sm">
                <Check className="w-2.5 h-2.5" /> موثّق
              </span>
            )}
          </div>

          {/* Save heart */}
          <button
            onClick={e => toggleSave(p.id, e)}
            className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all shadow-sm
              ${saved.has(p.id) ? "bg-red-500 border-red-400 text-white" : "bg-white/90 border-white/60 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-white" : ""}`} />
          </button>

          {/* Image count indicator */}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              {imgs.length}
            </div>
          )}

          {/* Category label */}
          <div className="absolute bottom-0 right-0 left-0 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 text-center">
            {CATEGORY_MAP[p.mainCategory] ?? p.mainCategory}
          </div>
        </div>

        {/* Content — LEFT */}
        <div className="flex-1 flex flex-col p-5 gap-0 min-w-0">

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-2">
            {priceStr ? (
              <>
                <span className="text-[22px] sm:text-2xl font-black text-gray-900 leading-none tracking-tight">
                  {priceStr}
                </span>
                <span className="text-sm font-semibold text-gray-500">ج.م</span>
                {p.listingType === "rent" && <span className="text-xs text-gray-400">/ شهر</span>}
              </>
            ) : (
              <span className="text-base font-semibold text-gray-500">السعر عند التواصل</span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {p.title}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="line-clamp-1">{loc}</span>
          </div>

          {/* Specs */}
          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              {p.rooms != null && (
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <BedDouble className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold">{p.rooms}</span>
                  <span className="text-gray-400">غرف</span>
                </div>
              )}
              {p.bathrooms != null && (
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <Bath className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold">{p.bathrooms}</span>
                  <span className="text-gray-400">حمام</span>
                </div>
              )}
              {p.area != null && (
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <Maximize2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold">{Number(p.area).toLocaleString("ar-EG")}</span>
                  <span className="text-gray-400">م²</span>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 mb-3" />

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Agent + time */}
            <div className="flex items-center gap-2 min-w-0">
              {(p.agentAvatar || p.agentLogo) ? (
                <img
                  src={p.agentAvatar || p.agentLogo!}
                  alt={p.agentName ?? ""}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.agentName ?? "م")}&background=0d9488&color=fff&size=28`; }}
                />
              ) : p.agentName ? (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                  {p.agentName.charAt(0)}
                </div>
              ) : null}
              <div className="min-w-0">
                {p.agentName && <p className="text-xs font-semibold text-gray-700 truncate leading-none mb-0.5">{p.agentName}</p>}
                <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                  <span>{timeAgo(p.createdAt)}</span>
                  {p.viewCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" /> {p.viewCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {wa && (
                <button
                  onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${wa}`, "_blank"); }}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all"
                  title="واتساب"
                >
                  <WaIcon />
                </button>
              )}
              {p.phone && (
                <button
                  onClick={e => { e.stopPropagation(); window.location.href = `tel:${p.phone}`; }}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  title="اتصال"
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setLocation(`/property/${p.id}`); }}
                className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                التفاصيل
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  /* ── Grid Card ───────────────────────────────────────────────────── */
  const GridCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const thumb = imgs[0] ?? DEFAULT_IMG;
    const priceNum = Number(p.price);
    const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const loc = [p.district, p.address].filter(Boolean).join("، ") || "بنها";

    return (
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(idx, 6) * 0.05 }}
        onClick={() => setLocation(`/property/${p.id}`)}
        className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer
          ${p.featured ? "border-amber-300 shadow-md shadow-amber-100/50" : "border-gray-200 shadow-sm hover:border-primary/20"}`}
      >
        {/* Image */}
        <div className="relative h-52 overflow-hidden bg-gray-100">
          <img
            src={thumb} alt={p.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg text-white shadow-sm ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {p.featured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 text-white">
                <Crown className="w-2.5 h-2.5" /> مميز
              </span>
            )}
          </div>

          {/* Save */}
          <button
            onClick={e => toggleSave(p.id, e)}
            className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all
              ${saved.has(p.id) ? "bg-red-500 border-red-400 text-white" : "bg-white/90 border-white/60 text-gray-500 hover:text-red-500"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-white" : ""}`} />
          </button>

          {/* Price on image */}
          {priceStr && (
            <div className="absolute bottom-3 right-3">
              <span className="bg-white/95 backdrop-blur-sm text-gray-900 font-extrabold text-base px-3 py-1 rounded-xl shadow-sm">
                {priceStr} <span className="text-xs font-normal text-gray-500">ج.م</span>
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h2 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {p.title}
          </h2>
          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
              {p.rooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{p.rooms} غرف</span>}
              {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.bathrooms} حمام</span>}
              {p.area != null && <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" />{Number(p.area).toLocaleString("ar-EG")} م²</span>}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="line-clamp-1">{loc}</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-[11px] text-gray-400">{timeAgo(p.createdAt)}</span>
            <span className="text-xs font-bold text-primary">التفاصيل ←</span>
          </div>
        </div>
      </motion.article>
    );
  };

  /* ── Active filter chips ─────────────────────────────────────────── */
  const subCatLabel = currentSubcats.find(s => s.value === subCategory)?.label;
  const chips = [
    listingType !== "all" && { key: "lt", label: LISTING_TYPE_MAP[listingType] ?? listingType, clear: () => setListingType("all") },
    category !== "all" && { key: "cat", label: CATEGORY_MAP[category] ?? category, clear: () => { setCategory("all"); setSubCategory("all"); } },
    subCategory !== "all" && subCatLabel && { key: "sub", label: subCatLabel, clear: () => setSubCategory("all") },
    city && { key: "city", label: city, clear: () => setCity("") },
    beds && { key: "beds", label: `${beds} غرف+`, clear: () => setBeds(null) },
    baths && { key: "baths", label: `${baths} حمام+`, clear: () => setBaths(null) },
    priceRange !== null && { key: "price", label: PRICE_RANGES[priceRange].label, clear: () => setPriceRange(null) },
    areaRange !== null && { key: "area", label: AREA_RANGES[areaRange].label, clear: () => setAreaRange(null) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f5f5f5]" dir="rtl">
      <Header />

      {/* ── Top Search Bar ──────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Main search input */}
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-11 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                placeholder="ابحث بالعنوان أو الحي أو النوع..."
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applySearch()}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-gray-400"
                dir="rtl"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Listing type quick pills */}
            <div className="hidden md:flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
              {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
                <button
                  key={o.v}
                  onClick={() => setListingType(o.v)}
                  className={`px-4 h-8 rounded-lg text-sm font-semibold transition-all ${listingType === o.v ? "bg-white text-primary shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Search button */}
            <button
              onClick={applySearch}
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap"
            >
              بحث
            </button>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFilters(true)}
              className="lg:hidden relative h-11 w-11 flex items-center justify-center border border-gray-200 bg-white rounded-xl text-gray-600 hover:border-primary/40 transition-all"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-5 flex gap-6 flex-1">

        {/* ── RIGHT Sidebar (sticky, scrollable) ─────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden"
            style={{ position: "sticky", top: "7.5rem", maxHeight: "calc(100vh - 8rem)" }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="font-extrabold text-gray-900 text-sm">الفلاتر</span>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">{activeCount}</span>
                )}
              </div>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-600 font-semibold">مسح الكل</button>
              )}
            </div>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin" }}>
              <FilterPanel />
            </div>
          </div>
        </aside>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* Sort / count bar */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {isFetching ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>جارٍ البحث...</span>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">
                  <span className="font-extrabold text-gray-900 text-base">{results.length}</span> عقار مطابق
                </p>
              )}

              {/* Active filter chips */}
              {chips.map(chip => (
                <button
                  key={chip.key}
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-primary/20 transition-all"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="h-9 pl-3 pr-8 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:border-primary/40 appearance-none cursor-pointer"
                  dir="rtl"
                >
                  {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-9 h-9 flex items-center justify-center transition-all ${viewMode === "list" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-9 h-9 flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {results.length === 0 && !isFetching ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm"
              >
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search className="w-9 h-9 text-gray-300" />
                </div>
                <p className="text-xl font-bold text-gray-400 mb-1">لا توجد نتائج</p>
                <p className="text-sm text-gray-400 mb-5">جرّب تعديل الفلاتر أو مسحها</p>
                <button
                  onClick={clearAll}
                  className="px-5 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:border-primary/40 hover:text-primary transition-all"
                >
                  مسح الفلاتر
                </button>
              </motion.div>
            ) : viewMode === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                {results.map((p, i) => <ListCard key={p.id} p={p} idx={i} />)}
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((p, i) => <GridCard key={p.id} p={p} idx={i} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile Filters Drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileFilters(false)}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-80 max-w-full bg-white z-50 flex flex-col shadow-2xl lg:hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-extrabold text-gray-900">الفلاتر</span>
                  {activeCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">{activeCount}</span>
                  )}
                </div>
                <button onClick={() => setMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <FilterPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
