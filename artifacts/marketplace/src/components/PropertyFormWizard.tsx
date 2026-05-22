import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees, MapPin,
  ImagePlus, CheckCircle2, X, ChevronLeft, Sofa, Car, Wind, Wifi,
  Shield, Zap, Droplets, Dumbbell, Tag, Loader2, Crown, CreditCard,
  Smartphone, Check, Star, TrendingUp, Eye, Award, BarChart2, Bot,
  Rocket, Navigation, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: "شقة",       label: "شقة",       icon: Home,        desc: "في عمارة أو مجمع" },
  { value: "فيلا",      label: "فيلا",      icon: Building2,   desc: "منزل مستقل" },
  { value: "أرض",       label: "أرض",       icon: Trees,       desc: "قطعة أرض" },
  { value: "مكتب",      label: "مكتب",      icon: Briefcase,   desc: "إداري أو تجاري" },
  { value: "محل تجاري", label: "محل تجاري", icon: ShoppingBag, desc: "على الشارع" },
  { value: "مستودع",    label: "مستودع",    icon: Warehouse,   desc: "للتخزين" },
  { value: "عمارة",     label: "عمارة",     icon: Building2,   desc: "مبنى كامل" },
  { value: "استراحة",   label: "استراحة",   icon: Home,        desc: "للإيجار اليومي" },
];

const AMENITIES = [
  { value: "مصعد",         label: "مصعد",         icon: Building2 },
  { value: "موقف سيارات", label: "موقف سيارات", icon: Car },
  { value: "تكييف مركزي", label: "تكييف مركزي", icon: Wind },
  { value: "إنترنت",       label: "إنترنت",       icon: Wifi },
  { value: "حارس أمن",    label: "حارس أمن",    icon: Shield },
  { value: "مولد كهرباء", label: "مولد كهرباء", icon: Zap },
  { value: "خزان مياه",   label: "خزان مياه",   icon: Droplets },
  { value: "نادي رياضي",  label: "نادي رياضي",  icon: Dumbbell },
  { value: "مفروش",        label: "مفروش",        icon: Sofa },
  { value: "حديقة خاصة", label: "حديقة خاصة", icon: Trees },
];

const NEARBY_SERVICES = [
  "مسجد", "مدرسة", "مستشفى", "صيدلية", "سوبر ماركت",
  "بنك", "حديقة عامة", "مواصلات عامة", "مطعم", "نادي رياضي",
];

const FINISHING = [
  { value: "super_lux",     label: "سوبر لوكس",  desc: "تشطيبات راقية جداً" },
  { value: "lux",           label: "لوكس",        desc: "تشطيبات جيدة" },
  { value: "semi_finished", label: "نصف تشطيب",  desc: "جاهز للتشطيب" },
  { value: "unfinished",    label: "بدون تشطيب", desc: "هيكل فقط" },
];

const CONDITIONS = [
  { value: "new",                label: "جديد / لم يُسكن" },
  { value: "excellent",          label: "ممتاز" },
  { value: "good",               label: "جيد" },
  { value: "needs_renew",        label: "يحتاج تجديد" },
  { value: "under_construction", label: "تحت الإنشاء" },
];

const DIRECTIONS = [
  "شمال", "جنوب", "شرق", "غرب",
  "شمال شرق", "شمال غرب", "جنوب شرق", "جنوب غرب",
];

const ADVERTISER_TYPES = [
  { value: "owner",     label: "مالك مباشر" },
  { value: "broker",    label: "وسيط عقاري" },
  { value: "company",   label: "شركة عقارية" },
  { value: "developer", label: "مطور عقاري" },
];

const CITIES = ["بنها", "قليوب", "شبرا الخيمة", "القناطر", "طوخ", "كفر شكر"];

const BANHA_LAT = 30.4667;
const BANHA_LNG = 31.1833;

