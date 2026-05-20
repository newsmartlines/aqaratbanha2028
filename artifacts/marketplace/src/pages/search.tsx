import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, MapPin, LayoutGrid, List as ListIcon, X, Filter, Loader2,
  Phone, Clock, ChevronLeft, BedDouble, Bath, Maximize2,
  Star, Crown, ArrowUpCircle, Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

/* ── WhatsApp SVG Icon ────────────────────────────────────────────── */
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.62 4.46 1.7 6.32L3 29l6.84-1.79A12.94 12.94 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm0 23.6a10.6 10.6 0 01-5.42-1.49l-.38-.23-3.97.92.95-3.85-.25-.4A10.58 10.58 0 015.4 16c0-5.85 4.75-10.6 10.6-10.6 5.85 0 10.6 4.75 10.6 10.6 0 5.85-4.75 10.6-10.6 10.6zm5.83-7.93c-.32-.16-1.88-.93-2.17-1.03-.3-.11-.51-.16-.73.16-.21.32-.82 1.03-1 1.25-.19.21-.38.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.19-.19-.32-.02-.49.14-.64.14-.14.32-.37.47-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55l-.61-.01a1.17 1.17 0 00-.85.4c-.29.32-1.12 1.09-1.12 2.66s1.14 3.09 1.3 3.3c.16.21 2.25 3.43 5.44 4.81.76.33 1.35.52 1.82.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37z" fill="currentColor"/>
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */
const LISTING_TYPE_MAP: Record<string, string> = {
  sale: "للبيع",
  rent: "للإيجار",
};
const CATEGORY_MAP: Record<string, string> = {
  residential: "سكني",
  commercial: "تجاري",
  land: "أراضي",
};
const DEFAULT_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

function timeAgo(iso: string | undefined): string | null {
  if (!iso) return null;
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
  id: number;
  title: string;
  description: string | null;
  mainCategory: string;
  listingType: string;
  price: string | null;
  area: string | null;
  rooms: number | null;
  bathrooms: number | null;
  district: string | null;
  address: string | null;
  cityId: number | null;
  images: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string | null;
  featured: boolean | null;
  viewCount: number;
  createdAt: string;
}

