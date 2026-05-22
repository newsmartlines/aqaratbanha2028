import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { Upload, X, GripVertical, Loader2, Check, ChevronLeft, ChevronRight, Navigation, Play } from "lucide-react";
import toast from "react-hot-toast";
import { api, type Region, type Package } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Fix leaflet default marker
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BANHA_LAT = 30.468;
const BANHA_LNG = 31.183;
const DRAFT_KEY = "re_onboarding_v4_draft";
const TOTAL_STEPS = 3;

const MAIN_TYPES = [
  { id: "residential", label: "سكني", sub: "شقق · فيلات · دوبلكس · استوديو" },
  { id: "commercial",  label: "تجاري", sub: "محلات · مكاتب · عيادات · مطاعم" },
  { id: "land",        label: "أراضي", sub: "سكنية · تجارية · زراعية · صناعية" },
];

const SUB_TYPES: Record<string, string[]> = {
  residential: ["شقة", "فيلا", "دوبلكس", "بنتهاوس", "تاون هاوس", "توين هاوس", "استوديو", "شاليه"],
  commercial:  ["محل تجاري", "مكتب", "عيادة", "مطعم", "كافيه", "مخزن", "مصنع"],
  land:        ["أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية"],
};

const LISTING_TYPES = [
  { id: "sale", label: "للبيع" },
  { id: "rent", label: "للإيجار" },
];

const FINISHING   = ["سوبر لوكس", "لوكس", "عادي", "بدون تشطيب", "تشطيب جزئي"];
const CONDITIONS  = ["جديد", "ممتاز", "جيد جداً", "جيد", "يحتاج تجديد"];
const FURNISHED   = ["مفروش بالكامل", "مفروش جزئياً", "غير مفروش"];
const DIRECTIONS  = ["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"];
const PAY_METHODS = ["دفعة واحدة", "أقساط شهرية", "أقساط سنوية", "قابل للتفاوض"];

const FEATURES = [
  "مسبح", "جراج مغطى", "حديقة خاصة", "مصعد", "شرفة", "مكيف مركزي",
  "أمن 24 ساعة", "غرفة خادمة", "غرفة سائق", "مستودع", "بوابة ذكية",
  "نظام منزل ذكي", "مطبخ مجهز", "غرفة غسيل", "طاقة شمسية", "موقف خاص",
  "صالة رياضية", "ملعب", "مسجد",
];

const NEARBY = [
  "مدارس", "مستشفيات", "مراكز تجارية", "مساجد", "مطاعم", "صيدليات",
  "بنوك", "حدائق عامة", "محطات وقود", "مواصلات عامة", "نوادي رياضية", "سوبر ماركت",
];

const PAYMENT_OPS = [
  { id: "card",     label: "بطاقة بنكية" },
  { id: "wallet",   label: "محفظة إلكترونية" },
  { id: "transfer", label: "تحويل بنكي" },
  { id: "cash",     label: "كاش" },
];

interface Draft {
  mainType: string; listingType: string; subType: string;
  regionId: number | null; cityId: number | null; cityName: string | null;
  address: string; lat: string; lng: string;
  title: string; desc: string; price: string; area: string;
  rooms: string; bathrooms: string; floor: string; totalFloors: string;
  buildYear: string; finishing: string; condition: string;
  furnished: string; direction: string; payMethod: string;
  features: string[]; nearby: string[];
  images: string[]; mainImg: number; videoUrl: string;
  plan: number | null; paymentMethod: string;
}

const defaults: Draft = {
  mainType: "", listingType: "", subType: "",
  regionId: null, cityId: null, cityName: null,
  address: "", lat: "", lng: "",
  title: "", desc: "", price: "", area: "",
  rooms: "", bathrooms: "", floor: "", totalFloors: "",
  buildYear: "", finishing: "", condition: "",
  furnished: "", direction: "", payMethod: "",
  features: [], nearby: [],
  images: [], mainImg: 0, videoUrl: "",
  plan: null, paymentMethod: "card",
};

function loadDraft(): Draft {
  try { const r = localStorage.getItem(DRAFT_KEY); if (r) return { ...defaults, ...JSON.parse(r) }; } catch {}
  return { ...defaults };
}