const PLAN_ICONS: Record<string, typeof Eye> = {
  homepageDisplay: Eye,    topSearch: TrendingUp, verifiedBadge: Award,
  premiumBadge: Star,      prioritySupport: Smartphone, analytics: BarChart2,
  seo: Rocket,             aiTools: Bot,           autoBoost: TrendingUp,
};
const PLAN_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch:       "أولوية في نتائج البحث",
  verifiedBadge:   "شارة الموثوقية",
  premiumBadge:    "شارة مميز",
  prioritySupport: "دعم أولوية",
  analytics:       "إحصائيات الأداء",
  seo:             "تحسين محركات البحث",
  aiTools:         "أدوات الذكاء الاصطناعي",
  autoBoost:       "رفع تلقائي للإعلان",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type FormMode = "user" | "company";

export interface PropertyFormWizardProps {
  /** "company" shows extra fields: advertiser type, compound, condition, direction, video URL */
  mode: FormMode;
  /** Path to go back when pressing back on step 1 */
  backPath: string;
  /** Show the billing-plan selection step (step 5) */
  showPlans?: boolean;
}

interface FormValues {
  listingType:    string;
  mainCategory:   string;
  title:          string;
  description:    string;
  price:          string;
  area:           string;
  rooms:          string;
  bathrooms:      string;
  floor:          string;
  totalFloors:    string;
  buildYear:      string;
  finishing:      string;
  furnished:      string;
  paymentMethod:  string;
  condition:      string;
  advertiserType: string;
  compound:       string;
  facade:         string;
  direction:      string;
  features:       string[];
  nearbyServices: string[];
  city:           string;
  district:       string;
  address:        string;
  street:         string;
  latitude:       string;
  longitude:      string;
  phone:          string;
  whatsapp:       string;
  videoUrl:       string;
  images:         string[];
}

// ─── MapPicker (lazy-loaded client-side only) ─────────────────────────────────

