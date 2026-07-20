import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { PropertyTooltip } from "@/components/PropertyTooltip";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { PropertyImageGallery } from "@/components/property-image-gallery";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartSearch } from "@/components/SmartSearch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, MapPin, Navigation,
  Star, ArrowLeft, CheckCircle2, Check,
  Filter, ChevronDown, ChevronRight,
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
  Loader2, Phone, Mail, Map, Heart, MessageCircle,
  Users, Briefcase, ShoppingBag, ClipboardList,
  BedDouble, Bath, Maximize2, Building2, TrendingUp,
  Store, Trees, Scale, GitCompare, X as XIcon, Eye, Clock, Crown,
} from "lucide-react";
import { api, type Provider, type Category, type Subcategory, type SiteSettings, type Region, type FavoriteItem } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import { FeaturedPropertiesSection } from "@/components/FeaturedPropertiesSection";
import { useApi } from "@/lib/use-api";
import { useInterpolate } from "@/lib/use-interpolate";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompare, addToCompare, removeFromCompare } from "@/lib/compare-store";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

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

// Fix Leaflet default marker icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userLocationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const ICON_MAP: Record<string, React.ElementType> = {
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
};

const COLOR_MAP = [
  "bg-amber-50 text-amber-600 border-amber-200",
  "bg-blue-50 text-blue-600 border-blue-200",
  "bg-purple-50 text-purple-600 border-purple-200",
  "bg-green-50 text-green-600 border-green-200",
  "bg-rose-50 text-rose-600 border-rose-200",
  "bg-teal-50 text-teal-600 border-teal-200",
];

const ACTIVE_COLOR_MAP = [
  "bg-amber-500 text-white border-amber-500",
  "bg-blue-500 text-white border-blue-500",
  "bg-purple-500 text-white border-purple-500",
  "bg-green-500 text-white border-green-500",
  "bg-rose-500 text-white border-rose-500",
  "bg-teal-500 text-white border-teal-500",
];

const DEFAULT_IMG = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80";

const CITIES = [
  { value: "all", label: "كل المناطق" },
  { value: "القاهرة", label: "القاهرة" },
  { value: "الإسكندرية", label: "الإسكندرية" },
  { value: "الدمام", label: "الدمام" },
  { value: "مكة المكرمة", label: "مكة المكرمة" },
  { value: "المدينة المنورة", label: "المدينة المنورة" },
  { value: "الخبر", label: "الخبر" },
  { value: "أبها", label: "أبها" },
];


const CITY_COORDS: Record<string, [number, number]> = {
  "القاهرة": [24.7136, 46.6753],
  "الإسكندرية": [21.3891, 39.8579],
  "الدمام": [26.3927, 49.9777],
  "الطائف": [21.2703, 40.4158],
  "الخبر": [26.2172, 50.1971],
  "أبها": [18.2164, 42.5053],
  "المدينة المنورة": [24.5247, 39.5692],
  "مكة المكرمة": [21.3891, 39.8579],
  "تبوك": [28.3835, 36.5662],
  "حائل": [27.5219, 41.7057],
  "بريدة": [26.3260, 43.9750],
};

