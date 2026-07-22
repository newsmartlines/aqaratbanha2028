import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PropertyTooltip } from "@/components/PropertyTooltip";
import { useCompare, addToCompare } from "@/lib/compare-store";
import { PropertyImageGallery } from "@/components/property-image-gallery";
import { Button } from "@/components/ui/button";
import {
  Loader2, Building2, MapPin, BedDouble, Bath, Maximize2,
  ArrowLeft, Heart, Eye, Clock, Crown, GitCompare, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ${Math.floor(diff / 86400) === 1 ? "يوم" : "أيام"}`;
  return `منذ ${Math.floor(diff / 2592000)} شهر`;
}

function formatPrice(price: number | string | null | undefined, listType?: string): string {
  const n = Number(price);
  if (!price || isNaN(n) || n === 0) return "السعر عند الاتصال";
  return `${n.toLocaleString("en-US")} ج.م${listType === "rent" ? "/شهر" : ""}`;
}

// Fallback tabs used only when no categories are passed from the API
const FALLBACK_TABS = [
  { key: "residential", label: "سكني",    mainCat: "residential" },
  { key: "commercial",  label: "تجاري",   mainCat: "commercial"  },
  { key: "land",        label: "أراضي",   mainCat: "land"        },
];

const COLUMNS_CLASS: Record<string, string> = {
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  "5": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  "6": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

interface CategoryTab {
  key: string;
  label: string;
  mainCat: string;
}

interface Props {
  settings?: Record<string, string>;
  categories?: Array<{ id: number; nameAr: string; slug: string; propertyCount?: number }>;
}

/* ── Hover Mini-Card ──────────────────────────────────────────────────────── */
function HoverCard({ property, visible, onNavigate }: {
  property: any;
  visible: boolean;
  onNavigate: () => void;
}) {
  const imgs: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
  const thumb = imgs[0] ?? DEFAULT_IMG;
  const location = [property.district, property.city].filter(Boolean).join("، ") || "بنها";
  const listType = property.listingType ?? "";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-border/60 overflow-hidden pointer-events-none"
          style={{ minWidth: 220 }}
        >
          {/* Image */}
          <div className="relative h-32 overflow-hidden">
            <img
              src={thumb}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              listType === "rent" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
            }`}>
              {listType === "rent" ? "للإيجار" : "للبيع"}
            </span>
            {property.featured && (
              <span className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" /> مميز
              </span>
            )}
          </div>
          {/* Details */}
          <div className="p-3" dir="rtl">
            <p className="font-bold text-gray-900 text-xs leading-snug line-clamp-1 mb-1">
              {property.title}
            </p>
            <p dir="ltr" className="text-primary font-extrabold text-base leading-none mb-2">
              {formatPrice(property.price, listType)}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-gray-600 mb-2">
              {(property.rooms ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  <BedDouble className="w-3 h-3" /> {property.rooms} غرف
                </span>
              )}
              {(property.bathrooms ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bath className="w-3 h-3" /> {property.bathrooms}
                </span>
              )}
              {(property.area ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  <Maximize2 className="w-3 h-3" /> {Number(property.area).toLocaleString("ar-EG")} م²
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-3">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-primary font-semibold">
              <ExternalLink className="w-3 h-3" />
              اضغط لعرض التفاصيل الكاملة
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export function FeaturedPropertiesSection({ settings, categories }: Props) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isIn: isInCompare } = useCompare();

  const [activeTab, setActiveTab] = useState("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build filter tabs dynamically from real DB categories; fall back to static list
  const filterTabs: CategoryTab[] = useMemo(() => {
    const source = categories && categories.length > 0 ? categories : FALLBACK_TABS;
    return source.map(c => ({
      key: (c as any).key ?? (c as any).slug,
      label: (c as any).label ?? (c as any).nameAr,
      mainCat: (c as any).key ?? (c as any).slug,
    }));
  }, [categories]);

  const sectionTitle    = settings?.featuredSectionTitle    ?? "اكتشف أفضل العقارات في بنها";
  const sectionSubtitle = settings?.featuredSectionSubtitle ?? "استعرض أحدث العقارات السكنية والتجارية وأفضل الفرص الاستثمارية في مدينة بنها.";
  const countSetting    = settings?.featuredSectionCount    ?? "8";
  const customCount     = parseInt(settings?.featuredSectionCustomCount ?? "12", 10);
  const columnsSetting  = settings?.featuredSectionColumns  ?? "3";
  const sortSetting     = settings?.featuredSectionSort     ?? "newest";

  let adminSelectedTypes: string[] = [];
  try {
    const raw = settings?.featuredSectionTypes;
    if (raw) adminSelectedTypes = JSON.parse(raw);
  } catch { /* */ }
  if (!adminSelectedTypes.length) adminSelectedTypes = ["all"];

  const displayCount = countSetting === "custom" ? customCount : parseInt(countSetting, 10) || 8;
  const columnsClass = COLUMNS_CLASS[columnsSetting] ?? COLUMNS_CLASS["3"];

  const { data: allProps = [], isLoading: propsLoading } = useQuery<any[]>({
    queryKey: ["featured-section-properties"],
    queryFn: () => api.properties.list({}),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
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

  const toggleFavMut = useMutation({
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

  const poolByAdminTypes = useMemo(() => {
    if (adminSelectedTypes.includes("all")) return allProps;
    return allProps.filter((p: any) => {
      for (const t of adminSelectedTypes) {
        if (t === "residential" && p.mainCategory === "residential") return true;
        if (t === "commercial"  && p.mainCategory === "commercial")  return true;
        if (t === "land"        && p.mainCategory === "land")        return true;
        if (t === "luxury"      && p.featured)                       return true;
        if (t === "apartment"   && p.subCategory === "apartment")    return true;
        if (t === "villa"       && p.subCategory === "villa")        return true;
        if (t === "duplex"      && p.subCategory === "duplex")       return true;
        if (t === "office"      && p.subCategory === "office")       return true;
        if (t === "shop"        && p.subCategory === "shop")         return true;
      }
      return false;
    });
  }, [allProps, adminSelectedTypes]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return poolByAdminTypes;
    const tab = filterTabs.find(t => t.key === activeTab);
    if (!tab) return poolByAdminTypes;
    return poolByAdminTypes.filter((p: any) => p.mainCategory === tab.mainCat);
  }, [poolByAdminTypes, activeTab, filterTabs]);

  const sorted = useMemo(() => {
    const arr = [...filteredByTab];
    if (sortSetting === "price_high") return arr.sort((a: any, b: any) => Number(b.price) - Number(a.price));
    if (sortSetting === "price_low")  return arr.sort((a: any, b: any) => Number(a.price) - Number(b.price));
    if (sortSetting === "most_viewed") return arr.sort((a: any, b: any) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    if (sortSetting === "featured")   return arr.sort((a: any, b: any) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return arr.sort((a: any, b: any) =>
      new Date(b.approvedAt ?? b.createdAt ?? 0).getTime() - new Date(a.approvedAt ?? a.createdAt ?? 0).getTime()
    );
  }, [filteredByTab, sortSetting]);

  const displayed = sorted.slice(0, displayCount);

  const hasTabCount = (tabKey: string) => {
    if (tabKey === "all") return poolByAdminTypes.length;
    const tab = filterTabs.find(t => t.key === tabKey);
    if (!tab) return 0;
    return poolByAdminTypes.filter((p: any) => p.mainCategory === tab.mainCat).length;
  };

  const handleMouseEnter = (id: number) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoveredId(id), 180);
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoveredId(null), 120);
  };

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">

        {/* ── Header ── */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Building2 className="w-4 h-4" />
              العقارات المميزة
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {sectionTitle.includes("بنها") ? (
                <>
                  {sectionTitle.split("بنها")[0]}
                  <span className="text-primary">بنها</span>
                  {sectionTitle.split("بنها")[1]}
                </>
              ) : sectionTitle}
            </h2>
            <p className="text-muted-foreground mt-3 text-base max-w-lg">{sectionSubtitle}</p>
          </div>
          <button
            onClick={() => setLocation("/properties")}
            className="hidden md:flex items-center gap-2 text-sm text-primary font-semibold border border-primary/30 rounded-full px-5 py-2.5 hover:bg-primary/10 transition-all group"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ── Filter Tabs — dynamic from real DB categories ── */}
        <div className="flex gap-2 flex-wrap mb-8">
          {/* "الكل" tab */}
          {(() => {
            const allCount = hasTabCount("all");
            return (
              <button
                onClick={() => setActiveTab("all")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeTab === "all"
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                }`}
              >
                الكل
                {allCount > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{allCount}</span>
                )}
              </button>
            );
          })()}
          {/* Category tabs — from real DB */}
          {filterTabs.map(tab => {
            const count = hasTabCount(tab.key);
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {tab.label}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Grid ── */}
        {propsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">لا توجد عقارات في هذا التصنيف حالياً</p>
          </div>
        ) : (
          <div className={`grid ${columnsClass} gap-5`}>
            {displayed.map((property: any, idx: number) => {
              const imgs: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
              const location = [property.district, property.city].filter(Boolean).join("، ") || "بنها";
              const listType = property.listingType ?? "";
              const isFav = homeFavIds.includes(property.id);
              const isFeatured = !!property.featured;
              const isHovered = hoveredId === property.id;

              return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="relative"
                >
                  <div
                    className={`group bg-white border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? "border-primary/40 -translate-y-0.5"
                        : "border-border/70 hover:border-primary/30"
                    }`}
                    onMouseEnter={() => setHoveredId(property.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setLocation(`/property/${property.id}`)}
                  >
                    {/* ── Image ── */}
                    <div className="relative">
                      <PropertyImageGallery
                        images={imgs}
                        alt={property.title}
                        fallback={DEFAULT_IMG}
                        className="h-52"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent pointer-events-none" />

                        {/* Listing type badge */}
                        <div className="absolute top-3 right-3 z-20">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md ${
                            listType === "rent" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                          }`}>
                            {listType === "rent" ? "للإيجار" : "للبيع"}
                          </span>
                        </div>

                        {/* Premium "مميز" badge — Modern pill at bottom-left */}
                        {isFeatured && (
                          <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg tracking-wide"
                              style={{
                                background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)",
                                color: "#fff",
                                boxShadow: "0 4px 14px rgba(245,158,11,0.55), 0 1px 3px rgba(0,0,0,0.25)",
                                textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                border: "1.5px solid rgba(255,255,255,0.35)",
                              }}
                            >
                              <Crown className="w-3.5 h-3.5 shrink-0 drop-shadow" />
                              مميز
                            </span>
                          </div>
                        )}

                        {/* Fav button */}
                        <button
                          className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                            isFav ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500 hover:border-rose-400"
                          }`}
                          onClick={e => { e.stopPropagation(); toggleFavMut.mutate({ id: property.id, add: !isFav }); }}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-white" : ""}`} />
                        </button>
                      </PropertyImageGallery>
                    </div>

                    {/* ── Content ── */}
                    <div className="p-4">

                      {/* Price — clean, bold, black */}
                      <div className="mb-2">
                        <span dir="ltr" className="block text-black font-black text-xl leading-tight tracking-tight">
                          {formatPrice(property.price, listType)}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-1">
                        {property.title}
                      </h3>

                      <div className="flex items-center gap-1 text-gray-700 text-xs mb-3">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>

                      {/* Specs */}
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        {(property.rooms ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-gray-700 text-xs">
                            <BedDouble className="w-3 h-3" /> {property.rooms} غرف
                          </span>
                        )}
                        {(property.bathrooms ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-gray-700 text-xs">
                            <Bath className="w-3 h-3" /> {property.bathrooms} حمام
                          </span>
                        )}
                        {(property.area ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-gray-700 text-xs">
                            <Maximize2 className="w-3 h-3" /> {Number(property.area).toLocaleString("ar-EG")} م²
                          </span>
                        )}
                      </div>

                      <div className="border-t border-border/50 pt-3 flex items-center justify-between text-[11px] text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {timeAgo(property.createdAt) || "—"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-semibold">
                            <Eye className="w-3 h-3 shrink-0" />
                            {(property.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدات
                          </span>
                          <button
                            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
                              isInCompare(property.id)
                                ? "bg-primary text-white border-primary"
                                : "border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary"
                            }`}
                            onClick={e => {
                              e.stopPropagation();
                              const imgs2: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
                              const r = addToCompare({
                                id: property.id,
                                title: property.title,
                                price: property.price?.toString() ?? "",
                                priceNum: Number(property.price),
                                image: imgs2[0] ?? "",
                                location: [property.district, property.city].filter(Boolean).join("، ") || "بنها",
                                beds: property.rooms ?? 0,
                                baths: property.bathrooms ?? 0,
                                area: property.area ?? 0,
                                type: property.listingType ?? "",
                                kind: property.propertyType ?? "",
                                year: property.yearBuilt ?? 0,
                                finishing: "",
                              });
                              if (r === "added") toast.success("أُضيف للمقارنة ✓");
                              else if (r === "already") toast("موجود بالفعل في المقارنة");
                              else if (r === "type_mismatch") toast.error("لا يمكن مقارنة بيع مع إيجار");
                              else toast.error("المقارنة ممتلئة (٤ عقارات)");
                            }}
                            title="قارن"
                          >
                            <GitCompare className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Show all ── */}
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-10 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setLocation("/properties")}
          >
            عرض جميع العقارات
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