function MapPickerSection({ lat, lng, onPick, onClear }: {
  lat: string; lng: string;
  onPick: (lat: number, lng: number) => void;
  onClear: () => void;
}) {
  const [RL, setRL] = useState<any>(null);

  useEffect(() => {
    import("react-leaflet").then(async (rl) => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css" as any);
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setRL(rl);
    });
  }, []);

  const mapPos: [number, number] | null =
    lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;

  const getGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => onPick(p.coords.latitude, p.coords.longitude),
      () => {},
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-semibold">تحديد الموقع على الخريطة</Label>
        <button type="button" onClick={getGPS}
          className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700 transition-colors">
          <Navigation className="w-3.5 h-3.5" />
          موقعي الحالي
        </button>
      </div>

      {!RL ? (
        <div className="h-56 rounded-xl border border-border bg-secondary/30 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : (() => {
        const { MapContainer, TileLayer, Marker, useMapEvents } = RL;
        function ClickHandler() {
          useMapEvents({ click: (e: any) => onPick(e.latlng.lat, e.latlng.lng) });
          return null;
        }
        return (
          <div className="h-56 rounded-xl overflow-hidden border border-border">
            <MapContainer
              center={mapPos ?? [BANHA_LAT, BANHA_LNG]}
              zoom={mapPos ? 15 : 12}
              className="h-full w-full"
              key={mapPos ? `${lat},${lng}` : "default"}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickHandler />
              {mapPos && <Marker position={mapPos} />}
            </MapContainer>
          </div>
        );
      })()}

      {mapPos ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2" dir="ltr">
          <span className="text-teal-600 font-mono">
            {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
          </span>
          <button type="button" onClick={onClear}
            className="text-red-400 hover:text-red-500 font-medium">
            مسح
          </button>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          اضغط على الخريطة لتحديد الموقع بدقة
        </p>
      )}
    </div>
  );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, selected, onSelect }: {
  plan: BillingPlan; selected: boolean; onSelect: () => void;
}) {
  let features: Record<string, boolean> = {};
  let limits:   Record<string, number>  = {};
  try { features = JSON.parse(plan.features); } catch { /**/ }
  try { limits   = JSON.parse(plan.limits);   } catch { /**/ }

  const isFree = parseFloat(plan.price) === 0;
  const activeFeatures = Object.entries(features).filter(([, v]) => v);
  const props  = limits.properties === -1 ? "غير محدود" : `${limits.properties ?? 0}`;
  const photos = limits.photos     === -1 ? "غير محدود" : `${limits.photos     ?? 0}`;

  return (
    <button type="button" onClick={onSelect}
      className={`relative w-full text-right rounded-2xl border-2 p-5 transition-all flex flex-col gap-3 ${
        selected
          ? "border-teal-600 bg-teal-50 shadow-lg shadow-teal-100"
          : "border-border hover:border-teal-300 hover:bg-secondary/30 bg-white"
      }`}>
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shadow">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="flex items-start gap-2 flex-wrap min-h-[20px]">
        {plan.isMostPopular && <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5">الأكثر طلباً</Badge>}
        {plan.isRecommended && <Badge className="bg-teal-600 text-white text-[10px] px-2 py-0.5">موصى به</Badge>}
        {plan.trialDays > 0 && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-teal-400 text-teal-700">
            {plan.trialDays} يوم مجاناً
          </Badge>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-foreground">{plan.nameAr ?? plan.name}</p>
          {plan.descriptionAr && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.descriptionAr}</p>
          )}
        </div>
        <div className="text-left shrink-0">
          {isFree ? (
            <p className="text-2xl font-black text-teal-600">مجاني</p>
          ) : (
            <>
              <p className="text-2xl font-black text-foreground">
                {plan.price}
                <span className="text-sm font-semibold text-muted-foreground mr-1">{plan.currency}</span>
              </p>
              <p className="text-xs text-muted-foreground">/ شهر</p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{props}</span> عقار
        </span>
        <span className="flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{photos}</span> صورة
        </span>
        {(limits.featuredAds ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">
              {limits.featuredAds === -1 ? "∞" : limits.featuredAds}
            </span> مميز
          </span>
        )}
      </div>
      {activeFeatures.length > 0 && (
        <div className="space-y-1.5">
          {activeFeatures.slice(0, 4).map(([key]) => {
            if (!PLAN_LABELS[key]) return null;
            return (
              <div key={key} className="flex items-center gap-2 text-xs text-foreground">
                <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-teal-600" />
                </div>
                {PLAN_LABELS[key]}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ─── PaymentDialog ────────────────────────────────────────────────────────────

function PaymentDialog({ open, plan, onClose, onSuccess }: {
  open: boolean; plan: BillingPlan | null; onClose: () => void; onSuccess: () => void;
}) {
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");
  const [mobile, setMobile] = useState("");

  const handlePay = async () => {
    if (!mobile.match(/^05\d{8}$/)) return;
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 2800));
    setPhase("done");
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
  };

  const handleClose = () => {
    if (phase === "processing") return;
    setPhase("form");
    setMobile("");
    onClose();
  };

  if (!plan || parseFloat(plan.price) === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl">
        {phase === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5 text-teal-600" />
                الدفع الآمن
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3 border border-teal-200">
                <div>
                  <p className="text-sm font-bold text-teal-800">{plan.nameAr ?? plan.name}</p>
                  <p className="text-xs text-teal-600">{plan.durationDays} يوم — اشتراك شهري</p>
                </div>
                <p className="text-2xl font-black text-teal-700">
                  {plan.price}
                  <span className="text-sm font-semibold mr-1">{plan.currency}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  رقم جوال STC Pay
                </Label>
                <Input
                  placeholder="05XXXXXXXX" value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10} dir="ltr"
                  className="h-12 rounded-xl text-center tracking-widest text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground text-center">
                  أدخل رقم الجوال المرتبط بمحفظة STC Pay
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                جميع المعاملات مشفرة وآمنة بالكامل
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handlePay}
                  disabled={!mobile.match(/^05\d{8}$/)}
                  className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  ادفع {plan.price} {plan.currency}
                </Button>
                <Button variant="outline" onClick={handleClose} className="h-12 rounded-xl px-5">
                  إلغاء
                </Button>
              </div>
            </div>
          </>
        )}
        {phase === "processing" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
            <p className="text-lg font-bold">جارٍ معالجة الدفع</p>
            <p className="text-sm text-muted-foreground">الرجاء الانتظار...</p>
          </div>
        )}
        {phase === "done" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-700">تم الدفع بنجاح!</p>
            <p className="text-sm text-muted-foreground">جارٍ نشر إعلانك...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function PropertyFormWizard({
  mode,
  backPath,
  showPlans = false,
}: PropertyFormWizardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const isCompany = mode === "company";

  const STEPS = [
    { id: 1, label: "نوع العقار",     icon: Building2 },
    { id: 2, label: "التفاصيل",       icon: Home },
    { id: 3, label: "الموقع",         icon: MapPin },
    { id: 4, label: "الصور والتواصل", icon: Phone },
    ...(showPlans ? [{ id: 5, label: "اختر الباقة", icon: Crown }] : []),
  ];

  const [step, setStep]               = useState(1);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: FormValues = {
    listingType: "", mainCategory: "",
    title: "", description: "", price: "", area: "",
    rooms: "", bathrooms: "", floor: "", totalFloors: "", buildYear: "",
    finishing: "", furnished: "", paymentMethod: "", condition: "",
    advertiserType: isCompany ? "company" : "",
    compound: "", facade: "", direction: "",
    features: [], nearbyServices: [],
    city: "بنها", district: "", address: "", street: "",
    latitude: "", longitude: "",
    phone: user?.phone ?? "", whatsapp: "",
    videoUrl: "", images: [],
  };

  const { register, watch, setValue, getValues, reset } =
    useForm<FormValues>({ defaultValues });

  const v = watch();
  const showRoomFields = !["أرض", "مستودع", "محل تجاري"].includes(v.mainCategory);

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlansPublic"],
    queryFn:  () => api.billingPlans.publicList(),
    enabled:  showPlans,
    staleTime: 5 * 60_000,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = (key: keyof FormValues, val: any) => setValue(key, val);

  const toggleArr = (key: "features" | "nearbyServices", val: string) => {
    const arr = getValues(key) as string[];
    setValue(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const removeImage = (url: string) =>
    setValue("images", (getValues("images") as string[]).filter((i) => i !== url));

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const imgs = getValues("images") as string[];
    const slots = 10 - imgs.length;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, slots)) {
      try {
        const res = await api.upload.propertyImage(file);
        if (res?.url) uploaded.push(res.url);
      } catch { /**/ }
    }
    setValue("images", [...imgs, ...uploaded]);
    setUploading(false);
  };

  // ── Validation per step ────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    if (step === 1) return !!v.listingType && !!v.mainCategory;
    if (step === 2) return !!v.title && !!v.area;
    if (step === 3) return !!v.city;
    if (step === 4) return !!v.phone;
    if (step === 5) return !!selectedPlan;
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const buildPayload = () => {
    const f = getValues();
    return {
      listingType:    f.listingType,
      mainCategory:   f.mainCategory,
      title:          f.title,
      description:    f.description    || undefined,
      price:          f.price          || undefined,
      area:           f.area           || undefined,
      rooms:          f.rooms          ? parseInt(f.rooms)       : undefined,
      bathrooms:      f.bathrooms      ? parseInt(f.bathrooms)   : undefined,
      floor:          f.floor          ? parseInt(f.floor)       : undefined,
      totalFloors:    f.totalFloors    ? parseInt(f.totalFloors) : undefined,
      buildYear:      f.buildYear      ? parseInt(f.buildYear)   : undefined,
      finishing:      f.finishing      || undefined,
      furnished:      f.furnished      || undefined,
      condition:      f.condition      || undefined,
      paymentMethod:  f.paymentMethod  || undefined,
      advertiserType: f.advertiserType || undefined,
      compound:       f.compound       || undefined,
      facade:         f.facade         || undefined,
      direction:      f.direction      || undefined,
      city:           f.city           || undefined,
      district:       f.district       || undefined,
      address:        f.address        || undefined,
      street:         f.street         || undefined,
      latitude:       f.latitude       || undefined,
      longitude:      f.longitude      || undefined,
      phone:          f.phone          || undefined,
      whatsapp:       f.whatsapp       || undefined,
      videoUrl:       f.videoUrl       || undefined,
      features:       (f.features as string[]).length
                        ? JSON.stringify(f.features)       : undefined,
      nearbyServices: (f.nearbyServices as string[]).length
                        ? JSON.stringify(f.nearbyServices) : undefined,
      images:         (f.images as string[]).length
                        ? JSON.stringify(f.images)         : undefined,
      status: "pending" as const,
    };
  };

  const doCreate = async () => {
    await api.userProperties.create(buildPayload());
    setSuccess(true);
  };

  const handleSubmit = async () => {
    if (showPlans) {
      if (!selectedPlan) return;
      if (parseFloat(selectedPlan.price) > 0) { setShowPayment(true); return; }
    }
    setSubmitting(true);
    setError(null);
    try { await doCreate(); }
    catch (e: any) { setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب"); }
    finally { setSubmitting(false); }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSubmitting(true);
    setError(null);
    try { await doCreate(); }
    catch (e: any) { setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب"); }
    finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setSuccess(false);
    setStep(1);
    setSelectedPlan(null);
    setError(null);
    reset(defaultValues);
  };

  // ── Success Screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">تم إرسال إعلانك!</h2>
          <p className="text-muted-foreground mb-1">
            سيتم مراجعة إعلانك من قبل فريقنا وسيُنشر بعد الموافقة.
          </p>
          {showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0 && (
            <p className="text-sm text-teal-600 font-medium mb-1">
              تم تفعيل باقة {selectedPlan.nameAr ?? selectedPlan.name} بنجاح.
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-8">
            ستصلك إشعار فور الموافقة على إعلانك.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={() => setLocation("/user/my-properties")}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6"
            >
              <Building2 className="w-4 h-4 ml-2" />
              عقاراتي
            </Button>
            <Button variant="outline" onClick={handleReset} className="rounded-xl h-11 px-6">
              إضافة عقار آخر
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step indicator bar ─────────────────────────────────────────────────────

  const StepBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 right-5 left-5 h-0.5 bg-border -z-0" />
        <div
          className="absolute top-5 right-5 h-0.5 bg-teal-600 transition-all duration-500 -z-0"
          style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%`, left: "auto" }}
        />
        {STEPS.map((s) => {
          const Icon   = s.icon;
          const done   = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex flex-col items-center gap-2 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done   ? "bg-teal-600 border-teal-600 text-white" :
                active ? "bg-white border-teal-600 text-teal-600 shadow-md shadow-teal-100" :
                         "bg-background border-border text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block text-center leading-tight max-w-[58px] ${
                active ? "text-teal-600" : done ? "text-teal-600/70" : "text-muted-foreground"
              }`}>{s.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 sm:hidden text-center">
        <span className="text-xs font-semibold text-teal-600">{STEPS[step - 1]?.label}</span>
        <span className="text-xs text-muted-foreground mx-1">—</span>
        <span className="text-xs text-muted-foreground">
          الخطوة {step} من {STEPS.length}
        </span>
      </div>
    </div>
  );

  // ── Reusable tile-button ───────────────────────────────────────────────────

  const Tile = ({
    active, onClick, className = "", children,
  }: {
    active: boolean;
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-all text-right ${
        active
          ? "border-teal-600 bg-teal-50 shadow-sm"
          : "border-border hover:border-teal-300 hover:bg-secondary/40"
      } ${className}`}
    >
      {active && (
        <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center z-10">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </span>
      )}
      {children}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — نوع العقار
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* نوع الإعلان */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          نوع الإعلان <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: "sale", label: "للبيع",   icon: Tag,       desc: "بيع عقارك بأفضل سعر" },
            { value: "rent", label: "للإيجار", icon: Building2, desc: "أجّر عقارك شهرياً أو سنوياً" },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <Tile
                key={opt.value}
                active={v.listingType === opt.value}
                onClick={() => set("listingType", opt.value)}
                className="p-5"
              >
                <p className={`text-xl font-bold mb-1 ${v.listingType === opt.value ? "text-teal-700" : ""}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </Tile>
            );
          })}
        </div>
      </div>

      {/* نوع العقار */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          نوع العقار <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROPERTY_TYPES.map((type) => {
            const Icon   = type.icon;
            const active = v.mainCategory === type.value;
            return (
              <Tile
                key={type.value}
                active={active}
                onClick={() => set("mainCategory", type.value)}
                className="p-4 flex flex-col items-center gap-2 text-center"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  active ? "bg-teal-600 text-white" : "bg-secondary text-muted-foreground"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-sm font-semibold ${active ? "text-teal-700" : ""}`}>
                  {type.label}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                  {type.desc}
                </p>
              </Tile>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — التفاصيل
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-6">

      {/* ── Company only: نوع المعلن ─────────────────────────────── */}
      {isCompany && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">نوع المعلن</Label>
          <div className="grid grid-cols-2 gap-2">
            {ADVERTISER_TYPES.map((at) => (
              <Tile
                key={at.value}
                active={v.advertiserType === at.value}
                onClick={() => set("advertiserType", at.value)}
                className="px-4 py-2.5"
              >
                <span className={`text-sm font-medium ${
                  v.advertiserType === at.value ? "text-teal-700" : ""
                }`}>{at.label}</span>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {/* عنوان الإعلان */}
      <div>
        <Label htmlFor="f-title" className="text-base font-bold mb-2 block">
          عنوان الإعلان <span className="text-red-500">*</span>
        </Label>
        <Input
          id="f-title"
          placeholder="مثال: شقة 3 غرف للبيع في حي النزهة ببنها"
          {...register("title")}
          className="h-12 rounded-xl text-base"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          عنوان واضح يجذب أكثر مشترين
        </p>
      </div>

      {/* ── Company only: اسم المشروع ────────────────────────────── */}
      {isCompany && (
        <div>
          <Label htmlFor="f-compound" className="text-sm font-semibold mb-2 block">
            اسم المشروع / المجمع
          </Label>
          <Input
            id="f-compound"
            placeholder="مثال: كمبوند الياسمين، مشروع النيل سيتي..."
            {...register("compound")}
            className="h-11 rounded-xl"
          />
        </div>
      )}

      {/* السعر والمساحة */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="f-price" className="text-sm font-semibold mb-2 block">
            السعر (ج.م)
          </Label>
          <Input
            id="f-price" type="number" placeholder="850,000"
            {...register("price")} className="h-11 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="f-area" className="text-sm font-semibold mb-2 block">
            المساحة (م²) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="f-area" type="number" placeholder="120"
            {...register("area")} className="h-11 rounded-xl"
          />
        </div>
      </div>

      {/* تفاصيل الوحدة */}
      {showRoomFields && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">تفاصيل الوحدة</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "rooms",     label: "الغرف",    placeholder: "3" },
              { id: "bathrooms", label: "الحمامات", placeholder: "2" },
              { id: "floor",     label: "الطابق",   placeholder: "3" },
            ].map((f) => (
              <div key={f.id}>
                <p className="text-xs text-muted-foreground mb-1.5">{f.label}</p>
                <Input
                  type="number" placeholder={f.placeholder}
                  {...register(f.id as keyof FormValues)}
                  className="h-11 rounded-xl text-center"
                />
              </div>
            ))}
          </div>
          <div className={`grid gap-3 mt-3 ${isCompany ? "grid-cols-2" : "grid-cols-1 max-w-[33%]"}`}>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">إجمالي الأدوار</p>
              <Input
                type="number" placeholder="10"
                {...register("totalFloors")} className="h-11 rounded-xl text-center"
              />
            </div>
            {/* ── Company only: سنة البناء ─── */}
            {isCompany && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">سنة البناء</p>
                <Input
                  type="number" placeholder="2022"
                  {...register("buildYear")} className="h-11 rounded-xl text-center"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* التشطيب والأثاث */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">حالة التشطيب</Label>
          <Select value={v.finishing} onValueChange={(val) => set("finishing", val)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="اختر..." />
            </SelectTrigger>
            <SelectContent>
              {FINISHING.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span className="font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground mr-2">{f.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showRoomFields && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">الأثاث</Label>
            <Select value={v.furnished} onValueChange={(val) => set("furnished", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="furnished">مفروشة بالكامل</SelectItem>
                <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                <SelectItem value="unfurnished">غير مفروشة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Company only: حالة العقار + الاتجاه ────────────────── */}
      {isCompany && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">حالة العقار</Label>
            <Select value={v.condition} onValueChange={(val) => set("condition", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">اتجاه العقار</Label>
            <Select value={v.direction} onValueChange={(val) => set("direction", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* فترة الإيجار (إذا كان النوع إيجار) */}
      {v.listingType === "rent" && (
        <div>
          <Label className="text-sm font-semibold mb-2 block">فترة الإيجار</Label>
          <Select value={v.paymentMethod} onValueChange={(val) => set("paymentMethod", val)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="اختر..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">يومي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
              <SelectItem value="quarterly">ربع سنوي</SelectItem>
              <SelectItem value="yearly">سنوي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* مميزات العقار */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">مميزات العقار</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AMENITIES.map((am) => {
            const Icon   = am.icon;
            const active = (v.features as string[]).includes(am.value);
            return (
              <button
                key={am.value} type="button"
                onClick={() => toggleArr("features", am.value)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-border hover:border-teal-200 text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${
                  active ? "text-teal-600" : "text-muted-foreground"
                }`} />
                {am.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* الخدمات الطرفية */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">الخدمات الطرفية القريبة</Label>
        <div className="flex flex-wrap gap-2">
          {NEARBY_SERVICES.map((svc) => {
            const active = (v.nearbyServices as string[]).includes(svc);
            return (
              <button
                key={svc} type="button"
                onClick={() => toggleArr("nearbyServices", svc)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  active
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-border hover:border-teal-300 text-foreground"
                }`}
              >
                {svc}
              </button>
            );
          })}
        </div>
      </div>

      {/* وصف العقار */}
      <div>
        <Label htmlFor="f-desc" className="text-sm font-semibold mb-2 block">
          وصف العقار
        </Label>
        <Textarea
          id="f-desc"
          placeholder="صف العقار بالتفصيل — الموقع، المميزات، حالة العقار..."
          {...register("description")}
          className="rounded-xl min-h-28 resize-none"
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
          {(v.description ?? "").length}/2000
        </p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — الموقع
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* اختيار المدينة */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          المدينة <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CITIES.map((city) => (
            <button
              key={city} type="button"
              onClick={() => set("city", city)}
              className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                v.city === city
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-border hover:border-teal-300 hover:bg-secondary/40"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* الحي والشارع */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="f-district" className="text-sm font-semibold mb-2 block">
            الحي / المنطقة
          </Label>
          <Input
            id="f-district"
            placeholder="حي النزهة، حي الزهراء..."
            {...register("district")}
            className="h-11 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="f-street" className="text-sm font-semibold mb-2 block">
            اسم الشارع
          </Label>
          <Input
            id="f-street"
            placeholder="شارع الجمهورية..."
            {...register("street")}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      {/* العنوان التفصيلي */}
      <div>
        <Label htmlFor="f-address" className="text-sm font-semibold mb-2 block">
          العنوان التفصيلي
        </Label>
        <Input
          id="f-address"
          placeholder="مثال: بجوار المسجد الكبير، أمام البنك الأهلي..."
          {...register("address")}
          className="h-11 rounded-xl"
        />
      </div>

      {/* الخريطة */}
      <MapPickerSection
        lat={v.latitude}
        lng={v.longitude}
        onPick={(lat, lng) => {
          setValue("latitude",  String(lat));
          setValue("longitude", String(lng));
        }}
        onClear={() => {
          setValue("latitude",  "");
          setValue("longitude", "");
        }}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — الصور والتواصل
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* صور العقار */}
      <div>
        <Label className="text-base font-bold mb-2 block">صور العقار</Label>
        <p className="text-xs text-muted-foreground mb-4">
          أضف حتى 10 صور — الصورة الأولى تكون الغلاف
        </p>

        {(v.images as string[]).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(v.images as string[]).map((img, i) => (
              <div
                key={i}
                className="relative group rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    غلاف
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(v.images as string[]).length < 10 && (
          <>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-teal-400 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-muted-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
                  <span className="text-sm">جارٍ الرفع...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-sm font-medium">اضغط لاختيار الصور</span>
                  <span className="text-xs">PNG, JPG حتى 5MB</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* معلومات التواصل */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          معلومات التواصل <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-4">
          <div>
            <Label htmlFor="f-phone" className="text-sm font-semibold mb-2 block">
              رقم الهاتف <span className="text-red-500">*</span>
            </Label>
            <Input
              id="f-phone" placeholder="01XXXXXXXXX"
              {...register("phone")}
              className="h-11 rounded-xl" dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="f-whatsapp" className="text-sm font-semibold mb-2 block">
              رقم الواتساب (اختياري)
            </Label>
            <Input
              id="f-whatsapp" placeholder="01XXXXXXXXX"
              {...register("whatsapp")}
              className="h-11 rounded-xl" dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* ── Company only: رابط فيديو يوتيوب ─────────────────────── */}
      {isCompany && (
        <div>
          <Label htmlFor="f-video" className="text-sm font-semibold mb-2 block">
            رابط فيديو يوتيوب (اختياري)
          </Label>
          <Input
            id="f-video"
            placeholder="https://youtube.com/watch?v=..."
            {...register("videoUrl")}
            className="h-11 rounded-xl"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            أضف فيديو جولة افتراضية أو عرض المشروع
          </p>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5 — اختر الباقة  (showPlans only)
  // ─────────────────────────────────────────────────────────────────────────

  const renderStep5 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">اختر الباقة المناسبة</h2>
        <p className="text-sm text-muted-foreground">
          حدد كيفية ظهور إعلانك وعدد الإعلانات المسموحة لحسابك
        </p>
      </div>

      {plansLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد باقات متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan?.id === plan.id}
              onSelect={() => setSelectedPlan(plan)}
            />
          ))}
        </div>
      )}

      {selectedPlan && (
        <div className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
          parseFloat(selectedPlan.price) > 0
            ? "bg-amber-50 border-amber-200"
            : "bg-teal-50 border-teal-200"
        }`}>
          <div>
            <p className="font-bold text-sm">
              الباقة المختارة: {selectedPlan.nameAr ?? selectedPlan.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parseFloat(selectedPlan.price) === 0
                ? "الإعلان مجاني — سيُراجع فريقنا إعلانك قبل النشر"
                : `ستدفع ${selectedPlan.price} ${selectedPlan.currency} عبر STC Pay لتفعيل الباقة`}
            </p>
          </div>
          {parseFloat(selectedPlan.price) > 0
            ? <CreditCard className="w-6 h-6 text-amber-600 shrink-0" />
            : <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
          }
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const isLastStep = step === STEPS.length;

  const submitLabel = () => {
    if (submitting) return <><Loader2 className="w-4 h-4 animate-spin" />جارٍ النشر...</>;
    if (showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0)
      return <><CreditCard className="w-4 h-4" />ادفع وانشر</>;
    return <>نشر الإعلان</>;
  };

  const submitBg =
    showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-teal-600 hover:bg-teal-700";

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : setLocation(backPath))}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">أضف عقارك</h1>
          <p className="text-sm text-muted-foreground">أنشر إعلانك ووصّل لآلاف الباحثين</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepBar />

      {/* Step content */}
      <div className="pb-28">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && showPlans && renderStep5()}
      </div>

      {/* ── Fixed bottom navigation ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : setLocation(backPath))}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            السابق
          </button>

          {/* Dot progress */}
          <div className="flex-1 flex justify-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-6 bg-teal-600" :
                  s.id < step  ? "w-3 bg-teal-300" :
                                 "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Next / Submit */}
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              التالي
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className={`flex items-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${submitBg}`}
            >
              {submitLabel()}
            </button>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      {showPlans && (
        <PaymentDialog
          open={showPayment}
          plan={selectedPlan}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