/* ─── Leaflet click handler ─── */
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/* ─── Step indicator ─── */
function Steps({ step }: { step: number }) {
  const labels = ["تفاصيل العقار", "الباقة", "الدفع والنشر"];
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-6 py-0">
        <div className="flex">
          {labels.map((l, i) => {
            const n = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={i} className={`flex-1 py-4 text-center border-b-2 transition-colors text-sm font-semibold
                ${active ? "border-teal-600 text-teal-700" : done ? "border-gray-300 text-gray-500" : "border-transparent text-gray-400"}`}>
                <span className={`inline-flex items-center gap-2`}>
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold
                    ${active ? "bg-teal-600 text-white" : done ? "bg-gray-300 text-gray-600" : "bg-gray-100 text-gray-400"}`}>
                    {done ? "✓" : n}
                  </span>
                  <span className="hidden sm:inline">{l}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Field label ─── */
function FLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-semibold text-gray-700 mb-2">
      {children}{required && <span className="text-red-500 mr-1">*</span>}
    </p>
  );
}

/* ─── Section ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-base font-bold text-gray-900 mb-6 pb-3 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

/* ─── Chip selector ─── */
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
        ${selected
          ? "bg-teal-600 text-white border-teal-600"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
      {label}
    </button>
  );
}

/* ─── Num input ─── */
function NumInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <FLabel>{label}</FLabel>
      <Input inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder ?? "0"} className="h-11 border-gray-200 rounded-lg" dir="ltr" />
    </div>
  );
}

export default function RealEstateOnboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user, refetch: refetchAuth, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [mapPos, setMapPos] = useState<[number, number] | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const imgFilesRef = useRef<File[]>([]);
  const [draft, setDraft] = useState<Draft>(loadDraft);

  const { data: pkgs = [] } = useQuery<Package[]>({ queryKey: ["packages"], queryFn: api.packages.list, staleTime: 5 * 60_000 });
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: api.regions.list, staleTime: 5 * 60_000 });

  const upd = useCallback((p: Partial<Draft>) => {
    setDraft(prev => { const n = { ...prev, ...p }; try { localStorage.setItem(DRAFT_KEY, JSON.stringify(n)); } catch {} return n; });
  }, []);

  // Init map position from draft
  useEffect(() => {
    if (draft.lat && draft.lng) setMapPos([parseFloat(draft.lat), parseFloat(draft.lng)]);
  }, []);

  const provRef = useRef(false);
  useEffect(() => {
    if (!user || user.role === "admin" || provRef.current) return;
    provRef.current = true;
    api.auth.becomeProvider().then(me => setUser(me as any)).catch(() => { provRef.current = false; });
  }, [user?.id, setUser]);

  if (!user) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-gray-700">يجب تسجيل الدخول أولاً</p>
          <Button onClick={() => setLocation("/login?returnTo=/real-estate-onboarding")}>تسجيل الدخول</Button>
        </div>
      </div>
    </div>
  );

  const selRegion = (regions as Region[]).find(r => r.id === draft.regionId);
  const cities    = selRegion?.cities ?? [];
  const isLand    = draft.mainType === "land";
  const isRes     = draft.mainType === "residential";
  const isCom     = draft.mainType === "commercial";
  const sorted    = [...pkgs].sort((a, b) => a.priorityRank - b.priorityRank);

  /* ── Map pick ── */
  const onMapPick = (lat: number, lng: number) => {
    setMapPos([lat, lng]);
    upd({ lat: lat.toFixed(7), lng: lng.toFixed(7) });
  };

  const getGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { onMapPick(p.coords.latitude, p.coords.longitude); toast.success("تم تحديد موقعك"); },
      () => toast.error("تعذر الوصول إلى الموقع"),
    );
  };

  /* ── Validate ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.mainType)     e.mainType    = "مطلوب";
    if (!draft.listingType)  e.listingType = "مطلوب";
    if (!draft.subType)      e.subType     = "مطلوب";
    if (!draft.regionId)     e.region      = "المنطقة مطلوبة";
    if (!draft.cityId)       e.city        = "المدينة مطلوبة";
    if (!draft.title.trim()) e.title       = "مطلوب";
    if (!draft.price.trim()) e.price       = "مطلوب";
    if (!draft.area.trim())  e.area        = "مطلوب";
    if (draft.images.length === 0) e.images = "أضف صورة واحدة على الأقل";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = document.getElementById(`f-${Object.keys(e)[0]}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (step === 1 ? validate() : true) setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  /* ── Images ── */
  const addFiles = (files: File[]) => {
    const rem = 20 - draft.images.length;
    const add = files.filter(f => f.type.startsWith("image/")).slice(0, rem);
    if (!add.length) return;
    imgFilesRef.current = [...imgFilesRef.current, ...add];
    upd({ images: [...draft.images, ...add.map(f => URL.createObjectURL(f))] });
  };
  const rmImg = (i: number) => {
    imgFilesRef.current = imgFilesRef.current.filter((_, j) => j !== i);
    const imgs = draft.images.filter((_, j) => j !== i);
    upd({ images: imgs, mainImg: Math.min(draft.mainImg, Math.max(0, imgs.length - 1)) });
  };
  const onDragStart = (e: DragEvent<HTMLDivElement>, i: number) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = (e: DragEvent<HTMLDivElement>, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const onDrop      = (e: DragEvent<HTMLDivElement>, to: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setDragOverIdx(null); return; }
    const imgs  = [...draft.images]; const files = [...imgFilesRef.current];
    const [img] = imgs.splice(dragIdx, 1); const [file] = files.splice(dragIdx, 1);
    imgs.splice(to, 0, img); files.splice(to, 0, file);
    imgFilesRef.current = files;
    let m = draft.mainImg;
    if (m === dragIdx) m = to; else if (dragIdx < m && to >= m) m--; else if (dragIdx > m && to <= m) m++;
    upd({ images: imgs, mainImg: m });
    setDragIdx(null); setDragOverIdx(null);
  };

  const tog = (key: "features" | "nearby", v: string) =>
    upd({ [key]: draft[key].includes(v) ? draft[key].filter(x => x !== v) : [...draft[key], v] });

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true); setProgress(0);
    try {
      let pid = user.providerId;
      if (!pid) { const me = await api.auth.becomeProvider(); pid = (me as any).providerId; if (pid) setUser(me as any); }
      if (!pid) { toast.error("خطأ في بيانات المعلن"); return; }

      const uploaded: string[] = [];
      for (let i = 0; i < imgFilesRef.current.length; i++) {
        try { const r = await api.upload.propertyImage(imgFilesRef.current[i]); uploaded.push(r.url); } catch {}
        setProgress(Math.round(((i + 1) / Math.max(1, imgFilesRef.current.length)) * 70));
      }

      await api.properties.create({
        providerId: pid, title: draft.title, description: draft.desc || undefined,
        mainCategory: draft.mainType, listingType: draft.listingType, subCategory: draft.subType || undefined,
        price: draft.price || undefined, area: draft.area || undefined,
        rooms: draft.rooms ? +draft.rooms : undefined, bathrooms: draft.bathrooms ? +draft.bathrooms : undefined,
        floor: draft.floor ? +draft.floor : undefined, totalFloors: draft.totalFloors ? +draft.totalFloors : undefined,
        buildYear: draft.buildYear ? +draft.buildYear : undefined,
        finishing: draft.finishing || undefined, condition: draft.condition || undefined,
        furnished: draft.furnished || undefined, direction: draft.direction || undefined,
        paymentMethod: draft.payMethod || undefined,
        address: draft.address || undefined, regionId: draft.regionId ?? undefined,
        cityId: draft.cityId ?? undefined,
        latitude: draft.lat || undefined, longitude: draft.lng || undefined,
        images: uploaded, videoUrl: draft.videoUrl || undefined,
        features: draft.features, nearbyServices: draft.nearby, mainImageIdx: draft.mainImg,
      });

      setProgress(90);
      if (draft.plan !== null) { try { await api.subscriptions.subscribe(pid, draft.plan); } catch {} }
      setProgress(100);
      await refetchAuth();
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success("تم نشر عقارك بنجاح!");
      setStep(99);
    } catch (e: any) { toast.error(e?.message ?? "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  /* ══════════════════════════════════════════════════
      SUCCESS
  ══════════════════════════════════════════════════ */
  if (step === 99) return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تم نشر إعلانك بنجاح</h1>
            <p className="text-gray-500 text-sm">سيتم مراجعة إعلانك خلال ساعات قليلة وتفعيله.</p>
          </div>
          <div className="space-y-3">
            <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-lg font-bold" onClick={() => setLocation("/dashboard")}>
              لوحة التحكم
            </Button>
            <button className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
              onClick={() => { setStep(1); setDraft({ ...defaults }); imgFilesRef.current = []; }}>
              نشر إعلان آخر
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 1 — تفاصيل العقار (صفحة طويلة)
  ══════════════════════════════════════════════════ */
  const step1 = (
    <div className="space-y-10">

      {/* نوع العقار */}
      <Section title="نوع العقار">
        <div id="f-mainType" className="grid grid-cols-3 gap-3 mb-6">
          {MAIN_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => upd({ mainType: t.id, subType: "" })}
              className={`p-4 rounded-xl border-2 text-center transition-all
                ${draft.mainType === t.id ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <p className={`font-bold text-base mb-1 ${draft.mainType === t.id ? "text-teal-700" : "text-gray-800"}`}>{t.label}</p>
              <p className="text-xs text-gray-400 leading-snug">{t.sub}</p>
            </button>
          ))}
        </div>
        {errors.mainType && <p className="text-xs text-red-500 -mt-4 mb-4">{errors.mainType}</p>}

        {draft.mainType && (
          <div className="animate-in fade-in duration-200">
            <FLabel required>نوع الصفقة</FLabel>
            <div id="f-listingType" className="flex gap-3 mb-1">
              {LISTING_TYPES.map(lt => (
                <button key={lt.id} type="button" onClick={() => upd({ listingType: lt.id })}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all
                    ${draft.listingType === lt.id ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                  {lt.label}
                </button>
              ))}
            </div>
            {errors.listingType && <p className="text-xs text-red-500 mt-1">{errors.listingType}</p>}
          </div>
        )}

        {draft.mainType && draft.listingType && (
          <div className="animate-in fade-in duration-200 mt-6">
            <FLabel required>النوع التفصيلي</FLabel>
            <div id="f-subType" className="flex flex-wrap gap-2">
              {(SUB_TYPES[draft.mainType] ?? []).map(s => (
                <Chip key={s} label={s} selected={draft.subType === s} onClick={() => upd({ subType: s })} />
              ))}
            </div>
            {errors.subType && <p className="text-xs text-red-500 mt-2">{errors.subType}</p>}
          </div>
        )}
      </Section>

      {/* الموقع */}
      <Section title="الموقع">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div id="f-region">
            <FLabel required>المنطقة</FLabel>
            <Select value={draft.regionId ? String(draft.regionId) : "__"}
              onValueChange={v => { if (v === "__") { upd({ regionId: null, cityId: null, cityName: null }); return; } upd({ regionId: +v, cityId: null, cityName: null }); }}>
              <SelectTrigger className={`h-11 rounded-lg border-gray-200 ${errors.region ? "border-red-400" : ""}`}>
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__">اختر المنطقة</SelectItem>
                {(regions as Region[]).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.region && <p className="text-xs text-red-500 mt-1">{errors.region}</p>}
          </div>

          <div id="f-city">
            <FLabel required>المدينة</FLabel>
            {!draft.regionId ? (
              <div className="h-11 flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm">اختر المنطقة أولاً</div>
            ) : (
              <Select value={draft.cityId ? String(draft.cityId) : "__"}
                onValueChange={v => { if (v === "__") { upd({ cityId: null, cityName: null }); return; } const c = (cities as any[]).find(x => x.id === +v); upd({ cityId: +v, cityName: c?.nameAr ?? null }); }}>
                <SelectTrigger className={`h-11 rounded-lg border-gray-200 ${errors.city ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">اختر المدينة</SelectItem>
                  {(cities as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
        </div>

        <div className="mb-4">
          <FLabel>العنوان</FLabel>
          <Input value={draft.address} onChange={e => upd({ address: e.target.value })}
            placeholder="مثال: شارع جمال عبد الناصر، أمام المجمع التجاري"
            className="h-11 rounded-lg border-gray-200" />
        </div>

        {/* Leaflet map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <FLabel>تحديد الموقع على الخريطة</FLabel>
            <button type="button" onClick={getGPS}
              className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700">
              <Navigation className="w-3.5 h-3.5" />
              موقعي الحالي
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200 h-64">
            <MapContainer
              center={mapPos ?? [BANHA_LAT, BANHA_LNG]}
              zoom={mapPos ? 15 : 12}
              className="h-full w-full"
              key={mapPos ? "placed" : "default"}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onPick={onMapPick} />
              {mapPos && <Marker position={mapPos} />}
            </MapContainer>
          </div>
          {mapPos && (
            <p className="text-xs text-gray-400 mt-1.5" dir="ltr">
              {mapPos[0].toFixed(6)}, {mapPos[1].toFixed(6)}
              <button className="mr-3 text-red-400 hover:text-red-500" onClick={() => { setMapPos(null); upd({ lat: "", lng: "" }); }}>مسح</button>
            </p>
          )}
          {!mapPos && <p className="text-xs text-gray-400 mt-1.5">اضغط على الخريطة لتحديد موقع العقار</p>}
        </div>
      </Section>

      {/* تفاصيل الإعلان */}
      <Section title="تفاصيل الإعلان">
        <div className="space-y-4">
          <div id="f-title">
            <FLabel required>عنوان الإعلان</FLabel>
            <Input value={draft.title}
              onChange={e => { upd({ title: e.target.value }); setErrors(p => ({ ...p, title: "" })); }}
              placeholder={`مثال: ${draft.subType || "شقة"} ${draft.listingType === "sale" ? "للبيع" : "للإيجار"}${draft.cityName ? " في " + draft.cityName : ""}`}
              className={`h-12 rounded-lg text-base ${errors.title ? "border-red-400" : "border-gray-200"}`} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <FLabel>وصف العقار</FLabel>
            <Textarea value={draft.desc} onChange={e => upd({ desc: e.target.value })}
              placeholder="صف العقار بالتفصيل — الموقع، المميزات، حالة العقار..."
              className="resize-none h-32 rounded-lg border-gray-200" maxLength={2000} />
            <p className="text-xs text-gray-400 mt-1 text-left" dir="ltr">{draft.desc.length}/2000</p>
          </div>
        </div>
      </Section>

      {/* المواصفات */}
      <Section title="المواصفات">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div id="f-price" className="col-span-1">
            <FLabel required>السعر (جنيه)</FLabel>
            <Input inputMode="numeric" value={draft.price}
              onChange={e => { upd({ price: e.target.value.replace(/\D/g, "") }); setErrors(p => ({ ...p, price: "" })); }}
              placeholder="850,000" className={`h-11 rounded-lg font-mono ${errors.price ? "border-red-400" : "border-gray-200"}`} dir="ltr" />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div id="f-area" className="col-span-1">
            <FLabel required>المساحة (م²)</FLabel>
            <Input inputMode="numeric" value={draft.area}
              onChange={e => { upd({ area: e.target.value.replace(/\D/g, "") }); setErrors(p => ({ ...p, area: "" })); }}
              placeholder="120" className={`h-11 rounded-lg font-mono ${errors.area ? "border-red-400" : "border-gray-200"}`} dir="ltr" />
            {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
          </div>

          {isRes && <NumInput label="غرف النوم" value={draft.rooms} onChange={v => upd({ rooms: v })} placeholder="3" />}
          {(isRes || isCom) && <NumInput label="الحمامات" value={draft.bathrooms} onChange={v => upd({ bathrooms: v })} placeholder="2" />}
          {!isLand && <NumInput label="رقم الدور" value={draft.floor} onChange={v => upd({ floor: v })} placeholder="3" />}
          {!isLand && <NumInput label="إجمالي الأدوار" value={draft.totalFloors} onChange={v => upd({ totalFloors: v })} placeholder="10" />}
          <NumInput label="سنة البناء" value={draft.buildYear} onChange={v => upd({ buildYear: v.slice(0, 4) })} placeholder="2022" />
        </div>
      </Section>

      {/* التفاصيل الإضافية */}
      {!isLand && (
        <Section title="التفاصيل الإضافية">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { k: "finishing", label: "التشطيب", opts: FINISHING },
              { k: "condition", label: "الحالة", opts: CONDITIONS },
              ...(isRes ? [{ k: "furnished", label: "الأثاث", opts: FURNISHED }] : []),
              { k: "direction", label: "اتجاه الواجهة", opts: DIRECTIONS },
              { k: "payMethod", label: "نظام الدفع", opts: PAY_METHODS },
            ].map(({ k, label, opts }) => (
              <div key={k}>
                <FLabel>{label}</FLabel>
                <Select value={(draft as any)[k] || "__"} onValueChange={v => upd({ [k]: v === "__" ? "" : v } as any)}>
                  <SelectTrigger className="h-11 rounded-lg border-gray-200"><SelectValue placeholder={label} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">— {label} —</SelectItem>
                    {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* المميزات */}
      {!isLand && (
        <Section title="مميزات العقار">
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(f => <Chip key={f} label={f} selected={draft.features.includes(f)} onClick={() => tog("features", f)} />)}
          </div>
        </Section>
      )}

      {/* الخدمات القريبة */}
      <Section title="الخدمات القريبة">
        <div className="flex flex-wrap gap-2">
          {NEARBY.map(n => <Chip key={n} label={n} selected={draft.nearby.includes(n)} onClick={() => tog("nearby", n)} />)}
        </div>
      </Section>

      {/* الصور */}
      <Section title="صور العقار">
        <p className="text-sm text-gray-500 mb-4">الصور الجيدة تزيد فرص البيع بنسبة كبيرة — يمكنك إضافة حتى 20 صورة</p>

        <div id="f-images"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => fileRef.current?.click()}
          className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors py-12 flex flex-col items-center gap-3
            ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}>
          <input ref={fileRef} type="file" className="hidden" multiple accept="image/*"
            onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm font-semibold text-gray-600">{dragOver ? "أفلت الصور هنا" : "اسحب الصور أو اضغط لاختيارها"}</p>
          <p className="text-xs text-gray-400">JPG · PNG · WEBP — حتى 5MB لكل صورة</p>
          {draft.images.length > 0 && <span className="text-xs font-bold text-teal-600">{draft.images.length}/20 صورة</span>}
        </div>

        {errors.images && <p className="text-xs text-red-500 mt-2">{errors.images}</p>}

        {draft.images.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">اسحب لإعادة الترتيب — اضغط "رئيسية" لتعيين صورة الغلاف</p>
              <button type="button" onClick={() => { upd({ images: [], mainImg: 0 }); imgFilesRef.current = []; }}
                className="text-xs text-red-500 hover:text-red-600 font-semibold">حذف الكل</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {draft.images.map((src, i) => (
                <div key={i} draggable
                  onDragStart={e => onDragStart(e, i)} onDragOver={e => onDragOver(e, i)}
                  onDrop={e => onDrop(e, i)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab group transition-all
                    ${i === draft.mainImg ? "border-teal-500" : "border-gray-200"}
                    ${dragOverIdx === i && dragIdx !== i ? "scale-105 border-teal-400" : ""}
                    ${dragIdx === i ? "opacity-40" : ""}`}>
                  <img src={src} className="w-full h-full object-cover" />
                  {i === draft.mainImg && <div className="absolute top-1 right-1 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">غلاف</div>}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                    {i !== draft.mainImg && (
                      <button type="button" onClick={() => upd({ mainImg: i })} className="text-[10px] bg-white text-gray-700 rounded px-2 py-0.5 font-semibold w-full text-center">رئيسية</button>
                    )}
                    <button type="button" onClick={() => rmImg(i)} className="text-[10px] bg-red-500 text-white rounded px-2 py-0.5 font-semibold w-full text-center">حذف</button>
                  </div>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/30 rounded p-0.5">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}
              {draft.images.length < 20 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">إضافة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* فيديو */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <FLabel>رابط فيديو <span className="text-gray-400 font-normal">(اختياري)</span></FLabel>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-gray-400 shrink-0" />
            <Input value={draft.videoUrl} onChange={e => upd({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..." className="h-11 rounded-lg border-gray-200 flex-1" dir="ltr" />
          </div>
        </div>
      </Section>
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 2 — الباقة
  ══════════════════════════════════════════════════ */
  const step2 = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">اختر باقة الإعلان</h2>
        <p className="text-sm text-gray-500">الباقات المدفوعة تمنح إعلانك ظهوراً أكبر في نتائج البحث</p>
      </div>

      <div className="space-y-3">
        {[{ id: null, nameAr: "مجانية", price: "0", durationDays: 30, commissionRate: 10, priorityRank: 0, topBadge: false, features: [] } as any, ...sorted].map((pkg) => {
          const sel = draft.plan === pkg.id;
          const isPaid = pkg.id !== null;
          const isTop = isPaid && (pkg.topBadge || pkg.priorityRank >= 2);
          return (
            <div key={pkg.id ?? "free"} onClick={() => upd({ plan: pkg.id })}
              className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all flex items-center gap-5
                ${sel ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              {isTop && <div className="absolute -top-2.5 right-5 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">الأكثر طلباً</div>}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-black
                ${isTop ? "bg-amber-100 text-amber-700" : isPaid ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                {pkg.id === null ? "🆓" : isPaid && pkg.priorityRank >= 2 ? "⭐" : "✦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{pkg.nameAr}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pkg.durationDays} يوم{isPaid ? ` · عمولة ${pkg.commissionRate}%` : " · ظهور عادي"}</p>
              </div>
              <div className="text-left shrink-0">
                <p className={`text-xl font-extrabold ${isTop ? "text-amber-600" : isPaid ? "text-teal-700" : "text-gray-500"}`}>
                  {pkg.id === null ? "مجاني" : `${Number(pkg.price).toLocaleString("ar")} ج.م`}
                </p>
              </div>
              {sel && <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-white" /></div>}
            </div>
          );
        })}
      </div>

      {/* ملخص */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-3">ملخص العقار</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[
            ["النوع", `${MAIN_TYPES.find(t => t.id === draft.mainType)?.label ?? "—"} · ${draft.subType || "—"}`],
            ["الصفقة", LISTING_TYPES.find(t => t.id === draft.listingType)?.label ?? "—"],
            ["الموقع", draft.cityName ?? "—"],
            ["السعر", draft.price ? `${Number(draft.price).toLocaleString("ar")} ج.م` : "—"],
            ["المساحة", draft.area ? `${draft.area} م²` : "—"],
            ["الصور", `${draft.images.length} صورة`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between col-span-2 sm:col-span-1 py-1 border-b border-gray-100 last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-gray-800 text-left">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 3 — الدفع والنشر
  ══════════════════════════════════════════════════ */
  const step3 = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">طريقة الدفع</h2>
        <p className="text-sm text-gray-500">اختر الطريقة المناسبة لك</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_OPS.map(pm => {
          const sel = draft.paymentMethod === pm.id;
          return (
            <button key={pm.id} type="button" onClick={() => upd({ paymentMethod: pm.id })}
              className={`py-4 px-5 rounded-xl border-2 transition-all text-sm font-semibold text-center
                ${sel ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
              {pm.label}
              {sel && <span className="block text-xs mt-1 text-teal-500 font-normal">✓ محدد</span>}
            </button>
          );
        })}
      </div>

      {/* ملخص نهائي */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <p className="font-bold text-gray-800 text-sm">الملخص النهائي</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            ["العقار",     `${MAIN_TYPES.find(t => t.id === draft.mainType)?.label ?? "—"} · ${draft.subType || "—"}`],
            ["الصفقة",    LISTING_TYPES.find(t => t.id === draft.listingType)?.label ?? "—"],
            ["الموقع",    `${draft.cityName ?? "—"}${draft.address ? " · " + draft.address : ""}`],
            ["السعر",     draft.price ? `${Number(draft.price).toLocaleString("ar")} ج.م` : "—"],
            ["المساحة",   draft.area ? `${draft.area} م²` : "—"],
            ["الصور",     `${draft.images.length} صورة`],
            ["الباقة",    draft.plan === null ? "مجانية" : sorted.find(p => p.id === draft.plan)?.nameAr ?? "—"],
            ["الدفع",     PAYMENT_OPS.find(p => p.id === draft.paymentMethod)?.label ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {submitting && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>جاري رفع البيانات والصور…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={submitting}
        className="w-full h-14 rounded-xl text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-md">
        {submitting ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري النشر…</> : "نشر الإعلان"}
      </Button>
      <p className="text-center text-xs text-gray-400">بالنشر أنت توافق على شروط وأحكام المنصة</p>
    </div>
  );

  /* ══════════════════════════════════════════════════
      LAYOUT
  ══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <Steps step={step} />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />السابق
            </button>
          )}
          <div className="flex-1 flex justify-center gap-1.5">
            {[1,2,3].map(i => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === step ? "w-8 bg-teal-600" : i < step ? "w-4 bg-teal-200" : "w-4 bg-gray-200"}`} />
            ))}
          </div>
          {step < TOTAL_STEPS && (
            <button onClick={goNext}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 px-6 py-2.5 rounded-lg transition-colors shrink-0">
              التالي<ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}
