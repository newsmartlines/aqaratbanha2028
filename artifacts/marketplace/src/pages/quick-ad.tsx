import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  ImagePlus, X, Loader2, CheckCircle2, Zap,
  ChevronLeft, Upload, Building2, Sparkles,
  PenLine, RefreshCw, LogIn, UserPlus, Check,
  MapPin, Phone, MessageCircle, Home, Star,
  Navigation, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { extractPropertyInfo, type ExtractedData } from "@/lib/property-extractor";

/* ─── Geocoding via Nominatim (OpenStreetMap, no API key) ────────────────── */
interface GeoResult { lat: number; lon: number; displayName: string; }

async function geocode(query: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + " مصر")}&limit=1&countrycodes=eg&accept-language=ar`;
    const res = await fetch(url, { headers: { "Accept-Language": "ar" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
  } catch { return null; }
}

/* ─── Guest screen ─────────────────────────────────────────────────────────  */
function GuestScreen() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto shadow-lg shadow-teal-200">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">إعلان سريع</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            الصق وصف عقارك كما تكتبه على فيسبوك —<br />
            والذكاء الاصطناعي يستخرج كل البيانات تلقائياً
          </p>
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-3">
            <Link href="/login?returnTo=/quick-ad">
              <Button className="w-full h-12 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </Button>
            </Link>
            <Link href="/register?returnTo=/quick-ad">
              <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-base border-teal-200 text-teal-700 hover:bg-teal-50 gap-2">
                <UserPlus className="w-4 h-4" /> إنشاء حساب مجاني
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}

/* ─── Image tile ─────────────────────────────────────────────────────────── */
function ImageTile({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md">
      <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      <button type="button" onClick={onRemove}
        className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Title variant card ─────────────────────────────────────────────────── */
const VARIANT_LABELS  = ["الأسلوب الأول", "الأسلوب الثاني", "الأسلوب الثالث"] as const;
const VARIANT_COLORS  = [
  "border-teal-300 bg-teal-50 ring-teal-400",
  "border-cyan-300 bg-cyan-50 ring-cyan-400",
  "border-indigo-200 bg-indigo-50 ring-indigo-400",
] as const;
const VARIANT_BADGE   = [
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
] as const;

function TitleCard({ label, text, selected, onClick, colorClass, badgeClass }: {
  label: string; text: string; selected: boolean;
  onClick: () => void; colorClass: string; badgeClass: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-right px-4 py-3 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3 group ${
        selected ? `${colorClass} ring-2 ring-offset-1 shadow-sm` : "border-border bg-white hover:border-teal-200 hover:shadow-sm"
      }`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? "border-teal-500 bg-teal-500" : "border-gray-300 group-hover:border-teal-300"
      }`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${badgeClass}`}>{label}</span>
        <p className="text-sm font-semibold text-gray-800 leading-snug">{text}</p>
      </div>
    </button>
  );
}

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function Section({ icon, title, color = "teal", children }: {
  icon: React.ReactNode; title: string; color?: "teal" | "blue" | "purple" | "amber" | "green";
  children: React.ReactNode;
}) {
  const colors = {
    teal:   "bg-teal-50  border-teal-100  text-teal-700",
    blue:   "bg-blue-50  border-blue-100  text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    amber:  "bg-amber-50 border-amber-100 text-amber-700",
    green:  "bg-green-50 border-green-100 text-green-700",
  };
  const header = {
    teal:   "text-teal-700",
    blue:   "text-blue-700",
    purple: "text-purple-700",
    amber:  "text-amber-700",
    green:  "text-green-700",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3.5 space-y-2.5 ${colors[color]}`}>
      <p className={`text-xs font-bold flex items-center gap-1.5 ${header[color]}`}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

/* ─── Info pill ──────────────────────────────────────────────────────────── */
function Pill({ icon, label, value, highlight, large }: {
  icon?: React.ReactNode; label?: string; value: string;
  highlight?: "urgent" | "negotiable" | "owner" | "whatsapp"; large?: boolean;
}) {
  const variants = {
    urgent:     "bg-red-50    border-red-200    text-red-700",
    negotiable: "bg-amber-50  border-amber-200  text-amber-700",
    owner:      "bg-green-50  border-green-200  text-green-700",
    whatsapp:   "bg-emerald-50 border-emerald-200 text-emerald-700",
    default:    "bg-white      border-gray-200   text-gray-700",
  };
  const cls = highlight ? variants[highlight] : variants.default;
  return (
    <span className={`inline-flex items-center gap-1.5 border font-medium rounded-full ${large ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1"} ${cls}`}>
      {icon && <span className="opacity-70">{icon}</span>}
      {label && <span className="opacity-50 text-[10px]">{label}</span>}
      {value}
    </span>
  );
}

/* ─── Location confidence badge ──────────────────────────────────────────── */
function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" | null }) {
  if (!confidence) return null;
  const cfg = {
    high:   { cls: "bg-green-100 text-green-700",  label: "موقع محدد بدقة" },
    medium: { cls: "bg-amber-100 text-amber-700",  label: "موقع تقريبي" },
    low:    { cls: "bg-red-100   text-red-700",    label: "تحقق من الموقع" },
  }[confidence];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

/* ─── OSM Map embed ──────────────────────────────────────────────────────── */
function MapEmbed({ lat, lon }: { lat: number; lon: number }) {
  const delta = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&layer=mapnik&marker=${lat},${lon}`;
  return (
    <div className="rounded-xl overflow-hidden border border-white shadow-sm mt-2">
      <iframe
        title="map"
        src={src}
        width="100%"
        height="180"
        style={{ border: 0, display: "block" }}
        loading="lazy"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-[11px] text-blue-600 hover:underline py-1.5 bg-white"
      >
        <Navigation className="w-3 h-3" /> افتح في الخريطة
      </a>
    </div>
  );
}

/* ─── Main form ──────────────────────────────────────────────────────────── */
function QuickAdForm() {
  const [, setLocation]                     = useLocation();
  const [images, setImages]                 = useState<string[]>([]);
  const [description, setDescription]       = useState("");
  const [listingType, setListingType]       = useState<"sale" | "rent">("sale");
  const [uploading, setUploading]           = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const [done, setDone]                     = useState(false);
  const [extracted, setExtracted]           = useState<ExtractedData | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<0 | 1 | 2>(0);
  const [title, setTitle]                   = useState("");
  const [titleEdited, setTitleEdited]       = useState(false);
  const [geoResult, setGeoResult]           = useState<GeoResult | null>(null);
  const [geocoding, setGeocoding]           = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  /* ── Extraction on description change ──── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description.trim().length < 8) {
      setExtracted(null); setGeoResult(null);
      if (!titleEdited) setTitle("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      const result = extractPropertyInfo(description);
      setExtracted(result);
      if (result.listingType === "sale" || result.listingType === "rent") setListingType(result.listingType);
      if (!titleEdited && result.titleVariants[0]) setTitle(result.titleVariants[selectedVariant]);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [description, titleEdited]);

  /* ── Geocode when we get a location ──── */
  useEffect(() => {
    if (geoRef.current) clearTimeout(geoRef.current);
    const query = extracted?.location ?? extracted?.compound ?? "";
    if (!query) { setGeoResult(null); return; }
    geoRef.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocode(query);
      setGeoResult(result);
      setGeocoding(false);
    }, 1000);
    return () => { if (geoRef.current) clearTimeout(geoRef.current); };
  }, [extracted?.location, extracted?.compound]);

  const pickVariant = (idx: 0 | 1 | 2) => {
    setSelectedVariant(idx);
    if (extracted?.titleVariants[idx]) { setTitle(extracted.titleVariants[idx]); setTitleEdited(false); }
  };

  /* ── Upload ──── */
  const uploadFile = async (file: File) => {
    try {
      const result = await api.upload.propertyImage(file);
      setImages(prev => [...prev, result.url]);
    } catch { toast.error("فشل رفع الصورة، حاول مرة أخرى"); }
  };
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const allowed = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 10 - images.length);
    if (!allowed.length) return;
    setUploading(true);
    await Promise.all(allowed.map(uploadFile));
    setUploading(false);
  }, [images.length]);

  /* ── Submit ──── */
  const submit = useMutation({
    mutationFn: () => {
      const ex = extracted;
      const floorVal = ex?.floor === "ground" ? 0 : typeof ex?.floor === "number" ? ex.floor : undefined;
      const furnishedVal = ex?.furnished === true ? "مفروش" : ex?.furnished === false ? "غير مفروش" : undefined;
      const effectiveLocation = (ex?.location ?? manualLocation) || undefined;

      return api.fetchJson("/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: (title || description).trim().slice(0, 200),
          description: description.trim(),
          mainCategory: ex?.propertyCategory ?? "residential",
          listingType,
          images,
          ...(ex?.area         != null ? { area:        String(ex.area)  } : {}),
          ...(ex?.price        != null ? { price:       String(ex.price) } : {}),
          ...(ex?.rooms        != null ? { rooms:       ex.rooms         } : {}),
          ...(ex?.bathrooms    != null ? { bathrooms:   ex.bathrooms     } : {}),
          ...(floorVal         != null ? { floor:       floorVal         } : {}),
          ...(ex?.finishing        ? { finishing:    ex.finishing      } : {}),
          ...(furnishedVal         ? { furnished:    furnishedVal      } : {}),
          ...(ex?.direction        ? { direction:    ex.direction      } : {}),
          ...(effectiveLocation    ? { district:     effectiveLocation  } : {}),
          ...(ex?.compound         ? { compound:     ex.compound       } : {}),
          ...(ex?.street           ? { street:       ex.street         } : {}),
          ...(ex?.propertyTypeAr   ? { subCategory:  ex.propertyTypeAr } : {}),
          ...(ex?.phone            ? { phone:        ex.phone          } : {}),
          ...(ex?.whatsapp         ? { whatsapp:     ex.whatsapp       } : {}),
          ...(ex?.allPhones?.length ? { allPhones:   ex.allPhones      } : {}),
          ...(ex?.features?.length ? { features:     ex.features       } : {}),
          ...(ex?.nearbyLandmarks?.length ? { nearbyLandmarks: ex.nearbyLandmarks } : {}),
          ...(ex?.urgent       ? { urgent:       true              } : {}),
          ...(ex?.negotiable   ? { negotiable:   true              } : {}),
          ...(ex?.ownerDirect  ? { advertiserType: "owner"         } : {}),
          ...(geoResult?.lat   != null ? { latitude:  String(geoResult.lat) } : {}),
          ...(geoResult?.lon   != null ? { longitude: String(geoResult.lon) } : {}),
          locationConfidence: ex?.locationConfidence ?? undefined,
          extractedJson: ex ? JSON.stringify(ex) : undefined,
        }),
      });
    },
    onSuccess: () => setDone(true),
    onError: (e: any) => toast.error(e?.message ?? "حدث خطأ، حاول مجدداً"),
  });

  /* ── Success ──── */
  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold">تم إرسال إعلانك! 🎉</h2>
          <p className="text-muted-foreground text-sm">سيُراجع ويُنشر بعد الموافقة. ستصلك إشعار عند النشر.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setLocation("/dashboard/properties")}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6 font-semibold transition-colors">
              <Building2 className="w-4 h-4" /> عقاراتي
            </button>
            <button onClick={() => {
              setDone(false); setImages([]); setDescription(""); setTitle("");
              setTitleEdited(false); setExtracted(null); setSelectedVariant(0);
              setGeoResult(null); setManualLocation("");
            }}
              className="flex items-center justify-center gap-2 border border-border bg-white hover:bg-secondary/40 rounded-xl h-11 px-6 font-semibold transition-colors">
              إضافة إعلان آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ex = extracted;
  const canSubmit = description.trim().length >= 10 && !submit.isPending && !uploading;
  const needsLocation = ex && !ex.location && !manualLocation;

  const hasBasic    = ex && (ex.propertyTypeAr || ex.price || ex.area || ex.listingType);
  const hasLocation = ex && (ex.location || ex.governorate || ex.compound || ex.street || ex.nearbyLandmarks.length > 0 || geoResult);
  const hasDetails  = ex && (ex.rooms || ex.bathrooms || ex.floor != null || ex.finishing || ex.furnished != null || ex.direction);
  const hasFeatures = ex && ex.features.length > 0;
  const hasContact  = ex && (ex.allPhones.length > 0 || ex.whatsapp || ex.urgent || ex.negotiable || ex.ownerDirect);
  const hasVariants = ex && ex.titleVariants.some(v => v.trim().length > 0);

  const visibleFeatures = showAllFeatures ? (ex?.features ?? []) : (ex?.features ?? []).slice(0, 8);

  return (
    <div className="max-w-xl mx-auto px-4 py-8" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/add-property">
          <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 items-center justify-center shadow-sm shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </span>
            إعلان سريع
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">الصق وصفك — الذكاء الاصطناعي يكمل الباقي</p>
        </div>
      </div>

      <div className="space-y-5">

        {/* Listing type toggle */}
        <div className="flex rounded-2xl overflow-hidden border border-border shadow-sm bg-white">
          {(["sale", "rent"] as const).map(t => (
            <button key={t} type="button" onClick={() => setListingType(t)}
              className={`flex-1 py-3 text-sm font-bold transition-all duration-200 ${
                listingType === t ? "bg-teal-600 text-white shadow-inner" : "text-muted-foreground hover:bg-gray-50"
              }`}>
              {t === "sale" ? "🏷️ للبيع" : "🔑 للإيجار"}
            </button>
          ))}
        </div>

        {/* Image upload */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            الصور <span className="text-xs font-normal text-muted-foreground mr-1.5">(حتى 10 صور)</span>
          </label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
              dragOver ? "border-teal-500 bg-teal-50 scale-[1.01]"
              : images.length === 0 ? "border-gray-200 bg-gray-50 hover:border-teal-400 hover:bg-teal-50/30"
              : "border-gray-200 bg-white hover:border-teal-300"
            } ${images.length === 0 ? "py-14" : "py-5"}`}
          >
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            )}
            {images.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-100 flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-teal-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">اسحب الصور هنا</p>
                  <p className="text-xs text-muted-foreground mt-0.5">أو اضغط لاختيار الصور من جهازك</p>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors">
                  <Upload className="w-3.5 h-3.5" /> اختر صوراً
                </span>
              </div>
            ) : (
              <div className="px-4 space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((url, i) => (
                    <ImageTile key={i} url={url} onRemove={() => setImages(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                  {images.length < 10 && (
                    <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-teal-400 bg-gray-50 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer">
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span className="text-[10px] text-muted-foreground font-medium">إضافة</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">{images.length} / 10 صورة</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            وصف الإعلان <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`اكتب وصف طبيعي مثلاً:\n"شقة للبيع ١٢٠ متر ٣ غرف وحمامين دور ثاني في سيدي بشر بسعر ١.٢ مليون تشطيب سوبر لوكس مصعد وجراج واتساب 01200000000"`}
            rows={5}
            maxLength={2000}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {description.length > 0 && description.length < 10
                ? <span className="text-red-500">أضف على الأقل ١٠ أحرف</span>
                : "اكتب بشكل طبيعي — المحرك يستخرج البيانات تلقائياً"}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">{description.length}/2000</span>
          </div>
        </div>

        {/* ── AI Analysis ─────────────────────────────────────────────────── */}
        {ex && (hasBasic || hasLocation || hasDetails || hasFeatures || hasContact) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-bold text-foreground">تحليل الإعلان</span>
              <span className="text-[10px] font-medium bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">مُستخرج تلقائياً</span>
            </div>

            {/* Section 1 — Basic Info */}
            {hasBasic && (
              <Section icon={<Home className="w-3.5 h-3.5" />} title="المعلومات الأساسية" color="teal">
                <div className="flex flex-wrap gap-1.5">
                  {ex.propertyTypeAr && <Pill label="نوع" value={ex.propertyTypeAr} />}
                  {ex.listingType && (
                    <Pill value={ex.listingType === "sale" ? "للبيع" : ex.listingType === "rent" ? "للإيجار" : "للاستثمار"} />
                  )}
                  {ex.price != null && (
                    <Pill label="السعر" value={
                      ex.price >= 1_000_000
                        ? `${(ex.price / 1_000_000 % 1 === 0 ? ex.price / 1_000_000 : (ex.price / 1_000_000).toFixed(1))} مليون ج.م`
                        : ex.price >= 1_000 ? `${Math.round(ex.price / 1_000)} ألف ج.م`
                        : `${ex.price} ج.م`
                    } />
                  )}
                  {ex.area != null && <Pill label="المساحة" value={`${ex.area} م²`} />}
                  {ex.finishing && <Pill label="تشطيب" value={ex.finishing} />}
                  {ex.furnished != null && <Pill value={ex.furnished ? "مفروشة" : "غير مفروشة"} />}
                </div>
              </Section>
            )}

            {/* Section 2 — Location */}
            {(hasLocation || ex.locationConfidence === null) && (
              <Section icon={<MapPin className="w-3.5 h-3.5" />} title="الموقع" color="blue">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {ex.governorate && <Pill label="المحافظة" value={ex.governorate} />}
                    {ex.location && (
                      <>
                        <Pill label="المنطقة" value={ex.location} />
                        <ConfidenceBadge confidence={ex.locationConfidence} />
                      </>
                    )}
                    {ex.compound && <Pill label="كمبوند" value={ex.compound} />}
                    {ex.street && <Pill label="" value={ex.street} />}
                    {geocoding && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-500">
                        <Loader2 className="w-3 h-3 animate-spin" /> جارٍ تحديد الموقع…
                      </span>
                    )}
                  </div>

                  {/* Nearby landmarks */}
                  {ex.nearbyLandmarks.length > 0 && (
                    <div>
                      <p className="text-[10px] text-blue-500 font-semibold mb-1">معالم قريبة</p>
                      <div className="flex flex-wrap gap-1">
                        {ex.nearbyLandmarks.map((lm, i) => (
                          <span key={i} className="text-xs bg-white border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{lm}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map */}
                  {geoResult && <MapEmbed lat={geoResult.lat} lon={geoResult.lon} />}

                  {/* Manual location input if nothing found */}
                  {!ex.location && !ex.compound && !geocoding && (
                    <div className="mt-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> لم يُكتشف الموقع — حدده يدوياً لتحسين نتائج البحث
                      </div>
                      <input
                        type="text"
                        value={manualLocation}
                        onChange={e => setManualLocation(e.target.value)}
                        placeholder="اكتب اسم المنطقة أو الحي…"
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-400 transition-all"
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Section 3 — Property Details */}
            {hasDetails && (
              <Section icon={<Star className="w-3.5 h-3.5" />} title="تفاصيل العقار" color="purple">
                <div className="flex flex-wrap gap-1.5">
                  {ex.rooms     != null && <Pill label="غرف"     value={String(ex.rooms)} />}
                  {ex.bathrooms != null && <Pill label="حمامات"  value={String(ex.bathrooms)} />}
                  {ex.floor     != null && (
                    <Pill label="الدور" value={
                      ex.floor === "ground" ? "أرضي" : ex.floor === "last" ? "أخير" : `الدور ${ex.floor}`
                    } />
                  )}
                  {ex.direction && <Pill label="الاتجاه" value={ex.direction} />}
                </div>
              </Section>
            )}

            {/* Section 4 — Features */}
            {hasFeatures && (
              <Section icon={<CheckCircle2 className="w-3.5 h-3.5" />} title="المميزات والمرافق" color="green">
                <div className="flex flex-wrap gap-1.5">
                  {visibleFeatures.map(f => <Pill key={f} value={f} />)}
                </div>
                {ex.features.length > 8 && (
                  <button type="button"
                    onClick={() => setShowAllFeatures(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-green-600 font-medium hover:underline mt-0.5">
                    {showAllFeatures
                      ? <><ChevronUp className="w-3 h-3" /> عرض أقل</>
                      : <><ChevronDown className="w-3 h-3" /> +{ex.features.length - 8} ميزة أخرى</>
                    }
                  </button>
                )}
              </Section>
            )}

            {/* Section 5 — Contact */}
            {hasContact && (
              <Section icon={<Phone className="w-3.5 h-3.5" />} title="معلومات التواصل" color="amber">
                <div className="flex flex-wrap gap-1.5">
                  {ex.allPhones.map((p, i) => (
                    <Pill key={i} icon={<Phone className="w-3 h-3" />} value={p} large />
                  ))}
                  {ex.whatsapp && (
                    <Pill icon={<MessageCircle className="w-3 h-3" />} value={ex.whatsapp} highlight="whatsapp" large />
                  )}
                  {ex.urgent      && <Pill value="⚡ عاجل"            highlight="urgent"     large />}
                  {ex.negotiable  && <Pill value="💬 قابل للتفاوض"   highlight="negotiable" large />}
                  {ex.ownerDirect && <Pill value="🔑 مالك مباشر"     highlight="owner"      large />}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── Location missing warning ─────────────────────────────── */}
        {needsLocation && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-semibold">الموقع غير محدد</p>
              <p className="text-xs mt-0.5">أضف اسم المنطقة في الوصف أو اكتبه في حقل الموقع أعلاه ليظهر في نتائج البحث</p>
            </div>
          </div>
        )}

        {/* ── Title variants ───────────────────────────────────────── */}
        {hasVariants && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-500" />
              اختر عنوان إعلانك
              <span className="text-[10px] font-medium bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">مُولَّد تلقائياً</span>
            </p>
            <div className="space-y-2">
              {(ex!.titleVariants as [string, string, string]).map((v, idx) => {
                if (!v.trim()) return null;
                return (
                  <TitleCard key={idx}
                    label={VARIANT_LABELS[idx]} text={v}
                    selected={selectedVariant === idx && !titleEdited}
                    onClick={() => pickVariant(idx as 0 | 1 | 2)}
                    colorClass={VARIANT_COLORS[idx]} badgeClass={VARIANT_BADGE[idx]}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Editable title ───────────────────────────────────────── */}
        {(title || description.trim().length >= 10) && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
              <PenLine className="w-4 h-4 text-gray-400" />
              أو عدّل العنوان يدوياً
              {titleEdited && <span className="text-[10px] font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">معدّل يدوياً</span>}
            </label>
            <div className="relative">
              <input type="text" value={title}
                onChange={e => { setTitle(e.target.value); setTitleEdited(true); }}
                placeholder="عنوان الإعلان…"
                maxLength={200}
                className="w-full rounded-2xl border border-border bg-white ps-4 pe-10 py-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              />
              {titleEdited && extracted?.titleVariants[selectedVariant] && (
                <button type="button" title="استعادة العنوان المُختار"
                  onClick={() => { setTitle(extracted.titleVariants[selectedVariant]); setTitleEdited(false); }}
                  className="absolute top-1/2 left-3 -translate-y-1/2 w-6 h-6 rounded-full text-muted-foreground hover:text-teal-600 transition-colors flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────── */}
        <button type="button" onClick={() => submit.mutate()} disabled={!canSubmit}
          className="w-full h-14 rounded-2xl bg-gradient-to-l from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all duration-200 active:scale-[0.98]">
          {submit.isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال…</>
            : <><Zap className="w-5 h-5" /> أرسل الإعلان الآن</>
          }
        </button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          سيُراجع إعلانك من قبل الفريق وينشر بعد الموافقة
        </p>
      </div>
    </div>
  );
}

/* ─── Page wrapper ───────────────────────────────────────────────────────── */
export default function QuickAdPage() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
    </div>
  );
  if (!user) return <GuestScreen />;
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <QuickAdForm />
      <RealEstateFooter />
    </div>
  );
}
