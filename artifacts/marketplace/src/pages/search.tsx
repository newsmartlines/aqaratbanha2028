import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import {
  Search, MapPin, LayoutGrid, List as ListIcon, X, Loader2,
  BedDouble, Bath, Maximize2, Crown, Eye, Heart, ChevronDown,
  Phone, SlidersHorizontal, ArrowUpDown, Check, Clock,
  Building2, Home, TreePine, Factory,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

/* ─── WhatsApp Icon ─────────────────────────────────────────────── */
const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.54 5.879L.057 23.882l6.162-1.615A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.792 9.792 0 01-5.016-1.38l-.36-.214-3.727.977.996-3.638-.235-.374A9.79 9.79 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818 5.423 0 9.818 4.395 9.818 9.818 0 5.423-4.395 9.818-9.818 9.818z" />
  </svg>
);

/* ─── Constants ─────────────────────────────────────────────────── */
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
  if (day < 30) return `منذ ${day} ${day === 1 ? "يوم" : "أيام"}`;
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

/* ── Accordion Section ───────────────────────────────────────────── */
function Section({ title, children, open: defaultOpen = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4 border-b border-zinc-100 last:border-0">
      <button onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full mb-0 group">
        <span className="text-[13px] font-bold text-zinc-800 tracking-wide uppercase">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function SearchPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [path] = useLocation();

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

  const results = useMemo(() => {
    let arr = [...properties];
    if (subCategory !== "all") arr = arr.filter(p => p.subCategory === subCategory);
    if (beds) { const n = beds === "5+" ? 5 : parseInt(beds); arr = arr.filter(p => (p.rooms ?? 0) >= n); }
    if (baths) { const n = baths === "4+" ? 4 : parseInt(baths); arr = arr.filter(p => (p.bathrooms ?? 0) >= n); }
    if (priceRange !== null) { const r = PRICE_RANGES[priceRange]; arr = arr.filter(p => { const v = Number(p.price ?? 0); return v >= r.min && v <= r.max; }); }
    if (areaRange !== null) { const r = AREA_RANGES[areaRange]; arr = arr.filter(p => { const v = Number(p.area ?? 0); return v >= r.min && v <= r.max; }); }
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

  const activeCount = [
    listingType !== "all", category !== "all", subCategory !== "all",
    city.trim() !== "", beds !== null, baths !== null, priceRange !== null, areaRange !== null,
  ].filter(Boolean).length;

  /* ── Chips ──────────────────────────────────────────────────────── */
  const subCatLabel = currentSubcats.find(s => s.value === subCategory)?.label;
  const chips = [
    listingType !== "all" && { key: "lt", label: LISTING_TYPE_MAP[listingType] ?? listingType, clear: () => setListingType("all") },
    category !== "all" && { key: "cat", label: CATEGORY_MAP[category] ?? category, clear: () => { setCategory("all"); setSubCategory("all"); } },
    subCategory !== "all" && subCatLabel && { key: "sub", label: subCatLabel, clear: () => setSubCategory("all") },
    city && { key: "city", label: city, clear: () => setCity("") },
    beds && { key: "beds", label: `${beds}+ غرف`, clear: () => setBeds(null) },
    baths && { key: "baths", label: `${baths}+ حمام`, clear: () => setBaths(null) },
    priceRange !== null && { key: "price", label: PRICE_RANGES[priceRange].label, clear: () => setPriceRange(null) },
    areaRange !== null && { key: "area", label: AREA_RANGES[areaRange].label, clear: () => setAreaRange(null) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  /* ── Filter Panel ─────────────────────────────────────────────── */
  const FilterPanel = () => (
    <div dir="rtl">
      {/* Listing type */}
      <Section title="نوع الإعلان">
        <div className="flex gap-2">
          {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
            <button
              key={o.v}
              onClick={() => setListingType(o.v)}
              className={`flex-1 h-9 rounded-xl text-sm font-bold border-2 transition-all
                ${listingType === o.v
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-primary/50"}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Section>

      {/* Category */}
      <Section title="نوع العقار">
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: "all", l: "الكل", icon: <LayoutGrid className="w-4 h-4" /> },
            { v: "residential", l: "سكني", icon: CATEGORY_ICONS.residential },
            { v: "commercial", l: "تجاري", icon: CATEGORY_ICONS.commercial },
            { v: "land", l: "أراضي", icon: CATEGORY_ICONS.land },
          ].map(o => (
            <button
              key={o.v}
              onClick={() => { setCategory(o.v); setSubCategory("all"); }}
              className={`flex items-center gap-2 px-3 h-10 rounded-xl text-sm font-semibold border transition-all
                ${category === o.v
                  ? "bg-primary/8 border-primary text-primary"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-primary/40"}`}
            >
              {o.icon}
              {o.l}
            </button>
          ))}
        </div>
        {currentSubcats.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">التصنيف الفرعي</p>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "all", label: "الكل" }, ...currentSubcats].map(s => (
                <button
                  key={s.value}
                  onClick={() => setSubCategory(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${subCategory === s.value
                      ? "bg-primary text-white border-primary"
                      : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-primary/40 hover:text-primary"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Location */}
      <Section title="الموقع">
        <div className="relative">
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            placeholder="الحي أو المدينة..."
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()}
            className="w-full pr-9 pl-3 h-10 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-zinc-400"
            dir="rtl"
          />
        </div>
      </Section>

      {/* Price */}
      <Section title="نطاق السعر" open={false}>
        <div className="space-y-1">
          {PRICE_RANGES.map((r, i) => (
            <button
              key={i}
              onClick={() => setPriceRange(priceRange === i ? null : i)}
              className={`flex items-center justify-between w-full py-2 px-3 rounded-xl text-sm transition-all
                ${priceRange === i ? "bg-primary/8 text-primary font-semibold" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              <span>{r.label}</span>
              {priceRange === i && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </Section>

      {/* Bedrooms */}
      <Section title="غرف النوم" open={false}>
        <div className="flex gap-2 flex-wrap">
          {BEDS_OPTS.map(b => (
            <button
              key={b}
              onClick={() => setBeds(beds === b ? null : b)}
              className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all
                ${beds === b
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/50 hover:text-primary"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </Section>

      {/* Bathrooms */}
      <Section title="الحمامات" open={false}>
        <div className="flex gap-2 flex-wrap">
          {BATHS_OPTS.map(b => (
            <button
              key={b}
              onClick={() => setBaths(baths === b ? null : b)}
              className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all
                ${baths === b
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/50 hover:text-primary"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </Section>

      {/* Area */}
      <Section title="المساحة" open={false}>
        <div className="space-y-1">
          {AREA_RANGES.map((r, i) => (
            <button
              key={i}
              onClick={() => setAreaRange(areaRange === i ? null : i)}
              className={`flex items-center justify-between w-full py-2 px-3 rounded-xl text-sm transition-all
                ${areaRange === i ? "bg-primary/8 text-primary font-semibold" : "text-zinc-600 hover:bg-zinc-50"}`}
            >
              <span>{r.label}</span>
              {areaRange === i && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="pt-4 space-y-2">
        <button
          onClick={applySearch}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
        >
          <span className="flex items-center justify-center gap-2">
            <Search className="w-4 h-4" />
            عرض النتائج
          </span>
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

  /* ── List Card ────────────────────────────────────────────────── */
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(idx, 5) * 0.05 }}
        className={`group relative bg-white rounded-2xl overflow-hidden cursor-pointer flex flex-row
          transition-all duration-300 hover:-translate-y-0.5
          ${p.featured
            ? "shadow-md shadow-amber-100/80 border border-amber-200 hover:shadow-xl hover:shadow-amber-100/60"
            : "shadow-sm border border-zinc-200/80 hover:shadow-lg hover:border-zinc-300"}`}
        onClick={() => setLocation(`/property/${p.id}`)}
      >
        {/* ── Image RIGHT (first in RTL DOM) ── */}
        <div className="relative shrink-0 w-56 sm:w-72 overflow-hidden bg-zinc-100">
          <img
            src={thumb} alt={p.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/15" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg text-white tracking-wide
              ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {p.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 text-white">
                <Crown className="w-2.5 h-2.5" /> مميز
              </span>
            )}
            {p.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-600 text-white">
                <Check className="w-2.5 h-2.5" /> موثّق
              </span>
            )}
          </div>

          {/* Save */}
          <button
            onClick={e => toggleSave(p.id, e)}
            className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all shadow-sm
              ${saved.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/90 border-white/60 text-zinc-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-white" : ""}`} />
          </button>

          {/* Image count */}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              {imgs.length}
            </div>
          )}

          {/* Category strip */}
          <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-[2px] text-white text-[10px] font-medium px-3 py-1.5 text-center">
            {CATEGORY_MAP[p.mainCategory] ?? p.mainCategory}
          </div>
        </div>

        {/* ── Content LEFT ── */}
        <div className="flex-1 flex flex-col p-5 min-w-0">

          {/* Price row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-1.5">
              {priceStr ? (
                <>
                  <span className="text-2xl font-black text-zinc-900 leading-none tracking-tight">{priceStr}</span>
                  <span className="text-sm font-semibold text-zinc-400">ج.م</span>
                  {p.listingType === "rent" && <span className="text-xs text-zinc-400">/ شهر</span>}
                </>
              ) : (
                <span className="text-base font-semibold text-zinc-400">السعر عند التواصل</span>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="font-bold text-[15px] text-zinc-900 leading-snug line-clamp-2 mb-2.5 group-hover:text-primary transition-colors">
            {p.title}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-zinc-500 text-sm mb-4">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="line-clamp-1 font-medium">{loc}</span>
          </div>

          {/* Specs */}
          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {p.rooms != null && (
                <div className="flex items-center gap-1.5 bg-zinc-50 rounded-xl px-3 py-2">
                  <BedDouble className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-sm font-bold text-zinc-800">{p.rooms}</span>
                  <span className="text-xs text-zinc-400">غرف</span>
                </div>
              )}
              {p.bathrooms != null && (
                <div className="flex items-center gap-1.5 bg-zinc-50 rounded-xl px-3 py-2">
                  <Bath className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-sm font-bold text-zinc-800">{p.bathrooms}</span>
                  <span className="text-xs text-zinc-400">حمام</span>
                </div>
              )}
              {p.area != null && (
                <div className="flex items-center gap-1.5 bg-zinc-50 rounded-xl px-3 py-2">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-sm font-bold text-zinc-800">{Number(p.area).toLocaleString("ar-EG")}</span>
                  <span className="text-xs text-zinc-400">م²</span>
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Divider */}
          <div className="border-t border-zinc-100 mb-3" />

          {/* Bottom */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Agent + meta */}
            <div className="flex items-center gap-2.5 min-w-0">
              {(p.agentAvatar || p.agentLogo) ? (
                <img
                  src={p.agentAvatar || p.agentLogo!} alt={p.agentName ?? ""}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.agentName ?? "م")}&background=0d9488&color=fff&size=32`; }}
                />
              ) : p.agentName ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-xs border-2 border-white shadow-sm">
                  {p.agentName.charAt(0)}
                </div>
              ) : null}
              <div className="min-w-0">
                {p.agentName && <p className="text-xs font-bold text-zinc-700 truncate leading-none mb-1">{p.agentName}</p>}
                <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(p.createdAt)}
                  </span>
                  {p.viewCount > 0 && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-zinc-300" />
                      <span className="flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        {p.viewCount.toLocaleString("ar-EG")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {wa && (
                <button
                  onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${wa}`, "_blank"); }}
                  className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all"
                >
                  <WaIcon />
                </button>
              )}
              {p.phone && (
                <button
                  onClick={e => { e.stopPropagation(); window.location.href = `tel:${p.phone}`; }}
                  className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  /* ── Grid Card ───────────────────────────────────────────────── */
  const GridCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const thumb = imgs[0] ?? DEFAULT_IMG;
    const priceNum = Number(p.price);
    const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const loc = [p.district, p.address].filter(Boolean).join("، ") || "بنها";

    return (
      <motion.article
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: Math.min(idx, 6) * 0.06 }}
        onClick={() => setLocation(`/property/${p.id}`)}
        className={`group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1
          ${p.featured
            ? "shadow-md border border-amber-200 hover:shadow-xl"
            : "shadow-sm border border-zinc-200/80 hover:shadow-lg hover:border-zinc-300"}`}
      >
        {/* Image */}
        <div className="relative h-52 overflow-hidden bg-zinc-100">
          <img
            src={thumb} alt={p.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg text-white
              ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {p.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 text-white">
                <Crown className="w-2.5 h-2.5" /> مميز
              </span>
            )}
          </div>

          {/* Save */}
          <button
            onClick={e => toggleSave(p.id, e)}
            className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all
              ${saved.has(p.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/90 border-white/60 text-zinc-500 hover:text-rose-500"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved.has(p.id) ? "fill-white" : ""}`} />
          </button>

          {/* Price on image */}
          <div className="absolute bottom-3 right-3">
            {priceStr ? (
              <span className="bg-white/96 backdrop-blur-sm text-zinc-900 font-black text-[15px] px-3 py-1.5 rounded-xl shadow-sm">
                {priceStr} <span className="text-xs font-semibold text-zinc-500">ج.م</span>
              </span>
            ) : (
              <span className="bg-white/96 backdrop-blur-sm text-zinc-500 font-semibold text-xs px-3 py-1.5 rounded-xl">
                السعر عند التواصل
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h2 className="font-bold text-[14px] text-zinc-900 leading-snug line-clamp-2 mb-2.5 group-hover:text-primary transition-colors">
            {p.title}
          </h2>

          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2.5 flex-wrap">
              {p.rooms != null && (
                <span className="flex items-center gap-1 font-semibold">
                  <BedDouble className="w-3.5 h-3.5 text-zinc-400" />{p.rooms} غرف
                </span>
              )}
              {p.bathrooms != null && (
                <span className="flex items-center gap-1 font-semibold">
                  <Bath className="w-3.5 h-3.5 text-zinc-400" />{p.bathrooms} حمام
                </span>
              )}
              {p.area != null && (
                <span className="flex items-center gap-1 font-semibold">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                  {Number(p.area).toLocaleString("ar-EG")} م²
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="line-clamp-1 font-medium">{loc}</span>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Clock className="w-2.5 h-2.5" />{timeAgo(p.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold">
              <Eye className="w-2.5 h-2.5" />{(p.viewCount ?? 0).toLocaleString("ar-EG")}
            </span>
          </div>
        </div>
      </motion.article>
    );
  };

  /* ── Loading Skeleton ─────────────────────────────────────────── */
  const Skeleton = () => (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex h-48 animate-pulse">
          <div className="w-72 shrink-0 bg-zinc-200" />
          <div className="flex-1 p-5 flex flex-col gap-3">
            <div className="h-7 w-36 bg-zinc-200 rounded-lg" />
            <div className="h-5 w-3/4 bg-zinc-100 rounded-lg" />
            <div className="h-4 w-1/2 bg-zinc-100 rounded-lg" />
            <div className="flex gap-2 mt-1">
              {[60, 72, 64].map(w => <div key={w} className="h-9 bg-zinc-100 rounded-xl" style={{ width: w }} />)}
            </div>
            <div className="flex-1" />
            <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
              <div className="h-3 w-24 bg-zinc-100 rounded" />
              <div className="flex gap-2">
                <div className="h-9 w-9 bg-zinc-100 rounded-xl" />
                <div className="h-9 w-24 bg-zinc-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f5]" dir="rtl">
      <Header />

      {/* ── Sticky Top Bar ─────────────────────────────────────────── */}
      <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Search input */}
            <div className="flex-1 flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 h-11
              focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/10 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                placeholder="ابحث بالعنوان، الحي، أو النوع..."
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applySearch()}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-zinc-400 text-zinc-900"
                dir="rtl"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type pills — desktop */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
              {[{ v: "all", l: "الكل" }, { v: "sale", l: "للبيع" }, { v: "rent", l: "للإيجار" }].map(o => (
                <button
                  key={o.v}
                  onClick={() => setListingType(o.v)}
                  className={`px-4 h-8 rounded-lg text-sm font-bold transition-all
                    ${listingType === o.v
                      ? "bg-white text-primary shadow-sm border border-zinc-200"
                      : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Search button */}
            <button
              onClick={applySearch}
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-2xl shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              بحث
            </button>

            {/* Mobile filter */}
            <button
              onClick={() => setMobileFilters(true)}
              className="lg:hidden relative h-11 w-11 flex items-center justify-center border border-zinc-200 bg-white rounded-2xl text-zinc-600 hover:border-primary/40 transition-all"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Active chips */}
          {chips.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {chips.map(chip => (
                <button
                  key={chip.key}
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 bg-primary/8 text-primary border border-primary/20 text-xs font-bold px-3 py-1 rounded-full hover:bg-primary/15 transition-all"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              {chips.length > 1 && (
                <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 font-semibold underline-offset-2 hover:underline">
                  مسح الكل
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 flex gap-7 flex-1">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div
            className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden"
            style={{ position: "sticky", top: chips.length > 0 ? "9.5rem" : "7.5rem", maxHeight: "calc(100vh - 8rem)" }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="font-black text-zinc-900 text-sm">الفلاتر</span>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-black">
                    {activeCount}
                  </span>
                )}
              </div>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-600 font-bold">
                  مسح
                </button>
              )}
            </div>

            {/* Scrollable filters */}
            <div className="overflow-y-auto px-5 py-3" style={{ maxHeight: "calc(100vh - 12rem)", scrollbarWidth: "thin" }}>
              <FilterPanel />
            </div>
          </div>
        </aside>

        {/* ── Results ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* Sort / count bar */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              {isFetching ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>جارٍ البحث...</span>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">
                  <span className="font-black text-zinc-900 text-xl">{results.length}</span>
                  <span className="mr-1.5">عقار مطابق</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="h-9 pr-9 pl-4 text-sm border border-zinc-200 rounded-xl bg-white text-zinc-700 font-semibold focus:outline-none focus:border-primary/40 appearance-none cursor-pointer"
                  dir="rtl"
                >
                  {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-9 h-9 flex items-center justify-center transition-all
                    ${viewMode === "list" ? "bg-primary text-white" : "text-zinc-400 hover:text-zinc-700"}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-9 h-9 flex items-center justify-center transition-all
                    ${viewMode === "grid" ? "bg-primary text-white" : "text-zinc-400 hover:text-zinc-700"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards */}
          <AnimatePresence mode="wait">
            {isFetching ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Skeleton />
              </motion.div>
            ) : results.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-zinc-200 shadow-sm"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
                  <Search className="w-9 h-9 text-zinc-300" />
                </div>
                <p className="text-xl font-black text-zinc-400 mb-1.5">لا توجد نتائج</p>
                <p className="text-sm text-zinc-400 mb-6">جرّب تعديل الفلاتر أو تغيير كلمة البحث</p>
                <button
                  onClick={clearAll}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
                >
                  مسح جميع الفلاتر
                </button>
              </motion.div>
            ) : viewMode === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                {results.map((p, i) => <ListCard key={p.id} p={p} idx={i} />)}
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((p, i) => <GridCard key={p.id} p={p} idx={i} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile Filters Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              onClick={() => setMobileFilters(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 w-80 max-w-full bg-white z-50 flex flex-col shadow-2xl lg:hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-black text-zinc-900">الفلاتر</span>
                  {activeCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-black">
                      {activeCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-all">
                  <X className="w-4 h-4 text-zinc-500" />
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
