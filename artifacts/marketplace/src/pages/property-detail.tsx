import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  BedDouble, Bath, Maximize2, Building2, ArrowLeft, ArrowRight,
  MapPin, Phone, MessageCircle, Share2, Heart, CheckCircle2,
  ChevronLeft, Play, X, Calendar,
  Layers, Car, Home, TrendingUp, Eye, Clock, Loader2, Scale, ShieldCheck,
} from "lucide-react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCompare, addToCompare, removeFromCompare } from "@/lib/compare-store";
import { AdBanner } from "@/components/AdBanner";
import { NO_IMAGE_PLACEHOLDER } from "@/lib/no-image-placeholder";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_IMG = NO_IMAGE_PLACEHOLDER;

function tryJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function extractYouTubeId(url: string): string {
  if (!url) return "";
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

type PropertyView = {
  id: number;
  title: string;
  type: string;
  kind: string;
  featured: boolean;
  address: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  floors: number;
  garage: number;
  year: number;
  gallery: string[];
  videoId: string;
  lat: number;
  lng: number;
  description: string;
  amenities: string[];
  price: string;
  priceNum: number;
  agentPhone: string;
  agentWhatsapp: string;
  mainCategory: string;
  agentName: string;
  agentAvatar: string;
  agentLogo: string;
  agentCity: string;
  agentDistrict: string;
  agentMemberSince: string | null;
  providerId: number | null;
  ownerUserId: number | null;
  viewCount: number;
  createdAt: string | null;
};

function mapDbToView(p: Record<string, unknown>): PropertyView {
  const images = tryJson<string[]>(p.images as string, []);
  const features = tryJson<string[]>(p.features as string, []);
  const priceNum = parseFloat((p.price as string) ?? "0") || 0;
  const gallery = images.length > 0 ? images : [DEFAULT_IMG];

  return {
    id: p.id as number,
    title: (p.title as string) ?? "",
    type: (p.listingType as string) ?? "للبيع",
    kind: (p.mainCategory as string) ?? "شقة",
    featured: (p.featured as boolean) ?? false,
    address: (p.address as string) ?? "",
    location: (p.address as string) ?? "",
    beds: (p.rooms as number) ?? 0,
    baths: (p.bathrooms as number) ?? 0,
    area: parseFloat((p.area as string) ?? "0") || 0,
    floors: (p.totalFloors as number) ?? (p.floor as number) ?? 0,
    garage: 0,
    year: (p.buildYear as number) ?? 0,
    gallery,
    videoId: extractYouTubeId((p.videoUrl as string) ?? ""),
    lat: parseFloat((p.latitude as string) ?? "30.0444") || 30.0444,
    lng: parseFloat((p.longitude as string) ?? "31.2357") || 31.2357,
    description: (p.description as string) ?? "",
    amenities: Array.isArray(features) ? features : [],
    price: priceNum > 0 ? priceNum.toLocaleString("ar-EG") : "غير محدد",
    priceNum,
    agentPhone: (p.phone as string) ?? "",
    agentWhatsapp: (p.whatsapp as string) ?? "",
    mainCategory: (p.mainCategory as string) ?? "",
    agentName: (p.agentName as string) ?? "",
    agentAvatar: (p.agentAvatar as string) ?? "",
    agentLogo: (p.agentLogo as string) ?? "",
    agentCity: (p.agentCity as string) ?? "",
    agentDistrict: (p.agentDistrict as string) ?? "",
    agentMemberSince: (p.agentMemberSince as string) ?? null,
    providerId: (p.providerId as number) ?? null,
    ownerUserId: (p.ownerUserId as number) ?? null,
    viewCount: (p.viewCount as number) ?? 0,
    createdAt: (p.createdAt as string) ?? null,
  };
}

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(params.id ?? "0");

  const [property, setProperty] = useState<PropertyView | null>(null);
  const [similar, setSimilar] = useState<PropertyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [compareMsg, setCompareMsg] = useState<"added" | "already" | "full" | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportEmail, setReportEmail] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgContent, setMsgContent] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  const { user } = useAuth();

  const viewTracked = useRef(false);
  const { items: compareItems, isIn: isInCompare } = useCompare();

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    setActiveImg(0);
    viewTracked.current = false;
    window.scrollTo({ top: 0 });

    api.properties.get(id)
      .then((res: unknown) => {
        const d = res as { data?: Record<string, unknown>; success?: boolean };
        const raw = d?.data ?? (res as Record<string, unknown>);
        if (!raw || !raw.id) { setNotFound(true); return; }
        const mapped = mapDbToView(raw);
        setProperty(mapped);

        // Track view once per property per 24h
        if (!viewTracked.current) {
          viewTracked.current = true;

          // Save to localStorage for "recently viewed" section
          try {
            const key = "rve_ids";
            const existing: number[] = JSON.parse(localStorage.getItem(key) ?? "[]");
            const updated = [id, ...existing.filter(x => x !== id)].slice(0, 10);
            localStorage.setItem(key, JSON.stringify(updated));
          } catch {}

          // Client-side 24h cooldown — prevents redundant API calls on fast re-visits
          const cooldownKey = `pvw_${id}`;
          const lastSeen = parseInt(localStorage.getItem(cooldownKey) ?? "0", 10);
          const shouldTrack = Date.now() - lastSeen > 24 * 60 * 60 * 1000;

          if (shouldTrack) {
            // Retrieve/create a persistent session ID for this browser
            let sessionId = localStorage.getItem("re_session_id");
            if (!sessionId) {
              sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
              localStorage.setItem("re_session_id", sessionId);
            }

            fetch(`/api/properties/${id}/view`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ sessionId }),
            })
              .then(r => r.json())
              .then((json: { success?: boolean; counted?: boolean; viewCount?: number }) => {
                if (json.counted) {
                  localStorage.setItem(cooldownKey, String(Date.now()));
                }
                if (typeof json.viewCount === "number") {
                  setProperty(prev => prev ? { ...prev, viewCount: json.viewCount! } : prev);
                }
              })
              .catch(() => {});
          }
        }

        // Fetch similar
        if (mapped.mainCategory) {
          api.properties.list({ mainCategory: mapped.mainCategory, limit: 4 })
            .then((rows: unknown) => {
              const arr = (rows as Record<string, unknown>[]) ?? [];
              setSimilar(
                arr
                  .filter((r) => (r.id as number) !== id)
                  .slice(0, 3)
                  .map(mapDbToView)
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" dir="rtl">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="text-slate-500">جارٍ تحميل بيانات العقار...</p>
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" dir="rtl">
        <Building2 className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-xl font-bold text-muted-foreground">العقار غير موجود</p>
        <Button onClick={() => setLocation("/")} className="rounded-full">العودة للرئيسية</Button>
      </div>
    );
  }

  const gallery = property.gallery;

  const prevImg = () => setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
  const nextImg = () => setActiveImg((i) => (i + 1) % gallery.length);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
          <Link href="/" className="hover:text-primary transition-colors shrink-0">الرئيسية</Link>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="hover:text-primary transition-colors cursor-pointer shrink-0" onClick={() => setLocation("/")}>العقارات</span>
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="text-gray-900 font-medium truncate">{property.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ── Top action bar ── */}
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={`rounded-full text-xs font-bold px-3 py-1 ${property.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                {property.type}
              </Badge>
              <Badge variant="outline" className="rounded-full text-xs">{property.kind}</Badge>
              {property.featured && (
                <Badge className="rounded-full text-xs bg-amber-400 text-amber-900 border-none">⭐ مميز</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">{property.title}</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{property.address}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Compare button */}
            <div className="relative">
              <button
                onClick={() => {
                  const result = addToCompare({
                    id: property.id,
                    title: property.title,
                    price: property.price,
                    priceNum: property.priceNum,
                    image: property.gallery[0],
                    location: property.location,
                    beds: property.beds,
                    baths: property.baths,
                    area: property.area,
                    type: property.type,
                    kind: property.kind,
                    year: property.year,
                    finishing: "",
                  });
                  setCompareMsg(result);
                  setTimeout(() => setCompareMsg(null), 2500);
                }}
                className={`h-10 px-3 rounded-full border flex items-center gap-1.5 text-sm font-semibold transition-all ${
                  isInCompare(property.id)
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">مقارنة</span>
              </button>
              <AnimatePresence>
                {compareMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    className={`absolute top-12 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${
                      compareMsg === "added" ? "bg-primary text-white" :
                      compareMsg === "already" ? "bg-amber-500 text-white" :
                      "bg-red-500 text-white"
                    }`}
                  >
                    {compareMsg === "added" && "✓ أُضيف للمقارنة"}
                    {compareMsg === "already" && "موجود بالفعل"}
                    {compareMsg === "full" && "الحد الأقصى 4 عقارات"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setLiked(!liked)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${liked ? "bg-rose-50 border-rose-300 text-rose-500" : "bg-white border-border text-muted-foreground hover:border-rose-300 hover:text-rose-400"}`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full border border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all relative"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-full px-2 py-1 whitespace-nowrap">
                  تم النسخ!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Mosaic Hero Gallery ── */}
        <div className="relative mb-8 rounded-3xl overflow-hidden shadow-md">
          {gallery.length === 1 ? (
            /* Single image — full width */
            <div
              className="relative h-[420px] md:h-[520px] cursor-zoom-in group"
              onClick={() => { setLightboxIdx(0); setLightbox(true); }}
            >
              <img
                src={gallery[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            /* Mosaic: main large image + up to 4 thumbnails */
            <div className="grid grid-cols-2 md:grid-cols-[3fr_2fr] h-[420px] md:h-[520px] gap-1">
              {/* Main image */}
              <div
                className="relative overflow-hidden cursor-zoom-in group"
                onClick={() => { setLightboxIdx(0); setLightbox(true); }}
              >
                <img
                  src={gallery[0]}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Side grid — 2 rows × 2 cols on md+, 2 rows × 1 col on mobile */}
              <div className="grid grid-rows-2 gap-1">
                <div className="grid grid-cols-2 gap-1 hidden md:grid">
                  {[1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="relative overflow-hidden cursor-zoom-in group"
                      onClick={() => { setLightboxIdx(idx); setLightbox(true); }}
                    >
                      {gallery[idx] ? (
                        <img
                          src={gallery[idx]}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>
                  ))}
                </div>
                {/* mobile: just two stacked images */}
                {[1, 2].map((idx) => (
                  <div
                    key={`mob-${idx}`}
                    className="relative overflow-hidden cursor-zoom-in group md:hidden"
                    onClick={() => { setLightboxIdx(idx); setLightbox(true); }}
                  >
                    {gallery[idx] ? (
                      <img
                        src={gallery[idx]}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-1 hidden md:grid">
                  {[3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="relative overflow-hidden cursor-zoom-in group"
                      onClick={() => { setLightboxIdx(Math.min(idx, gallery.length - 1)); setLightbox(true); }}
                    >
                      {gallery[idx] ? (
                        <>
                          <img
                            src={gallery[idx]}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                          />
                          {/* "show all" overlay on the last visible tile */}
                          {idx === 4 && gallery.length > 5 && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 pointer-events-none">
                              <Eye className="w-6 h-6 text-white" />
                              <span className="text-white text-sm font-bold">+{gallery.length - 5} صورة</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    </div>
                  ))}
                </div>

                {/* mobile bottom row */}
                {[3, 4].map((idx) => (
                  <div
                    key={`mob2-${idx}`}
                    className="relative overflow-hidden cursor-zoom-in group md:hidden"
                    onClick={() => { setLightboxIdx(Math.min(idx, gallery.length - 1)); setLightbox(true); }}
                  >
                    {gallery[idx] ? (
                      <img
                        src={gallery[idx]}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show-all button */}
          <button
            onClick={() => { setLightboxIdx(0); setLightbox(true); }}
            className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-white/60 text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-white transition-all"
          >
            <Eye className="w-4 h-4" />
            عرض كل الصور ({gallery.length})
          </button>

          {/* Video button */}
          {property.videoId && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              مشاهدة الفيديو
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Specs */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5">مواصفات العقار</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {property.beds > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <BedDouble className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.beds}</span>
                    <span className="text-xs text-muted-foreground">غرف النوم</span>
                  </div>
                )}
                {property.baths > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <Bath className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.baths}</span>
                    <span className="text-xs text-muted-foreground">دورات المياه</span>
                  </div>
                )}
                {property.area > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <Maximize2 className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.area}</span>
                    <span className="text-xs text-muted-foreground">م² المساحة</span>
                  </div>
                )}
                {property.floors > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <Layers className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.floors}</span>
                    <span className="text-xs text-muted-foreground">الطوابق</span>
                  </div>
                )}
                {property.garage > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <Car className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.garage}</span>
                    <span className="text-xs text-muted-foreground">مواقف السيارات</span>
                  </div>
                )}
                {property.year > 0 && (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 border border-border">
                    <Calendar className="w-6 h-6 text-primary" />
                    <span className="text-xl font-extrabold text-gray-900">{property.year}</span>
                    <span className="text-xs text-muted-foreground">سنة البناء</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">وصف العقار</h2>
                <p className="text-gray-600 leading-relaxed text-base">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-5">المرافق والمزايا</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {property.videoId && (
              <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
                <div className="p-5 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">جولة افتراضية بالفيديو</h2>
                </div>
                <div className="relative aspect-video bg-gray-900">
                  <iframe
                    src={`https://www.youtube.com/embed/${property.videoId}?autoplay=0&rel=0`}
                    title="جولة العقار"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Map */}
            <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">الموقع على الخريطة</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{property.address}</p>
                </div>
              </div>
              <div className="h-72 md:h-96">
                <MapContainer
                  center={[property.lat, property.lng]}
                  zoom={14}
                  className="h-full w-full"
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[property.lat, property.lng]}>
                    <Popup>
                      <div className="text-right min-w-[160px] font-sans" dir="rtl">
                        <p className="font-bold text-sm mb-1">{property.title}</p>
                        <p className="text-xs text-gray-500">{property.location}</p>
                        <p className="text-xs font-bold text-gray-900 mt-1">{property.price} ج.م</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* ── Agent Info Card (TOP) ── */}
            {(property.agentName || property.agentCity) && (
              <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                {/* Header strip */}
                <div className="bg-gradient-to-l from-teal-600 to-teal-500 px-5 pt-5 pb-10 relative">
                  <p className="text-white/80 text-xs font-medium mb-0.5">صاحب الإعلان</p>
                  <p className="text-white font-extrabold text-lg leading-tight truncate">
                    {property.agentName || "المعلن"}
                  </p>
                </div>

                {/* Avatar — overlapping the header */}
                <div className="px-5 pb-5">
                  <div className="flex items-end justify-between -mt-8 mb-4">
                    <div className="relative shrink-0">
                      {(property.agentAvatar || property.agentLogo) ? (
                        <img
                          src={property.agentAvatar || property.agentLogo}
                          alt={property.agentName}
                          className="w-16 h-16 rounded-2xl object-cover border-3 border-white shadow-md"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(property.agentName)}&background=0d9488&color=fff&size=64`;
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl font-extrabold text-teal-600 border-2 border-white">
                          {property.agentName ? property.agentName.charAt(0) : "م"}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-white bg-gray-400" title="غير متصل" />
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                      المستخدم غير متصل
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {property.agentMemberSince && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>عضو منذ:{" "}
                          <span className="font-semibold text-gray-800">
                            {(() => {
                              const months = Math.max(1, Math.round((Date.now() - new Date(property.agentMemberSince).getTime()) / (1000 * 60 * 60 * 24 * 30)));
                              return months < 12 ? `${months} شهر` : `${Math.round(months / 12)} سنة`;
                            })()}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>نوع الحساب: <span className="font-semibold text-gray-800">قطاع الأعمال</span></span>
                    </div>
                    {(property.agentCity || property.agentDistrict) && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="font-semibold text-gray-800">
                          {[property.agentCity, property.agentDistrict].filter(Boolean).join(" ـ ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {property.providerId && (
                    <a
                      href={`/advertiser/${property.providerId}`}
                      onClick={(e) => { e.preventDefault(); setLocation(`/advertiser/${property.providerId}`); }}
                      className="flex items-center justify-between w-full border border-primary/30 text-primary text-sm font-bold rounded-xl px-4 py-2.5 hover:bg-primary/5 transition-colors"
                    >
                      <span>شاهد كل إعلاناتي</span>
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Price Card ── */}
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-1">السعر</p>
                <p className="text-3xl font-extrabold text-gray-900">{property.price}</p>
                <p className="text-sm text-muted-foreground mt-0.5">جنيه مصري</p>
                {property.area > 0 && property.priceNum > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 bg-gray-50 rounded-xl px-3 py-2 inline-block">
                    ≈ {Math.round(property.priceNum / property.area).toLocaleString("ar-EG")} ج.م / م²
                  </p>
                )}
              </div>

              <div className="space-y-2 mb-6 text-sm">
                {[
                  { icon: Home, label: "نوع العقار", value: property.kind },
                  { icon: MapPin, label: "الموقع", value: property.location },
                  { icon: TrendingUp, label: "الحالة", value: property.type },
                  { icon: Eye, label: "المشاهدات", value: `${(property.viewCount ?? 0).toLocaleString("ar-EG")} مشاهدة` },
                  { icon: Clock, label: "تاريخ النشر", value: property.createdAt ? new Date(property.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-gray-900 mr-auto truncate">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Phone reveal row — full row is clickable */}
              {property.agentPhone && (
                <button
                  onClick={() => {
                    if (!phoneRevealed) {
                      setPhoneRevealed(true);
                      api.propertyStats.phoneClick(id).catch(() => {});
                    } else {
                      window.location.href = `tel:${property.agentPhone}`;
                    }
                  }}
                  className="w-full flex items-center gap-3 mb-3 bg-gray-50 hover:bg-primary/5 rounded-2xl px-4 py-3 border border-gray-200 hover:border-primary/40 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
                    {phoneRevealed
                      ? <Phone className="w-4 h-4 text-primary" />
                      : <Eye className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 text-right">
                    {phoneRevealed ? (
                      <span dir="ltr" className="block font-mono text-base font-bold tracking-widest text-gray-900">{property.agentPhone}</span>
                    ) : (
                      <>
                        <span className="block text-xs text-muted-foreground mb-0.5">اضغط لإظهار رقم التليفون</span>
                        <span dir="ltr" className="block font-mono text-sm font-bold tracking-widest text-gray-500">{property.agentPhone.slice(0, 3) + " *** *** ***"}</span>
                      </>
                    )}
                  </div>
                  {phoneRevealed && <span className="text-xs text-primary font-semibold">اتصل الآن</span>}
                </button>
              )}

              {property.agentWhatsapp && (
                <Button variant="outline" className="w-full rounded-2xl h-12 text-base font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50" asChild>
                  <a href={`https://wa.me/${property.agentWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 ml-2" />
                    واتساب
                  </a>
                </Button>
              )}
              {/* Message button - show when logged in and not owner */}
              {user && property.ownerUserId && user.id !== property.ownerUserId && (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl h-12 text-base font-bold border-primary text-primary hover:bg-primary/5"
                  onClick={() => { setMsgOpen(true); setMsgSent(false); setMsgContent(""); }}
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  راسل صاحب الإعلان
                </Button>
              )}
              {!property.agentPhone && !property.agentWhatsapp && (
                <Button className="w-full rounded-2xl h-12 text-base font-bold mb-3 shadow-md shadow-primary/20">
                  <Phone className="w-4 h-4 ml-2" />
                  تواصل مع المعلن
                </Button>
              )}
            </div>

            {/* Safety Tips Card */}
            <div className="bg-white rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-base font-extrabold text-gray-900">سلامتك تهمنا</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700 text-right list-none">
                {[
                  "قابل السمسار أو المالك في مكان معروف وآمن داخل بنها",
                  "يُفضَّل يكون معاك شخص موثوق وقت المعاينة",
                  "عاين العقار على الطبيعة وتأكد من حالته ومطابقته للإعلان",
                  "اسأل عن كل التفاصيل: السعر، المرافق، الأوراق، والمصاريف",
                  "متدفعش أي عربون أو تحوّل فلوس غير بعد المعاينة والتأكد من المستندات",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div
                className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-red-500 cursor-pointer hover:text-red-600 transition-colors justify-end"
                onClick={() => { setReportDone(false); setReportEmail(""); setReportMessage(""); setReportOpen(true); }}
              >
                <span className="text-sm font-semibold">الإبلاغ عن إساءة</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>

            {/* ── AD: property sidebar ── */}
            <AdBanner position="property_sidebar" className="mt-0" />

          </div>
        </div>

        {/* ── AD: property bottom ── */}
        <div className="mt-10">
          <AdBanner position="property_bottom" />
        </div>

        {/* Similar Properties */}
        {similar.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">عقارات مشابهة</h2>
              <button onClick={() => setLocation("/")} className="text-sm text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                عرض الكل <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similar.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => setLocation(`/property/${p.id}`)}
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={p.gallery[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${p.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>{p.type}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-900 font-extrabold text-lg">{p.price} <span className="text-xs text-muted-foreground font-normal">ج.م</span></p>
                    <h3 className="font-bold text-gray-900 mt-1 mb-1 truncate group-hover:text-primary transition-colors">{p.title}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
                      <MapPin className="w-3 h-3 text-primary" />
                      {p.location}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {p.beds > 0 && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{p.beds}</span>}
                      {p.baths > 0 && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.baths}</span>}
                      {p.area > 0 && <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" />{p.area} م²</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
              <X className="w-5 h-5" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i - 1 + gallery.length) % gallery.length); }}
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            <motion.img
              key={lightboxIdx}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={gallery[lightboxIdx]}
              alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
            />
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i + 1) % gallery.length); }}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === lightboxIdx ? "bg-white w-6" : "bg-white/40"}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video modal */}
      <AnimatePresence>
        {showVideo && property.videoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
            <div className="w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
              <iframe
                src={`https://www.youtube.com/embed/${property.videoId}?autoplay=1&rel=0`}
                title="فيديو العقار"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>


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
                      <img src={item.image} alt="" className="w-7 h-7 rounded-lg object-cover" />
                      <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">{item.title}</span>
                      <button onClick={() => removeFromCompare(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setLocation("/compare")}
                  disabled={compareItems.length < 2}
                  className="rounded-xl"
                >
                  قارن الآن
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RealEstateFooter />

      {/* ── Report Modal ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              الإبلاغ عن إساءة
            </DialogTitle>
          </DialogHeader>

          {reportDone ? (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-bold text-gray-800 text-lg">تم إرسال البلاغ</p>
              <p className="text-sm text-gray-500">شكراً لك، سيتم مراجعة البلاغ من قِبل الإدارة في أقرب وقت.</p>
              <Button className="mt-2 rounded-xl" onClick={() => setReportOpen(false)}>إغلاق</Button>
            </div>
          ) : (
            <form
              className="space-y-4 pt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reportEmail.trim() || !reportMessage.trim()) return;
                setReportSending(true);
                try {
                  const res = await fetch("/api/property-reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ propertyId: property?.id ?? id, email: reportEmail.trim(), message: reportMessage.trim() }),
                  });
                  if (res.ok) {
                    setReportDone(true);
                  }
                } finally {
                  setReportSending(false);
                }
              }}
            >
              <p className="text-sm text-gray-600">إذا وجدت محتوى مسيء أو مخالف، أخبرنا بالتفاصيل وسنتخذ الإجراء اللازم.</p>
              <div className="space-y-1.5">
                <Label htmlFor="report-email">بريدك الإلكتروني</Label>
                <Input
                  id="report-email"
                  type="email"
                  placeholder="example@email.com"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-msg">تفاصيل البلاغ</Label>
                <Textarea
                  id="report-msg"
                  placeholder="اكتب هنا سبب الإبلاغ بالتفصيل..."
                  rows={4}
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
                  disabled={reportSending || !reportEmail.trim() || !reportMessage.trim()}
                >
                  {reportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال البلاغ"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReportOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Message Modal ── */}
      <Dialog open={msgOpen} onOpenChange={(o) => { if (!o) { setMsgOpen(false); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <MessageCircle className="w-5 h-5 shrink-0" />
              راسل صاحب الإعلان
            </DialogTitle>
          </DialogHeader>

          {msgSent ? (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-bold text-gray-800 text-lg">تم إرسال الرسالة</p>
              <p className="text-sm text-muted-foreground">يمكنك متابعة المحادثة من صفحة رسائلك</p>
              <div className="flex gap-2 mt-2">
                <Button className="rounded-xl" asChild>
                  <a href="/user/inbox">الذهاب للرسائل</a>
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setMsgOpen(false)}>إغلاق</Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4 pt-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!msgContent.trim() || !property?.ownerUserId) return;
                setMsgSending(true);
                try {
                  await api.messages.send(property.ownerUserId, msgContent.trim(), property.id);
                  setMsgSent(true);
                } catch {
                  alert("حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى");
                } finally {
                  setMsgSending(false);
                }
              }}
            >
              {property && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/15 mb-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 shrink-0">
                    {property.gallery[0]
                      ? <img src={property.gallery[0]} className="w-full h-full object-cover" alt="" />
                      : <Home className="w-5 h-5 text-primary/40 m-auto mt-2.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{property.title}</p>
                    <p className="text-xs text-primary font-semibold">
                      {property.priceNum > 0 ? `${property.priceNum.toLocaleString("ar-EG")} ج.م` : "السعر غير محدد"}
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="msg-content">رسالتك</Label>
                <Textarea
                  id="msg-content"
                  placeholder="اكتب رسالتك لصاحب الإعلان..."
                  rows={4}
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={msgSending || !msgContent.trim()}
                >
                  {msgSending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <MessageCircle className="w-4 h-4 ml-2" />}
                  إرسال الرسالة
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setMsgOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
