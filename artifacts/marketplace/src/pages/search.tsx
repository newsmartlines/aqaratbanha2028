import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, MapPin, Map,
  Star, LayoutGrid, List as ListIcon, X, Filter, Navigation, Crown, ArrowUpCircle, Loader2,
  CheckCircle2, Phone, Clock,
} from "lucide-react";
import { api, type Provider, type Category, type Region, type City } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useQuery } from "@tanstack/react-query";
import CityAreaSelector from "@/components/CityAreaSelector";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// Fix Leaflet marker icons for Vite
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

const DEFAULT_IMG = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80";

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

const SA_CENTER: [number, number] = [23.8859, 45.0792];

function getProviderCoords(provider: Provider): [number, number] | null {
  if (provider.latitude && provider.longitude) {
    return [parseFloat(provider.latitude), parseFloat(provider.longitude)];
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

function formatRegisteredSinceAr(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 45) return "منذ لحظات";
  const min = Math.floor(sec / 60);
  if (min < 60) return min <= 1 ? "منذ دقيقة" : `منذ ${min} دقائق`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "منذ ساعة" : `منذ ${hr} ساعات`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? "منذ يوم" : `منذ ${day} أيام`;
  const mo = Math.floor(day / 30);
  return mo <= 1 ? "منذ شهر" : `منذ ${mo} أشهر`;
}

function digitsPhone(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export default function SearchPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showMap, setShowMap] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(4);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [path] = useLocation();
  const [, setLocation] = useLocation();
  const urlSignature = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : path;

  const { data: categories } = useApi(() => api.categories.list(), []);
  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !path.startsWith("/search")) return;
    const sp = new URLSearchParams(window.location.search);
    setSearchInput(sp.get("q") ?? "");
    setSelectedCategory(sp.get("category") ?? "all");
    const city = sp.get("city");
    setSelectedCityName(city);
    const rid = sp.get("regionId");
    setSelectedRegionId(rid && !Number.isNaN(parseInt(rid, 10)) ? parseInt(rid, 10) : null);
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    if (lat && lng) {
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, [path, urlSignature]);

  const resolveCityIdFromName = (name: string | null, regionId: number | null) => {
    if (!name) return null;
    const pool: City[] = regionId != null
      ? (regions.find(r => r.id === regionId)?.cities ?? [])
      : regions.flatMap(r => r.cities ?? []);
    return pool.find(c => c.nameAr === name)?.id ?? null;
  };

  useEffect(() => {
    const id = resolveCityIdFromName(selectedCityName, selectedRegionId);
    setSelectedCityId(id);
  }, [selectedCityName, selectedRegionId, regions]);

  const stickyCityOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "__all__", label: "كل المدن" }];
    const addCity = (nameAr: string) => {
      if (!opts.some(o => o.value === nameAr)) opts.push({ value: nameAr, label: nameAr });
    };
    if (selectedRegionId != null) {
      const reg = regions.find((r: Region) => r.id === selectedRegionId);
      (reg?.cities ?? []).forEach((c) => {
        if (c.enabled !== false) addCity(c.nameAr);
      });
      return opts;
    }
    regions.forEach((region: Region) => {
      (region.cities ?? []).forEach((city) => {
        if (city.enabled !== false) addCity(city.nameAr);
      });
    });
    return opts;
  }, [regions, selectedRegionId]);

  const { data: providers, loading } = useApi(
    () => api.providers.list({
      search: searchInput || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      city: selectedCityName ?? undefined,
      regionId: selectedRegionId != null ? selectedRegionId : undefined,
    }),
    [searchInput, selectedCategory, selectedCityName, selectedRegionId]
  );

  const displayProviders: (Provider & { isSponsored?: boolean })[] = providers
    ? [...providers].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    })
    : [];

  // Inject sponsored ad slot
  if (displayProviders.length >= 3) {
    const sponsoredAd = { ...displayProviders[0], isSponsored: true };
    displayProviders.splice(3, 0, sponsoredAd);
  }

  // Sort by distance if user location detected
  const sortedProviders = useMemo(() => {
    const filtered = displayProviders.filter((p) => {
      if (verifiedOnly && !p.verified) return false;
      if (minRating != null && parseFloat(p.rating) < minRating) return false;
      return true;
    });
    if (!userLocation) return filtered;
    return [...filtered]
      .map(p => {
        const c = getProviderCoords(p);
        const dist = c ? haversine(userLocation.lat, userLocation.lng, c[0], c[1]) : Infinity;
        return { p, dist };
      })
      .filter(x => x.dist <= 50)
      .sort((a, b) => a.dist - b.dist)
      .map(x => x.p);
  }, [displayProviders, userLocation, verifiedOnly, minRating]);

  useEffect(() => {
    setVisibleCount(9);
  }, [searchInput, selectedCategory, selectedRegionId, selectedCityName, minRating, verifiedOnly]);

  const mapCenter = useMemo((): [number, number] => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (selectedCityName && CITY_COORDS[selectedCityName]) return CITY_COORDS[selectedCityName];
    return SA_CENTER;
  }, [userLocation, selectedCityName]);

  const handleNearMe = () => {
    if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLoading(false);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowMap(true);
      },
      () => {
        setLocationLoading(false);
        alert("لم نتمكن من تحديد موقعك.");
      },
      { timeout: 8000 }
    );
  };

  const applyBarSearchToUrl = () => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("q", searchInput.trim());
    if (selectedRegionId != null) params.set("regionId", String(selectedRegionId));
    if (selectedCityName) params.set("city", selectedCityName);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    setLocation(`/search?${params.toString()}`);
  };

  const FilterPanel = () => (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">المنطقة والمدينة</h3>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-primary font-medium hover:bg-primary/10" onClick={handleNearMe} disabled={locationLoading}>
            {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 mr-1" />}
            بالقرب مني
          </Button>
        </div>
        <motion.div layout className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">المنطقة</Label>
            <Select
              value={selectedRegionId != null ? String(selectedRegionId) : "__all__"}
              onValueChange={(v) => {
                if (v === "__all__") {
                  setSelectedRegionId(null);
                } else {
                  setSelectedRegionId(parseInt(v, 10));
                }
                setSelectedCityId(null);
                setSelectedCityName(null);
              }}
            >
              <SelectTrigger className="h-11">
                <MapPin className="w-4 h-4 ml-2 text-primary shrink-0" />
                <SelectValue placeholder="كل المناطق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">كل المناطق</SelectItem>
                {regions.map((r: Region) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRegionId ?? "all"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <CityAreaSelector
                regionFilterId={selectedRegionId}
                selectedCityId={selectedCityId}
                onCityChange={(cityId, cityName) => {
                  setSelectedCityId(cityId);
                  setSelectedCityName(cityName);
                }}
                showAllOption={true}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-4">التصنيفات</h3>
        <div className="space-y-3">
          {(categories ?? []).map((cat: Category) => (
            <div key={cat.id} className="flex items-center space-x-3 space-x-reverse">
              <Checkbox
                id={`cat-${cat.id}`}
                className="border-border/60 data-[state=checked]:bg-primary"
                checked={selectedCategory === String(cat.id)}
                onCheckedChange={(checked) => setSelectedCategory(checked ? String(cat.id) : "all")}
              />
              <Label htmlFor={`cat-${cat.id}`} className="text-sm font-medium cursor-pointer leading-none">
                {cat.nameAr}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-4">التقييم</h3>
        <div className="space-y-3">
          {[5, 4, 3].map(rating => (
            <div key={rating} className="flex items-center space-x-3 space-x-reverse">
              <Checkbox
                id={`rating-${rating}`}
                checked={minRating === rating}
                onCheckedChange={(checked) => setMinRating(checked ? rating : null)}
                className="border-border/60 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              <Label htmlFor={`rating-${rating}`} className="flex items-center cursor-pointer">
                <div className="flex mr-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium mr-2">فأكثر</span>
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-lg mb-4">التوثيق</h3>
        <Button
          type="button"
          variant={verifiedOnly ? "default" : "outline"}
          className="w-full"
          onClick={() => setVerifiedOnly((v) => !v)}
        >
          موثق فقط
        </Button>
      </div>

      <Button variant="outline" className="w-full h-12 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive transition-colors"
        onClick={() => {
          setSelectedCategory("all");
          setSelectedRegionId(null);
          setSelectedCityId(null);
          setSelectedCityName(null);
          setSearchInput("");
          setMinRating(4);
          setVerifiedOnly(false);
          setVisibleCount(9);
          setUserLocation(null);
          setLocation("/search");
        }}>
        مسح جميع الفلاتر
      </Button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background selection:bg-primary/20 selection:text-primary">
      <Header />

      {/* Sticky Search Bar */}
      <div className="sticky top-16 z-40 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="bg-card p-2 rounded-2xl shadow-sm border border-border/60 flex gap-2 transition-shadow focus-within:shadow-md duration-300">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن الخدمات، المهارات..."
                className="pr-12 h-12 bg-transparent border-none text-base focus-visible:ring-0 shadow-none"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="w-px bg-border hidden md:block my-2" />
            <div className="hidden md:block w-48 relative">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 bg-transparent border-none focus:ring-0 shadow-none px-4">
                  <SelectValue placeholder="كل التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {(categories ?? []).map((c: Category) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <Select
                value={selectedRegionId != null ? String(selectedRegionId) : "__all__"}
                onValueChange={(v) => {
                  if (v === "__all__") {
                    setSelectedRegionId(null);
                  } else {
                    setSelectedRegionId(parseInt(v, 10));
                  }
                  setSelectedCityId(null);
                  setSelectedCityName(null);
                }}
              >
                <SelectTrigger className="h-12 w-40 bg-transparent border-none focus:ring-0 shadow-none px-2">
                  <MapPin className="w-4 h-4 ml-1 text-primary shrink-0" />
                  <SelectValue placeholder="المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">كل المناطق</SelectItem>
                  {regions.map((r: Region) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRegionId ?? "all-bar"}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="w-40"
                >
                  <Select
                    value={selectedCityName ?? "__all__"}
                    onValueChange={(v) => {
                      if (v === "__all__") {
                        setSelectedCityId(null);
                        setSelectedCityName(null);
                      } else {
                        setSelectedCityName(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 bg-transparent border-none focus:ring-0 shadow-none px-2">
                      <SelectValue placeholder="المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {stickyCityOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              </AnimatePresence>
            </div>
            <Button
              type="button"
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-transform hover:scale-[1.02]"
              onClick={applyBarSearchToUrl}
            >
              بحث
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Desktop Sidebar Filter */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[140px] border border-border/50 bg-card rounded-2xl p-6 shadow-sm">
              <FilterPanel />
            </div>
          </aside>

          {/* Main Results Area */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  نتائج البحث
                  <Badge variant="secondary" className="font-normal text-sm bg-primary/10 text-primary border-none px-3 py-1">
                    {loading ? "..." : `${providers?.length ?? 0} نتيجة`}
                  </Badge>
                </h1>

                <div className="flex flex-wrap gap-2 mt-3">
                  {userLocation && (
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary flex items-center gap-1.5 px-3 py-1.5 font-medium">
                      <Navigation className="w-3.5 h-3.5" />
                      موقعك الحالي
                      <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive" onClick={() => setUserLocation(null)} />
                    </Badge>
                  )}
                  {selectedRegionId != null && (
                    <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200 flex items-center gap-1.5 px-3 py-1.5 font-medium">
                      {regions.find((r: Region) => r.id === selectedRegionId)?.nameAr ?? "منطقة"}
                      <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive" onClick={() => { setSelectedRegionId(null); setSelectedCityId(null); setSelectedCityName(null); }} />
                    </Badge>
                  )}
                  {selectedCityName && (
                    <Badge variant="outline" className="bg-background flex items-center gap-1.5 px-3 py-1.5 border-border/60 font-medium text-muted-foreground">
                      {selectedCityName}
                      <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive" onClick={() => { setSelectedCityId(null); setSelectedCityName(null); }} />
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="outline" className="bg-background flex items-center gap-1.5 px-3 py-1.5 border-border/60 font-medium text-muted-foreground">
                      {categories?.find((c: Category) => String(c.id) === selectedCategory)?.nameAr ?? "تصنيف"}
                      <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive" onClick={() => setSelectedCategory("all")} />
                    </Badge>
                  )}
                  {verifiedOnly && (
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 flex items-center gap-1.5 px-3 py-1.5 font-medium">
                      موثق فقط
                      <X className="w-3.5 h-3.5 cursor-pointer hover:text-destructive" onClick={() => setVerifiedOnly(false)} />
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden flex-1 sm:flex-none border-border/60">
                      <Filter className="w-4 h-4 ml-2" />
                      فلترة
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-6">
                    <div className="overflow-y-auto h-full pr-2 pb-10">
                      <FilterPanel />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Map toggle */}
                <Button
                  variant={showMap ? "default" : "outline"}
                  className={`gap-2 border-border/60 ${showMap ? "bg-primary text-white" : ""}`}
                  onClick={() => setShowMap(v => !v)}
                >
                  <Map className="w-4 h-4" />
                  {showMap ? "إخفاء الخريطة" : "عرض الخريطة"}
                </Button>

                <div className="hidden sm:flex items-center bg-card border border-border/60 rounded-lg p-1">
                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-md ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"}`} onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-md ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`} onClick={() => setViewMode("list")}>
                    <ListIcon className="w-4 h-4" />
                  </Button>
                </div>

                <Select defaultValue="relevant">
                  <SelectTrigger className="w-[160px] border-border/60 h-10">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevant">الأكثر صلة</SelectItem>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="popular">الأعلى تقييماً</SelectItem>
                    <SelectItem value="nearest">الأقرب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Leaflet Map View */}
            {showMap && (
              <div className="mb-6">
                <div className="h-80 md:h-96 rounded-2xl overflow-hidden border border-border/50 shadow-md">
                  <MapContainer
                    key={`${mapCenter[0]}-${mapCenter[1]}`}
                    center={mapCenter}
                    zoom={userLocation ? 12 : 6}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {userLocation && (
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                        <Popup>موقعك الحالي</Popup>
                      </Marker>
                    )}
                    {sortedProviders.filter(p => !p.isSponsored).map(p => {
                      const coords = getProviderCoords(p);
                      if (!coords) return null;
                      return (
                        <Marker key={p.id} position={coords}>
                          <Popup>
                            <div className="text-right min-w-[160px]">
                              <p className="font-bold text-sm mb-1">{p.userName}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <MapPin className="w-3 h-3" />
                                {p.city ?? "مصر"}
                                {p.district ? ` — ${p.district}` : ""}
                              </div>
                              <div className="flex items-center gap-1 text-xs mb-2">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="font-bold">{parseFloat(p.rating).toFixed(1)}</span>
                                <span className="text-gray-400">({p.reviewsCount})</span>
                              </div>
                              <button
                                className="w-full text-xs bg-teal-600 text-white rounded px-3 py-1 hover:bg-teal-700 transition-colors"
                                onClick={() => setLocation(`/provider/${p.id}`)}
                              >
                                عرض التفاصيل
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    {sortedProviders.filter(p => getProviderCoords(p) && !p.isSponsored).length} مزود على الخريطة
                  </p>
                  <Button size="sm" variant="ghost" className="text-xs gap-1.5 text-primary" onClick={handleNearMe} disabled={locationLoading}>
                    {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    حدد موقعي
                  </Button>
                </div>
              </div>
            )}

            {/* Results Grid / List */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sortedProviders.length > 0 ? (
              <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                {sortedProviders.slice(0, visibleCount).map((provider, idx) => {
                  const isSponsored = provider.isSponsored;
                  const distance = userLocation ? (() => {
                    const c = getProviderCoords(provider);
                    return c ? Math.round(haversine(userLocation.lat, userLocation.lng, c[0], c[1])) : null;
                  })() : null;

                  return (
                    <Card
                      key={`${provider.id}-${idx}`}
                      className={`overflow-hidden group border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative ${viewMode === "list" ? "flex flex-col sm:flex-row sm:min-h-[11rem]" : "flex flex-col cursor-pointer"} ${isSponsored ? "bg-amber-50/30 border-amber-200" : ""}`}
                      onClick={viewMode === "grid" ? () => setLocation(`/provider/${provider.id}`) : undefined}
                      role={viewMode === "grid" ? "link" : undefined}
                    >
                      <div
                        className={`relative overflow-hidden bg-muted ${viewMode === "list" ? "h-44 sm:h-auto sm:w-52 shrink-0 cursor-pointer" : "h-48"}`}
                        onClick={() => setLocation(`/provider/${provider.id}`)}
                      >
                        <img
                          src={provider.banner ?? provider.avatar ?? DEFAULT_IMG}
                          alt={provider.userName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                        />
                        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 max-w-[80%]">
                          {isSponsored ? (
                            <Badge className="bg-amber-500 text-white border-none shadow-sm flex items-center gap-1">
                              <ArrowUpCircle className="w-3 h-3" />
                              إعلان مدفوع
                            </Badge>
                          ) : (
                            <>
                              <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm text-[10px]">
                                {provider.categoryNameAr ?? "خدمات"}
                              </Badge>
                              {provider.featured && (
                                <Badge className="bg-amber-500 text-white border-none shadow-sm flex items-center gap-1 text-[10px]">
                                  <Crown className="w-2.5 h-2.5" />
                                  مميز
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        {distance !== null && (
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {distance < 1 ? "أقل من كم" : `${distance} كم`}
                          </div>
                        )}
                        {/* Hover boost button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (user?.role === "provider") setLocation("/dashboard/subscription");
                              else setLocation(`/login?returnTo=${encodeURIComponent("/dashboard/subscription")}`);
                            }}
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5 ml-1.5" />
                            رفع الإعلان
                          </Button>
                        </div>
                      </div>

                      <CardContent className={`p-4 flex flex-col justify-between ${viewMode === "list" ? "flex-1 py-4 gap-3" : ""}`}>
                        <div>
                          <div className="flex justify-between items-start mb-1.5 gap-2">
                            <h3
                              className="font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                              onClick={() => setLocation(`/provider/${provider.id}`)}
                            >
                              {provider.userName}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0 bg-secondary/80 px-1.5 py-0.5 rounded text-xs mt-0.5">
                              <Star className="w-3 h-3 fill-accent text-accent" />
                              <span className="font-bold">{parseFloat(provider.rating).toFixed(1)}</span>
                              <span className="text-muted-foreground">({provider.reviewsCount})</span>
                            </div>
                          </div>

                          {/* City + District — prominent */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {provider.city && (
                              <div className="flex items-center gap-1 text-xs font-medium text-primary/80 bg-primary/8 px-2 py-0.5 rounded-full border border-primary/15">
                                <MapPin className="w-3 h-3" />
                                {provider.city}
                              </div>
                            )}
                            {provider.district && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="text-border">•</span>
                                {provider.district}
                              </div>
                            )}
                            {provider.verified && (
                              <div className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                موثق
                              </div>
                            )}
                          </div>

                          <p className={`text-sm text-muted-foreground leading-relaxed ${viewMode === "list" ? "line-clamp-2" : "line-clamp-2"}`}>
                            {provider.bio ?? ""}
                          </p>
                          {formatRegisteredSinceAr(provider.createdAt) && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              على المنصة {formatRegisteredSinceAr(provider.createdAt)}
                            </p>
                          )}
                        </div>

                        {viewMode === "list" && (
                          <div className="mt-auto flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const d = digitsPhone(provider.phone);
                                  if (d) window.location.href = `tel:${d}`;
                                }}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                اتصال
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-xl text-xs gap-1 bg-[#25D366] hover:bg-[#20bd5a] text-white border-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const d = digitsPhone(provider.phone);
                                  window.open(`https://wa.me/${d || "966"}`, "_blank");
                                }}
                              >
                                واتساب
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-none rounded-xl text-xs shrink-0"
                              onClick={() => setLocation(`/provider/${provider.id}`)}
                            >
                              عرض التفاصيل
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-border/50 border-dashed rounded-3xl bg-card">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">لم نتمكن من العثور على نتائج</h3>
                <p className="text-muted-foreground max-w-md mb-8">عذراً، لم نجد أي خدمات تطابق بحثك الحالي. جرب تغيير كلمات البحث أو تخفيف الفلاتر المستخدمة.</p>
                <Button className="rounded-full h-12 px-8" onClick={() => setLocation("/")}>
                  تصفح كل الخدمات
                </Button>
              </div>
            )}

            {sortedProviders.length > visibleCount && (
              <div className="mt-12 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-12 border-border/60 hover:bg-secondary h-12 font-medium"
                  onClick={() => setVisibleCount((v) => v + 9)}
                >
                  عرض المزيد
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