function getProviderCoords(provider: Provider): [number, number] | null {
  if (provider.latitude && provider.longitude) {
    const lat = parseFloat(provider.latitude);
    const lng = parseFloat(provider.longitude);
    if (isFinite(lat) && isFinite(lng)) return [lat, lng];
  }
  if (provider.city && CITY_COORDS[provider.city]) {
    const [lat, lng] = CITY_COORDS[provider.city];
    const offset = ((provider.id * 0.009) % 0.12) - 0.06;
    return [lat + offset, lng + offset * 1.3];
  }
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


/* ═══════════════════════════════════════════════════════════════════
   AI SMART COMPONENTS — Trending & Recently Viewed
   ═══════════════════════════════════════════════════════════════════ */

interface SmallProperty {
  id: number; title: string; price?: string | null; listingType?: string | null;
  mainCategory?: string | null; district?: string | null; images?: string | null;
  viewCount?: number; rooms?: number | null; area?: string | null;
}

function SmallPropertyCard({ p, onClick }: { p: SmallProperty; onClick: () => void }) {
  const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
  const thumb = imgs[0] ?? DEFAULT_IMG;
  const priceNum = Number(p.price);
  const priceStr = priceNum ? priceNum.toLocaleString("en-US") + " ج.م" : "السعر عند التواصل";
  const typeAr = p.listingType === "rent" ? "للإيجار" : "للبيع";
  return (
    <PropertyTooltip property={{ id: p.id, title: p.title, price: p.price, listingType: p.listingType, district: p.district, rooms: p.rooms, area: p.area ? String(p.area) : undefined, images: p.images, mainCategory: p.mainCategory ?? undefined }}>
    <div
      onClick={onClick}
      className="w-56 shrink-0 bg-white rounded-lg border border-slate-200/80 overflow-hidden cursor-pointer transition-colors duration-150 hover:border-slate-300"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100">
        <img src={thumb} alt={p.title} loading="lazy"
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.src = DEFAULT_IMG; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-md
          ${p.listingType === "rent" ? "bg-blue-500" : "bg-emerald-500"}`}>
          {typeAr}
        </span>
        <span dir="ltr" className="absolute bottom-2 right-2 text-white text-sm font-black drop-shadow-md">{priceStr}</span>
      </div>
      <div className="p-3">
        <p className="font-bold text-slate-800 text-sm line-clamp-1">{p.title}</p>
        {p.district && (
          <p className="flex items-center gap-1 text-slate-400 text-xs mt-1">
            <MapPin className="w-3 h-3 shrink-0" />{p.district}
          </p>
        )}
      </div>
    </div>
    </PropertyTooltip>
  );
}

function TrendingSection() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<SmallProperty[]>({
    queryKey: ["trending-properties"],
    queryFn: async () => {
      const res = await fetch("/api/trending?limit=10");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });
  if (isLoading || !data || data.length === 0) return null;
  return (
    <section className="py-14 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 rounded-full px-3 py-1 text-xs font-semibold mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              الأكثر مشاهدة الآن
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">العقارات الأكثر مشاهدة</h2>
            <p className="text-slate-500 text-sm mt-1">اكتشف ما يبحث عنه الآخرون</p>
          </div>
          <button onClick={() => setLocation("/search?sort=popular")}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            عرض الكل <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {data.map(p => (
            <SmallPropertyCard key={p.id} p={p} onClick={() => setLocation(`/property/${p.id}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentlyViewedSection() {
  const [, setLocation] = useLocation();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored: number[] = JSON.parse(localStorage.getItem("rve_ids") ?? "[]");
      setIds(stored.filter(n => n > 0).slice(0, 8));
    } catch {}
  }, []);

  const { data, isLoading } = useQuery<SmallProperty[]>({
    queryKey: ["recently-viewed", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const res = await fetch(`/api/recently-viewed?ids=${ids.join(",")}`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  if (!ids.length || isLoading || !data || data.length === 0) return null;

  return (
    <section className="py-14 bg-white border-t border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-600 rounded-full px-3 py-1 text-xs font-semibold mb-2">
              <Eye className="w-3.5 h-3.5" />
              شاهدته مؤخراً
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">متابعة تصفحك</h2>
            <p className="text-slate-500 text-sm mt-1">استكمل مشاهدة العقارات التي اهتممت بها</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("rve_ids");
              setIds([]);
            }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            مسح السجل
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {data.map(p => (
            <SmallPropertyCard key={p.id} p={p} onClick={() => setLocation(`/property/${p.id}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** null = كل المناطق */
  const [heroRegionId, setHeroRegionId] = useState<number | null>(null);
  /** null = كل المدن ضمن نطاق المنطقة */
  const [heroCityName, setHeroCityName] = useState<string | null>(null);
  /** اسم الحي / المنطقة المختارة في بنها */
  const [heroAreaName, setHeroAreaName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  /* ─── Real-estate hero search ─── */
  const [listingType, setListingType] = useState<"للبيع" | "للإيجار">("للبيع");
  const [heroSubcategoryId, setHeroSubcategoryId] = useState<string>("all");

  const [priceRange, setPriceRange] = useState<string>("all");
  const [catOpen, setCatOpen] = useState(false);
  const [subCatOpen, setSubCatOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearMeMap, setShowNearMeMap] = useState(false);
  const [, setLocation] = useLocation();
  const nearMeRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { items: compareItems, isIn: isInCompare } = useCompare();

  const { data: categories } = useApi(() => api.categories.list(), []);
  const { data: allSubs } = useApi(() => api.subcategories.list(), []);
  const { data: providers, loading: providersLoading } = useApi(() => api.providers.list(), []);
  const { data: settings } = useApi(() => api.settings.list(), []);

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: () => api.regions.list(),
  });

  const { data: banhaAreas = [] } = useQuery({
    queryKey: ["areas", 1],
    queryFn: () => api.locations.getAreasByCity(1),
    staleTime: 5 * 60_000,
  });

  const { data: featuredAreas = [] } = useQuery<Array<{ id: number; nameAr: string; image: string | null; cityName: string | null; displayOrder: number; enabled: boolean; propertyCount: number }>>({
    queryKey: ["featured-areas"],
    queryFn: api.featuredAreas.list,
    staleTime: 5 * 60_000,
  });

  const spotlightEnabled = settings?.spotlightEnabled === "true";
  const spotlightPropertyId = settings?.spotlightPropertyId ? Number(settings.spotlightPropertyId) : null;
  const spotlightBadge = settings?.spotlightBadge || "عرض حصري";
  const spotlightCtaText = settings?.spotlightCtaText || "عرض التفاصيل";
  const spotlightCustomLink = settings?.spotlightCustomLink || "";

  const { data: spotlightProperty } = useQuery<any>({
    queryKey: ["spotlight-property", spotlightPropertyId],
    queryFn: () => api.properties.get(spotlightPropertyId!),
    enabled: spotlightEnabled && !!spotlightPropertyId,
    staleTime: 5 * 60_000,
  });

  const { data: platformStats } = useQuery<{ providers: number; users: number; services: number; requests: number; properties: number }>({
    queryKey: ["platform-stats"],
    queryFn: () => api.stats.platform(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homePropsRaw = [], isLoading: propsLoading } = useQuery<any[]>({
    queryKey: ["home-properties"],
    queryFn: () => api.properties.list({}),
    staleTime: 2 * 60 * 1000,
  });

  const { data: homeFavIds = [] } = useQuery<number[]>({
    queryKey: ["property-favorites-ids"],
    queryFn: async () => {
      if (!user) return [];
      const rows = await api.propertyFavorites.list();
      return (rows as any[]).map((r: any) => r.propertyId);
    },
    enabled: !!user,
  });

  const toggleHomeFavMut = useMutation({
    mutationFn: async ({ id, add }: { id: number; add: boolean }) => {
      if (!user) return;
      if (add) await api.propertyFavorites.add(id);
      else await api.propertyFavorites.remove(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-favorites-ids"] });
      qc.invalidateQueries({ queryKey: ["property-favorites"] });
    },
  });

  const heroCityOptions = useMemo(() => {
    const all = { value: "__all__", label: "كل المناطق", count: -1 };
    const areas = (banhaAreas as Array<{ id: number; nameAr: string; enabled?: boolean; propertyCount?: number }>)
      .filter(a => a.enabled !== false)
      .map(a => ({ value: a.nameAr, label: a.nameAr, count: a.propertyCount ?? 0 }))
      .filter((a, i, arr) => arr.findIndex(x => x.value === a.value) === i)
      .sort((a, b) => b.count - a.count);
    return [all, ...areas];
  }, [banhaAreas]);

  useEffect(() => {
    setHeroCityName(null);
  }, [heroRegionId]);


  const { data: favoritesData = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites", user?.id],
    queryFn: () => api.favorites.list(user!.id),
    enabled: !!user && user.role === "user",
  });

  const favoriteIds = useMemo(() => new Set(favoritesData.map(f => f.providerId)), [favoritesData]);

  const toggleFavMutation = useMutation({
    mutationFn: async (providerId: number) => {
      if (!user) return;
      if (favoriteIds.has(providerId)) {
        await api.favorites.remove(user.id, providerId);
      } else {
        await api.favorites.add(user.id, providerId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  const siteName = (settings as SiteSettings | undefined)?.siteName ?? "عقارات بنها";
  const _ctaText = (settings as SiteSettings | undefined)?.ctaText ?? "ندعم المشاريع المنزلية ونضمن حقوقك";
  const _ctaButtonText = (settings as SiteSettings | undefined)?.ctaButtonText ?? "انضم إلينا الآن";
  const heroImage = (settings as SiteSettings | undefined)?.heroImage ?? "";
  const _heroTitle = (settings as SiteSettings | undefined)?.heroTitle ?? "";
  const _heroSubtitle = (settings as SiteSettings | undefined)?.heroSubtitle ?? "";
  const ip = useInterpolate();
  const heroTitle = ip(_heroTitle);
  const heroSubtitle = ip(_heroSubtitle);
  const ctaText = ip(_ctaText);
  const ctaButtonText = ip(_ctaButtonText);

  const getSubs = (catId: number) => ((allSubs as Subcategory[] | undefined) ?? []).filter(s => s.categoryId === catId);

  const matchesActiveCategory = (p: Provider) => {
    if (activeTab === "all") return true;
    return (p.categoryNameAr ?? "").includes(
      activeTab === "food" ? "طعام" :
      activeTab === "maintenance" ? "صيانة" :
      activeTab === "design" ? "تصميم" : ""
    );
  };

  const featuredProviders = (providers as Provider[] | undefined)?.filter(p => p.featured) ?? [];
  const filteredProviders = ((providers as Provider[] | undefined) ?? []).filter(matchesActiveCategory);

  /** Maximum radius (km) for the "Near me" carousel. */
  const NEARBY_RADIUS_KM = 5;

  const nearbyProviders = useMemo(() => {
    const allProviders = ((providers as Provider[] | undefined) ?? []).filter(matchesActiveCategory);
    // No geo permission yet → fall back to a small generic preview.
    if (!userLocation) return allProviders.slice(0, 8).map(p => ({ ...p, dist: 0 }));
    return [...allProviders]
      .map(p => {
        const coords = getProviderCoords(p);
        const dist = coords ? haversine(userLocation.lat, userLocation.lng, coords[0], coords[1]) : Infinity;
        return { ...p, dist };
      })
      .filter(p => p.dist <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, userLocation, activeTab]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery);
    if (selectedCategory && selectedCategory !== "all") params.set("mainCategory", selectedCategory);
    if (listingType) params.set("type", listingType);
    if (priceRange && priceRange !== "all") params.set("price", priceRange);
    if (heroRegionId != null) params.set("regionId", String(heroRegionId));
    if (heroCityName && heroCityName !== "__all__") params.set("city", heroCityName);
    if (heroAreaName) params.set("district", heroAreaName);
    if (heroSubcategoryId && heroSubcategoryId !== "all") params.set("subcategoryId", heroSubcategoryId);
    setLocation(`/properties?${params.toString()}`);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMeLoading(false);
        const { latitude, longitude } = pos.coords;
        setLocation(`/search?lat=${latitude}&lng=${longitude}&nearest=true`);
      },
      () => {
        setNearMeLoading(false);
        alert("لم نتمكن من تحديد موقعك. تأكد من السماح بالوصول للموقع.");
      },
      { timeout: 8000 }
    );
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMeLoading(false);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowNearMeMap(true);
        nearMeRef.current?.scrollIntoView({ behavior: "smooth" });
      },
      () => {
        setNearMeLoading(false);
        alert("لم نتمكن من تحديد موقعك.");
      },
      { timeout: 8000 }
    );
  };

  const expandedCatObj = (categories as Category[] | undefined)?.find(c => c.id === expandedCat);
  const expandedCatIndex = (categories as Category[] | undefined)?.findIndex(c => c.id === expandedCat) ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary" dir="rtl">
      <Header />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage || "/images/hero.jpg"}
              alt=""
              className="w-full h-full object-cover object-center scale-105"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/60 to-slate-900/80" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 pt-14 pb-10 md:pt-16 md:pb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold rounded-full px-4 py-1.5 mb-5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              بنها — القليوبية — مصر
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3 max-w-2xl drop-shadow">
              {heroTitle || (
                <>اعثر على <span className="text-primary">عقارك المثالي</span> في بنها</>
              )}
            </h1>
            <p className="text-white/70 text-sm md:text-base mb-8 max-w-lg">
              بيع وإيجار وخدمات عقارية — أسرع وأوثق
            </p>

            {/* ── Search Card ── */}
            <motion.div
              layout
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-visible"
            >
              {/* Tabs */}
              <div className="relative flex rounded-t-2xl overflow-hidden">
                {(["للبيع", "للإيجار"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setListingType(tab)}
                    className={`relative flex-1 py-3.5 text-sm font-bold transition-colors z-10 ${
                      listingType === tab ? "text-primary-foreground" : "text-gray-500 hover:text-gray-700 bg-gray-50"
                    }`}
                  >
                    {listingType === tab && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 bg-primary"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>

              {/* ── Main search row ── */}
              <div className="flex items-stretch border-t border-gray-100" dir="rtl">

                {/* SmartSearch — takes the bulk of the space */}
                <div className="flex-1 min-w-0">
                  <SmartSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder="ابحث عن حي أو منطقة أو مشروع أو نوع عقار…"
                    variant="hero"
                  />
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch my-2 shrink-0" />

                {/* Category */}
                <div className="w-36 shrink-0">
                  {(() => {
                    const getCatIcon = (slug: string | null | undefined, nameAr: string) => {
                      const s = (slug ?? "").toLowerCase();
                      const n = nameAr ?? "";
                      if (s.includes("resid") || s.includes("sakan") || n.includes("سكن")) return BedDouble;
                      if (s.includes("comm") || s.includes("tijar") || n.includes("تجار")) return Store;
                      if (s.includes("land") || s.includes("aradi") || n.includes("أراض") || n.includes("اراض")) return Trees;
                      return Building2;
                    };
                    const selCatLabel = selectedCategory === "all"
                      ? "كل الأنواع"
                      : (reCategories as Array<{ id: number; nameAr: string; slug?: string | null; propertyCount?: number }>)
                          .find(c => (c.slug ?? String(c.id)) === selectedCategory)?.nameAr ?? "كل الأنواع";
                    return (
                      <Popover open={catOpen} onOpenChange={setCatOpen}>
                        <PopoverTrigger asChild>
                          <button className="h-14 flex items-center gap-1.5 px-3 w-full text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors focus:outline-none">
                            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate flex-1 text-right">{selCatLabel}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={8}
                          className="w-52 p-1.5 rounded-xl border border-gray-100 shadow-xl bg-white"
                        >
                          {/* All types */}
                          <button
                            onClick={() => { setSelectedCategory("all"); setHeroSubcategoryId("all"); setCatOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${selectedCategory === "all" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                          >
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedCategory === "all" ? "bg-primary/15" : "bg-gray-100"}`}>
                              <Grid className={`w-3.5 h-3.5 ${selectedCategory === "all" ? "text-primary" : "text-gray-400"}`} />
                            </span>
                            <span className="font-medium flex-1 text-right">كل الأنواع</span>
                            {selectedCategory === "all" && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                          {/* Category items */}
                          {(reCategories as Array<{ id: number; nameAr: string; slug?: string | null; propertyCount?: number }>)
                            .sort((a, b) => (b.propertyCount ?? 0) - (a.propertyCount ?? 0))
                            .map(c => {
                              const val = c.slug ?? String(c.id);
                              const active = selectedCategory === val;
                              const Icon = getCatIcon(c.slug, c.nameAr);
                              const count = c.propertyCount ?? 0;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => { setSelectedCategory(val); setHeroSubcategoryId("all"); setCatOpen(false); }}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                                >
                                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary/15" : "bg-gray-100"}`}>
                                    <Icon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-gray-400"}`} />
                                  </span>
                                  <span className="font-medium flex-1 text-right">{c.nameAr}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums shrink-0 ${count > 0 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                                    {count}
                                  </span>
                                  {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                </div>

                {/* Property Sub-type dropdown */}
                {(() => {
                  const selCat = reCategories.find(c => (c.slug ?? String(c.id)) === selectedCategory);
                  const subs = selCat
                    ? ((allSubs as Subcategory[] | undefined) ?? []).filter(s => s.categoryId === selCat.id)
                    : [];
                  if (selectedCategory === "all" || subs.length === 0) return null;
                  const selSubLabel = heroSubcategoryId === "all"
                    ? "كل الأنواع"
                    : subs.find(s => String(s.id) === heroSubcategoryId)?.nameAr ?? "كل الأنواع";
                  return (
                    <>
                      <div className="w-px bg-gray-100 self-stretch my-2 shrink-0" />
                      <div className="w-36 shrink-0">
                        <Popover open={subCatOpen} onOpenChange={setSubCatOpen}>
                          <PopoverTrigger asChild>
                            <button className="h-14 flex items-center gap-1.5 px-3 w-full text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors focus:outline-none">
                              <Grid className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate flex-1 text-right">{selSubLabel}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${subCatOpen ? "rotate-180" : ""}`} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            sideOffset={8}
                            className="w-48 p-1.5 rounded-xl border border-gray-100 shadow-xl bg-white"
                          >
                            <button
                              onClick={() => { setHeroSubcategoryId("all"); setSubCatOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${heroSubcategoryId === "all" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                              <span className="font-medium flex-1 text-right">كل الأنواع</span>
                              {heroSubcategoryId === "all" && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </button>
                            {subs.map(s => {
                              const active = heroSubcategoryId === String(s.id);
                              const count = s.propertyCount ?? 0;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => { setHeroSubcategoryId(String(s.id)); setSubCatOpen(false); }}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                                >
                                  <span className="font-medium flex-1 text-right">{s.nameAr}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums shrink-0 ${count > 0 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                                    {count}
                                  </span>
                                  {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  );
                })()}

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch my-2 shrink-0" />

                {/* Featured Areas — admin-managed, with property counts */}
                <div className="w-36 shrink-0">
                  {(() => {
                    const areaOptions = (featuredAreas as Array<{ id: number; nameAr: string; propertyCount: number; enabled: boolean }>)
                      .filter(a => a.enabled);
                    const selAreaLabel = heroAreaName ?? "كل المناطق";
                    return (
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <button className="h-14 flex items-center gap-1.5 px-3 w-full text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors focus:outline-none">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate flex-1 text-right">{selAreaLabel}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${cityOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={8}
                          className="w-56 p-1.5 rounded-xl border border-gray-100 shadow-xl bg-white max-h-72 overflow-y-auto"
                        >
                          {/* All areas */}
                          <button
                            onClick={() => { setHeroAreaName(null); setCityOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${!heroAreaName ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                          >
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${!heroAreaName ? "bg-primary/15" : "bg-gray-100"}`}>
                              <MapPin className={`w-3 h-3 ${!heroAreaName ? "text-primary" : "text-gray-400"}`} />
                            </span>
                            <span className="font-medium flex-1 text-right">كل المناطق</span>
                            {!heroAreaName && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                          {areaOptions.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-3">لا توجد مناطق مضافة</p>
                          )}
                          {areaOptions.map(a => {
                            const active = heroAreaName === a.nameAr;
                            return (
                              <button
                                key={a.id}
                                onClick={() => { setHeroAreaName(a.nameAr); setCityOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
                              >
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-primary/15" : "bg-gray-100"}`}>
                                  <MapPin className={`w-3 h-3 ${active ? "text-primary" : "text-gray-400"}`} />
                                </span>
                                <span className="font-medium flex-1 text-right">{a.nameAr}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums shrink-0 ${a.propertyCount > 0 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                                  {a.propertyCount}
                                </span>
                                {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                </div>

                {/* Search button */}
                <button
                  onClick={handleSearch}
                  className="shrink-0 h-14 px-6 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-es-2xl transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  بحث
                </button>
              </div>

            </motion.div>

          </div>
        </section>

        {/* ── AD: hero bottom ── */}
        <div className="container mx-auto px-4">
          <AdBanner position="hero_bottom" />
        </div>

        {/* ── FEATURED PROPERTIES SECTION (admin-controlled) ── */}
        <FeaturedPropertiesSection
          settings={settings as Record<string, string> | undefined}
          categories={(reCategories as Array<{ id: number; nameAr: string; slug: string; propertyCount?: number }>)}
        />

        {/* ── FEATURED AREAS ── */}
        {featuredAreas.length > 0 && (
          <section className="py-14 bg-gradient-to-b from-white to-gray-50/60">
            <div className="container mx-auto px-4">
              {/* Section header */}
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    بحث بالمنطقة
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#0a0a0a] leading-tight">
                    علشان لو بتحب تدور بالمنطقة
                  </h2>
                  <p className="text-gray-500 text-sm mt-1.5">اختر منطقتك وتصفح العقارات المتاحة</p>
                </div>
                <button
                  onClick={() => setLocation("/properties")}
                  className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal drag-to-scroll strip */}
              <div
                className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing select-none"
                ref={(el) => {
                  if (!el) return;
                  let isDown = false;
                  let startX = 0;
                  let scrollLeft = 0;
                  let moved = false;
                  const onDown = (e: MouseEvent) => {
                    isDown = true;
                    moved = false;
                    startX = e.pageX - el.offsetLeft;
                    scrollLeft = el.scrollLeft;
                    el.style.cursor = "grabbing";
                  };
                  const onUp = () => {
                    isDown = false;
                    el.style.cursor = "grab";
                  };
                  const onMove = (e: MouseEvent) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const x = e.pageX - el.offsetLeft;
                    const walk = (x - startX) * 1.2;
                    if (Math.abs(walk) > 5) moved = true;
                    el.scrollLeft = scrollLeft - walk;
                  };
                  el.addEventListener("mousedown", onDown);
                  window.addEventListener("mouseup", onUp);
                  el.addEventListener("mousemove", onMove);
                  el.addEventListener("click", (e) => { if (moved) e.stopPropagation(); }, true);
                }}
              >
                {featuredAreas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => setLocation(`/properties?district=${encodeURIComponent(area.nameAr)}`)}
                    className="shrink-0 w-44 sm:w-52 text-right"
                  >
                    {/* Image — no overlay, no mask */}
                    <div className="w-full h-52 sm:h-60 rounded-xl overflow-hidden mb-2">
                      {area.image ? (
                        <img
                          src={area.image}
                          alt={area.nameAr}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-teal-200" />
                      )}
                    </div>

                    {/* Name + count below image */}
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                        {area.propertyCount > 0 ? area.propertyCount : ""}
                        {area.propertyCount > 0 && " إعلانات"}
                      </span>
                      <p className="font-bold text-[#0a0a0a] text-sm leading-tight">
                        {area.nameAr}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile show all */}
              <div className="mt-5 flex justify-center sm:hidden">
                <button
                  onClick={() => setLocation("/properties")}
                  className="text-sm font-semibold text-primary flex items-center gap-1.5"
                >
                  عرض جميع العقارات
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── SPOTLIGHT PROPERTY ── */}
        {spotlightEnabled && spotlightProperty && (() => {
          const sp = spotlightProperty as any;
          const imgs: string[] = (() => { try { return JSON.parse(sp.images ?? "[]"); } catch { return []; } })();
          const thumb = imgs[0] ?? DEFAULT_IMG;
          const priceNum = Number(sp.price);
          const priceStr = priceNum ? priceNum.toLocaleString("en-US") : "";
          const location = [sp.district, sp.city].filter(Boolean).join("، ") || "بنها";
          const beds = Number(sp.bedrooms ?? 0);
          const baths = Number(sp.bathrooms ?? 0);
          const area = Number(sp.area ?? 0);
          const targetLink = spotlightCustomLink || `/property/${sp.id}`;

          return (
            <section className="relative overflow-hidden py-0" style={{ background: "linear-gradient(145deg, #0c1121 0%, #1a1040 40%, #0c1121 100%)" }}>
              {/* Decorative background orbs */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-amber-500/10 blur-[80px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] rounded-full bg-primary/5 blur-[120px]" />
              </div>

              <div className="container mx-auto px-4 py-16 relative z-10">
                {/* Section label */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="flex justify-center mb-10"
                >
                  <div className="inline-flex items-center gap-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full px-5 py-2 text-sm font-extrabold backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 fill-amber-400" />
                    {spotlightBadge}
                    <Sparkles className="w-4 h-4 fill-amber-400" />
                  </div>
                </motion.div>

                {/* Main card */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="max-w-5xl mx-auto"
                >
                  <div
                    className="group relative bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-[0_0_100px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col md:flex-row"
                    onClick={() => setLocation(targetLink)}
                  >
                    {/* ── Image side ── */}
                    <div className="relative md:w-[45%] h-64 md:h-auto overflow-hidden shrink-0">
                      <img
                        src={thumb}
                        alt={sp.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 hidden md:block" />

                      {/* Badges on image */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {sp.listingType && (
                          <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            {sp.listingType}
                          </span>
                        )}
                        {sp.mainCategory && (
                          <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                            {sp.mainCategory}
                          </span>
                        )}
                      </div>

                      {/* Bottom image text (mobile) */}
                      <div className="md:hidden absolute bottom-0 inset-x-0 p-4">
                        <h2 className="text-xl font-extrabold text-white leading-snug drop-shadow-lg">{sp.title}</h2>
                      </div>
                    </div>

                    {/* ── Content side ── */}
                    <div className="flex-1 flex flex-col justify-center p-8 md:p-10" dir="rtl">
                      {/* Gold accent label */}
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-amber-400 text-xs font-extrabold tracking-widest uppercase">{spotlightBadge}</span>
                      </div>

                      {/* Title (desktop) */}
                      <h2 className="hidden md:block text-2xl md:text-3xl font-extrabold text-white leading-snug mb-4">
                        {sp.title}
                      </h2>

                      {/* Feature pills */}
                      {(beds > 0 || baths > 0 || area > 0) && (
                        <div className="flex flex-wrap gap-3 mb-5">
                          {beds > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <BedDouble className="w-3.5 h-3.5 text-primary" />
                              {beds} غرف
                            </div>
                          )}
                          {baths > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <Bath className="w-3.5 h-3.5 text-primary" />
                              {baths} حمام
                            </div>
                          )}
                          {area > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <Maximize2 className="w-3.5 h-3.5 text-primary" />
                              {area} م²
                            </div>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-white/60 text-sm mb-5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        {location}
                      </div>

                      {/* Price */}
                      {priceStr && (
                        <div className="mb-7">
                          <div className="text-4xl md:text-5xl font-black text-white leading-none">
                            {priceStr}
                          </div>
                          <div className="text-white/40 text-sm mt-1.5">جنيه مصري</div>
                        </div>
                      )}

                      {/* CTA */}
                      <div>
                        <Button
                          size="lg"
                          className="rounded-xl px-8 font-bold gap-2 shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-shadow"
                          onClick={e => { e.stopPropagation(); setLocation(targetLink); }}
                        >
                          {spotlightCtaText}
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          );
        })()}

        {/* ── COMMERCIAL & LANDS ── */}
        {(() => {
          const commercial = homePropsRaw.filter(p => p.mainCategory === "تجاري" || p.mainCategory === "commercial");
          const lands = homePropsRaw.filter(p => p.mainCategory === "أراضي" || p.mainCategory === "land");

          const MiniCard = ({ property }: { property: any }) => {
            const imgs: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
            const thumb = imgs[0] ?? DEFAULT_IMG;
            const location = [property.district, property.city].filter(Boolean).join("، ") || "بنها";
            const priceNum = Number(property.price);
            const priceStr = priceNum ? priceNum.toLocaleString("en-US") : "غير محدد";
            const listType = property.listingType ?? "";
            return (
              <PropertyTooltip property={{ id: property.id, title: property.title, price: property.price, listingType: listType, district: property.district, area: property.area ? String(property.area) : undefined, images: property.images, mainCategory: property.mainCategory }}>
              <div
                className="group shrink-0 w-64 bg-white border border-border/70 rounded-xl overflow-hidden hover:border-border transition-colors duration-150 cursor-pointer"
                onClick={() => setLocation(`/property/${property.id}`)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img src={thumb} alt={property.title} className="w-full h-full object-cover" onError={e => { e.currentTarget.src = DEFAULT_IMG; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {(property as any).featured && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"><Crown className="w-2.5 h-2.5" /> مميز</span>
                  )}
                  {(property.area ?? 0) > 0 && (
                    <span className="absolute bottom-2 left-2 text-[11px] font-semibold bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{property.area} م²</span>
                  )}
                </div>
                <div className="p-3.5">
                  <p dir="ltr" className="text-gray-900 font-extrabold text-base leading-none">{priceStr} <span className="text-[11px] text-muted-foreground font-normal">ج.م</span></p>
                  <h3 className="font-semibold text-gray-900 text-sm mt-1 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{property.title}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>
              </div>
              </PropertyTooltip>
            );
          };

          return (
            <section className="py-14 bg-white border-y border-border/50">
              <div className="container mx-auto px-4 space-y-12">
                <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                          <Store className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-gray-900">محلات ومكاتب تجارية</h2>
                          <p className="text-xs text-muted-foreground">{commercial.length} عقار تجاري متاح</p>
                        </div>
                      </div>
                      <button onClick={() => setLocation("/properties?category=تجاري")} className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {commercial.length > 0 ? commercial.map(p => <MiniCard key={p.id} property={p} />) : (
                        <p className="text-sm text-muted-foreground py-6">لا توجد عقارات تجارية متاحة حالياً</p>
                      )}
                    </div>
                  </div>
                <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Trees className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-gray-900">أراضي للبيع</h2>
                          <p className="text-xs text-muted-foreground">{lands.length} قطعة أرض متاحة</p>
                        </div>
                      </div>
                      <button onClick={() => setLocation("/properties?category=أراضي")} className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {lands.length > 0 ? lands.map(p => <MiniCard key={p.id} property={p} />) : (
                        <p className="text-sm text-muted-foreground py-6">لا توجد أراضي متاحة حالياً</p>
                      )}
                    </div>
                  </div>
              </div>
            </section>
          );
        })()}

        {/* ── AD: homepage mid ── */}
        <div className="container mx-auto px-4 py-2">
          <AdBanner position="homepage_mid" />
        </div>

        {/* ── AI: TRENDING PROPERTIES ── */}
        <TrendingSection />

        {/* ── AI: RECENTLY VIEWED ── */}
        <RecentlyViewedSection />

        {/* ── AD: before footer ── */}
        <div className="container mx-auto px-4 py-4">
          <AdBanner position="homepage_before_footer" />
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
                    <div key={item.id} className="flex items-center gap-1.5 bg-primary/10 rounded-xl px-3 py-1.5 shrink-0">
                      <img src={item.image} alt="" className="w-7 h-7 rounded-lg object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                      <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">{item.title}</span>
                      <button onClick={() => removeFromCompare(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <XIcon className="w-3 h-3" />
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

      </main>
      <RealEstateFooter />
    </div>
  );
}