/* ── Main Component ───────────────────────────────────────────────── */
export default function SearchPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchInput, setSearchInput] = useState("");
  const [selectedListingType, setSelectedListingType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [path] = useLocation();
  const [, setLocation] = useLocation();
  const urlSignature = typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}` : path;

  /* ── Read URL params on load ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setSearchInput(sp.get("q") ?? "");
    setSelectedListingType(sp.get("listingType") ?? "all");
    setSelectedCategory(sp.get("category") ?? "all");
    setCityFilter(sp.get("city") ?? "");
  }, [urlSignature]);

  /* ── Fetch properties ── */
  const { data: properties = [], isFetching } = useQuery<PropertyResult[]>({
    queryKey: ["properties-search", searchInput, selectedListingType, selectedCategory, cityFilter],
    queryFn: async () => {
      const params: Record<string, string> = { status: "active" };
      if (searchInput.trim()) params.search = searchInput.trim();
      if (selectedListingType !== "all") params.listingType = selectedListingType;
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (cityFilter.trim()) params.city = cityFilter.trim();
      const res = await fetch(`/api/properties?${new URLSearchParams(params)}`, {
        credentials: "include",
      });
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 30_000,
  });

  /* ── Sort ── */
  const sorted = useMemo(() => {
    const arr = [...properties];
    if (sortBy === "price_asc") arr.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    else if (sortBy === "price_desc") arr.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    else if (sortBy === "popular") arr.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // featured first
    arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return arr;
  }, [properties, sortBy]);

  const applySearch = useCallback(() => {
    const p = new URLSearchParams();
    if (searchInput.trim()) p.set("q", searchInput.trim());
    if (selectedListingType !== "all") p.set("listingType", selectedListingType);
    if (selectedCategory !== "all") p.set("category", selectedCategory);
    if (cityFilter.trim()) p.set("city", cityFilter.trim());
    setLocation(`/search?${p.toString()}`);
    setVisibleCount(12);
    // Fire-and-forget search tracking for AI recommendations
    fetch("/api/track/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        keyword: searchInput.trim() || null,
        listingType: selectedListingType !== "all" ? selectedListingType : null,
        category: selectedCategory !== "all" ? selectedCategory : null,
        city: cityFilter.trim() || null,
      }),
    }).catch(() => {});
  }, [searchInput, selectedListingType, selectedCategory, cityFilter]);

  const clearAll = () => {
    setSearchInput(""); setSelectedListingType("all");
    setSelectedCategory("all"); setCityFilter("");
    setVisibleCount(12);
    setLocation("/search");
  };

  /* ── Filter Panel ── */
  const FilterPanel = () => (
    <div className="space-y-7">
      {/* Listing Type */}
      <div>
        <h3 className="font-bold text-base text-slate-800 mb-3">نوع الإعلان</h3>
        <div className="flex flex-col gap-2">
          {[
            { value: "all", label: "الكل" },
            { value: "sale", label: "للبيع" },
            { value: "rent", label: "للإيجار" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedListingType(opt.value)}
              className={`flex items-center gap-2 w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${selectedListingType === opt.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="font-bold text-base text-slate-800 mb-3">نوع العقار</h3>
        <div className="flex flex-col gap-2">
          {[
            { value: "all", label: "الكل" },
            { value: "residential", label: "سكني" },
            { value: "commercial", label: "تجاري" },
            { value: "land", label: "أراضي" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedCategory(opt.value)}
              className={`flex items-center gap-2 w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${selectedCategory === opt.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <h3 className="font-bold text-base text-slate-800 mb-3">المدينة / الحي</h3>
        <Input
          placeholder="ادخل اسم المدينة أو الحي..."
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          onKeyDown={e => e.key === "Enter" && applySearch()}
          className="h-10"
        />
      </div>

      <Button className="w-full h-11 rounded-xl font-bold" onClick={applySearch}>
        تطبيق الفلاتر
      </Button>
      <Button variant="outline" className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
        onClick={clearAll}>
        مسح الكل
      </Button>
    </div>
  );

  /* ── Active filter badges ── */
  const activeFilters = [
    selectedListingType !== "all" && { key: "lt", label: LISTING_TYPE_MAP[selectedListingType] ?? selectedListingType, clear: () => setSelectedListingType("all") },
    selectedCategory !== "all" && { key: "cat", label: CATEGORY_MAP[selectedCategory] ?? selectedCategory, clear: () => setSelectedCategory("all") },
    cityFilter && { key: "city", label: cityFilter, clear: () => setCityFilter("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  /* ── Property Card (List View) ── */
  const ListCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const thumb = imgs[0] ?? DEFAULT_IMG;
    const priceNum = Number(p.price);
    const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const catAr = CATEGORY_MAP[p.mainCategory] ?? p.mainCategory;
    const location = [p.district, p.address].filter(Boolean).join(" — ") || "بنها";
    const phone = (p.whatsapp ?? p.phone ?? "").replace(/\D/g, "");

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(idx, 5) * 0.06 }}
        className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/25 transition-all duration-300 flex flex-col sm:flex-row
          ${p.featured ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}
      >
        {/* ── Image ── */}
        <div
          className="relative shrink-0 h-56 sm:h-auto sm:w-72 overflow-hidden bg-slate-100 cursor-pointer"
          onClick={() => setLocation(`/property/${p.id}`)}
        >
          <img
            src={thumb}
            alt={p.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          {/* Dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

          {/* Top-right badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <span className={`inline-flex items-center gap-1 text-white text-[11px] font-extrabold px-3 py-1 rounded-lg shadow-md
              ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {catAr && (
              <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-lg">
                {catAr}
              </span>
            )}
            {p.featured && (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow">
                <Crown className="w-3 h-3" /> مميز
              </span>
            )}
          </div>

          {/* Bottom: view count */}
          {p.viewCount > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded-full">
              <Eye className="w-3 h-3" /> {p.viewCount} مشاهدة
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 flex flex-col p-5 gap-3 min-w-0">

          {/* Title */}
          <h3
            className="font-extrabold text-xl text-slate-900 leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-2"
            onClick={() => setLocation(`/property/${p.id}`)}
          >
            {p.title}
          </h3>

          {/* Price — BIG */}
          {priceStr ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary leading-none" style={{ fontFeatureSettings: '"tnum"' }}>
                {priceStr}
              </span>
              <span className="text-slate-500 text-sm font-medium">ج.م</span>
            </div>
          ) : (
            <p className="text-slate-400 text-base font-medium">السعر عند التواصل</p>
          )}

          {/* Stats row — rooms / bathrooms / area */}
          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-4 flex-wrap">
              {p.rooms != null && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <BedDouble className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 font-bold text-sm">{p.rooms}</span>
                  <span className="text-slate-400 text-xs">غرفة</span>
                </div>
              )}
              {p.bathrooms != null && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Bath className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 font-bold text-sm">{p.bathrooms}</span>
                  <span className="text-slate-400 text-xs">حمام</span>
                </div>
              )}
              {p.area != null && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 font-bold text-sm">{Number(p.area).toLocaleString("ar-EG")}</span>
                  <span className="text-slate-400 text-xs">م²</span>
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 mt-auto" />

          {/* Footer: time + buttons */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(p.createdAt) ?? ""}
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  window.open(`https://wa.me/${phone || "20"}`, "_blank");
                }}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <WhatsAppIcon size={18} />
                واتساب
              </button>

              {/* Call */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (phone) window.location.href = `tel:${phone}`;
                }}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Phone className="w-4 h-4" />
                مكالمة
              </button>

              {/* Details */}
              <button
                onClick={() => setLocation(`/property/${p.id}`)}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                عرض التفاصيل
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  /* ── Property Card (Grid View) ── */
  const GridCard = ({ p, idx }: { p: PropertyResult; idx: number }) => {
    const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
    const thumb = imgs[0] ?? DEFAULT_IMG;
    const priceNum = Number(p.price);
    const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : null;
    const typeAr = LISTING_TYPE_MAP[p.listingType] ?? p.listingType;
    const location = [p.district, p.address].filter(Boolean).join(" — ") || "بنها";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(idx, 5) * 0.06 }}
        onClick={() => setLocation(`/property/${p.id}`)}
        className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/25 cursor-pointer transition-all duration-300
          ${p.featured ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}
      >
        <div className="relative h-52 overflow-hidden bg-slate-100">
          <img
            src={thumb}
            alt={p.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            <span className={`text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow
              ${p.listingType === "sale" ? "bg-emerald-500" : "bg-blue-500"}`}>
              {typeAr}
            </span>
            {p.featured && (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                <Crown className="w-2.5 h-2.5" /> مميز
              </span>
            )}
          </div>
          {priceStr && (
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white font-black text-base px-3 py-1 rounded-xl">
              {priceStr} <span className="font-normal text-xs">ج.م</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {p.title}
          </h3>
          {(p.rooms || p.bathrooms || p.area) && (
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              {p.rooms != null && (
                <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{p.rooms} غرف</span>
              )}
              {p.bathrooms != null && (
                <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.bathrooms} حمام</span>
              )}
              {p.area != null && (
                <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" />{Number(p.area).toLocaleString("ar-EG")} م²</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  /* ── Render ── */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50" dir="rtl">
      <Header />

      {/* ── Sticky Search Bar ── */}
      <div className="sticky top-16 z-40 w-full border-b bg-white/95 backdrop-blur-xl shadow-sm py-3">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-1.5 focus-within:shadow-md focus-within:border-primary/40 transition-all duration-300">
            {/* Text search */}
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="ابحث بالعنوان أو المنطقة أو النوع..."
                className="pr-12 h-11 bg-transparent border-none text-base focus-visible:ring-0 shadow-none"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applySearch()}
              />
            </div>
            <div className="w-px bg-slate-200 my-1 hidden md:block" />
            {/* Listing type */}
            <div className="hidden md:block w-36">
              <Select value={selectedListingType} onValueChange={setSelectedListingType}>
                <SelectTrigger className="h-11 border-none bg-transparent shadow-none focus:ring-0 text-sm">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="sale">للبيع</SelectItem>
                  <SelectItem value="rent">للإيجار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-px bg-slate-200 my-1 hidden lg:block" />
            {/* Category */}
            <div className="hidden lg:block w-36">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 border-none bg-transparent shadow-none focus:ring-0 text-sm">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="residential">سكني</SelectItem>
                  <SelectItem value="commercial">تجاري</SelectItem>
                  <SelectItem value="land">أراضي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-11 px-8 bg-primary hover:bg-primary/90 rounded-xl font-bold text-base shrink-0"
              onClick={applySearch}
            >
              بحث
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-[140px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-extrabold text-slate-800 text-base mb-5 flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                فلاتر البحث
              </h2>
              <FilterPanel />
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">

            {/* Header bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  نتائج البحث
                  <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                    {isFetching ? "..." : `${sorted.length} عقار`}
                  </span>
                </h1>
                {/* Active filter badges */}
                {activeFilters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {activeFilters.map(f => (
                      <Badge key={f.key} variant="outline"
                        className="bg-primary/5 border-primary/20 text-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-primary/10"
                        onClick={f.clear}>
                        {f.label}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Mobile filter sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden gap-2 border-slate-200 rounded-xl text-sm">
                      <Filter className="w-4 h-4" /> فلترة
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-6 overflow-y-auto">
                    <FilterPanel />
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 border-slate-200 rounded-xl h-10 text-sm">
                    <SelectValue placeholder="ترتيب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="price_asc">السعر: الأقل</SelectItem>
                    <SelectItem value="price_desc">السعر: الأعلى</SelectItem>
                    <SelectItem value="popular">الأكثر مشاهدة</SelectItem>
                  </SelectContent>
                </Select>

                {/* View mode toggle */}
                <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cards */}
            {isFetching ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-slate-400 text-sm">جاري البحث...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-3xl bg-white text-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">لا توجد عقارات</h3>
                <p className="text-slate-400 text-sm max-w-sm">جرب تغيير كلمات البحث أو إزالة الفلاتر</p>
                <Button onClick={clearAll} className="rounded-full px-8 h-11">عرض كل العقارات</Button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <div className={viewMode === "list"
                  ? "flex flex-col gap-5"
                  : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"}>
                  {sorted.slice(0, visibleCount).map((p, idx) =>
                    viewMode === "list"
                      ? <ListCard key={p.id} p={p} idx={idx} />
                      : <GridCard key={p.id} p={p} idx={idx} />
                  )}
                </div>
              </AnimatePresence>
            )}

            {/* Load more */}
            {sorted.length > visibleCount && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-12 border-slate-200 hover:bg-white hover:border-primary/40 h-12 font-semibold text-slate-600"
                  onClick={() => setVisibleCount(v => v + 12)}
                >
                  عرض المزيد ({sorted.length - visibleCount} عقار)
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
