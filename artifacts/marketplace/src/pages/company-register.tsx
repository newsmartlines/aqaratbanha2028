import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api, mediaUrl, type BillingPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import {
  Building2, User, Mail, Phone, Lock, Eye, EyeOff,
  Check, ChevronLeft, Upload, X, Loader2, CheckCircle2,
  ArrowLeft, Image as ImageIcon, Shield, AlertCircle,
  Star, Zap, Crown, Package as PkgIcon,
} from "lucide-react";
import toast from "react-hot-toast";

const TOTAL_STEPS = 3;

/* ─── Auto-redirect welcome screen ─── */
function AutoRedirectScreen({ name, onRedirect }: { name: string; onRedirect: () => void }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) { onRedirect(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onRedirect]);

  const progress = ((3 - countdown) / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 fade-in duration-500">

        {/* Animated checkmark */}
        <div className="relative w-28 h-28 mx-auto">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="#0d9488" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-zinc-800">
            مرحباً بك، {name || "بخير"}! 🎉
          </h1>
          <p className="text-zinc-500 leading-relaxed">
            تم تسجيل شركتك بنجاح. جاري نقلك إلى لوحة التحكم…
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>سيتم التحويل خلال <span className="font-bold text-primary tabular-nums">{countdown}</span> ثوانٍ</span>
        </div>

        {/* Manual button */}
        <Button
          size="lg"
          className="w-full h-12 rounded-2xl font-bold text-base shadow-md shadow-primary/20"
          onClick={onRedirect}
        >
          <Building2 className="w-5 h-5 ml-2" />
          الذهاب إلى لوحة التحكم الآن
        </Button>
      </div>
    </div>
  );
}

/* ─── Password strength ─── */
function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: "ضعيفة جداً",  color: "bg-red-500" };
  if (s === 2) return { score: s, label: "ضعيفة",       color: "bg-orange-500" };
  if (s === 3) return { score: s, label: "متوسطة",      color: "bg-yellow-500" };
  if (s === 4) return { score: s, label: "قوية",        color: "bg-teal-500" };
  return       { score: s, label: "قوية جداً",          color: "bg-emerald-500" };
}

function validateEgyptianPhone(ph: string) {
  return /^(010|011|012|015)\d{8}$/.test(ph.replace(/\s/g, ""));
}

/* ─── Drag-drop image zone ─── */
function DragDropZone({ label, hint, preview, onFile, onClear, aspectRatio = "aspect-[3/1]" }: {
  label: string; hint: string; preview: string; onFile: (f: File) => void;
  onClear: () => void; aspectRatio?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  return (
    <div className={`relative ${aspectRatio} w-full rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden group cursor-pointer
        ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-zinc-200 hover:border-primary/50 hover:bg-zinc-50"}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}>
      <input ref={ref} type="file" className="hidden" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-semibold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">تغيير الصورة</span>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors z-10">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400 group-hover:text-primary transition-colors">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-primary/10 text-primary" : "bg-zinc-100 group-hover:bg-primary/10"}`}>
            <Upload className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-zinc-400">{hint}</span>
        </div>
      )}
    </div>
  );
}

type PlanFeatures = {
  homepageDisplay?: boolean; topSearch?: boolean; verifiedBadge?: boolean;
  premiumBadge?: boolean; prioritySupport?: boolean; analytics?: boolean;
  seo?: boolean; aiTools?: boolean; autoBoost?: boolean;
};

type PlanLimits = {
  properties?: number; photos?: number; videos?: number;
  featuredAds?: number; pinnedAds?: number; messages?: number; leads?: number;
};

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch: "أعلى نتائج البحث",
  verifiedBadge: "شارة موثق",
  premiumBadge: "شارة Premium",
  prioritySupport: "دعم فني بأولوية",
  analytics: "إحصائيات متقدمة",
  seo: "تحسين SEO",
  aiTools: "أدوات الذكاء الاصطناعي",
  autoBoost: "رفع تلقائي للإعلان",
};

function parsePlanFeatures(raw: string): string[] {
  try {
    const obj: PlanFeatures = JSON.parse(raw);
    return (Object.entries(obj) as [keyof PlanFeatures, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => FEATURE_LABELS[k])
      .filter(Boolean);
  } catch { return []; }
}

function parsePlanLimits(raw: string): PlanLimits {
  try { return JSON.parse(raw); } catch { return {}; }
}

function buildPlanBullets(plan: BillingPlan): string[] {
  const bullets: string[] = [];
  const limits = parsePlanLimits(plan.limits);
  const price = parseFloat(plan.price);

  if (price === 0) bullets.push("نشر مجاني بدون رسوم");
  else bullets.push(`نشر لمدة ${plan.durationDays} يوماً`);

  if (limits.properties === -1 || !limits.properties) bullets.push("عدد إعلانات غير محدود");
  else bullets.push(`حتى ${limits.properties} إعلان نشط`);

  if (limits.photos && limits.photos > 0) bullets.push(`حتى ${limits.photos} صورة لكل إعلان`);
  if (limits.featuredAds && limits.featuredAds > 0) bullets.push(`${limits.featuredAds} إعلان مميز`);

  const comm = parseFloat(plan.commissionPercent ?? "0");
  if (comm > 0) bullets.push(`عمولة ${comm}% فقط`);
  else bullets.push("بدون عمولة على المبيعات");

  const featureBullets = parsePlanFeatures(plan.features);
  bullets.push(...featureBullets.slice(0, 4));

  if (plan.trialDays > 0) bullets.push(`تجربة مجانية ${plan.trialDays} يوم`);

  return bullets;
}

/* ─── Premium Package card ─── */
function PackageCard({
  plan, selected, onSelect,
}: {
  plan: BillingPlan; selected: boolean; onSelect: () => void;
}) {
  const price  = parseFloat(plan.price);
  const isFree = price === 0;
  const bullets = buildPlanBullets(plan);
  const accent = plan.color || "#0d9488";

  const isPopular    = plan.isMostPopular;
  const isRecommended = plan.isRecommended;
  const badge = isPopular ? "الأكثر شيوعاً" : isRecommended ? "موصى به" : null;

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl bg-white flex flex-col overflow-hidden cursor-pointer
        transition-all duration-250 group
        ${selected
          ? "shadow-2xl -translate-y-2 ring-2 ring-offset-2"
          : "border border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-transparent"
        }`}
      style={selected ? { ringColor: accent, borderColor: accent } as React.CSSProperties : {}}
    >
      {/* Top color bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: accent }} />

      {/* Popular badge */}
      {badge && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm"
            style={{ background: accent, color: "#fff" }}>
            {isPopular ? <Star className="w-2.5 h-2.5" /> : <Crown className="w-2.5 h-2.5" />}
            {badge}
          </span>
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow"
          style={{ background: accent }}>
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b border-zinc-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
          {plan.name}
        </p>
        <h3 className="text-lg font-extrabold text-zinc-800 mb-1 leading-tight">
          {plan.nameAr ?? plan.name}
        </h3>
        {plan.descriptionAr && (
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{plan.descriptionAr}</p>
        )}
        <div className="flex items-end gap-1 mt-3">
          {isFree ? (
            <span className="text-3xl font-black text-emerald-600">مجاني</span>
          ) : (
            <>
              <span className="text-3xl font-black text-zinc-900">
                {Number(price).toLocaleString("ar")}
              </span>
              <span className="text-sm text-zinc-400 mb-1 mr-1">
                {plan.currency} / {plan.durationDays}ي
              </span>
            </>
          )}
        </div>
        {plan.trialDays > 0 && (
          <p className="text-xs font-medium text-emerald-600 mt-1">
            تجربة مجانية {plan.trialDays} يوم
          </p>
        )}
      </div>

      {/* Features list */}
      <div className="px-5 py-4 flex-1 space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors bg-zinc-100"
              style={{ background: selected ? `${accent}22` : undefined }}>
              <Check className="w-2.5 h-2.5" strokeWidth={3}
                style={{ color: selected ? accent : "#a1a1aa" }} />
            </div>
            <span className="text-sm text-zinc-600 leading-tight">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <div className="px-5 pb-5 pt-2">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
          style={selected
            ? { background: accent, color: "#fff" }
            : { background: "#f4f4f5", color: "#3f3f46" }
          }
          onMouseEnter={e => { if (!selected) { (e.currentTarget as HTMLButtonElement).style.background = accent; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; } }}
          onMouseLeave={e => { if (!selected) { (e.currentTarget as HTMLButtonElement).style.background = "#f4f4f5"; (e.currentTarget as HTMLButtonElement).style.color = "#3f3f46"; } }}
        >
          {selected ? "تم الاختيار ✓" : "اختر هذه الباقة"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
    Main Page
══════════════════════════════════════════════════ */
export default function CompanyRegisterPage() {
  const [, setLocation]  = useLocation();
  const { user, setUser } = useAuth();
  const [step, setStep]  = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done,  setDone]   = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);

  const logoFileRef   = useRef<File | null>(null);
  const bannerFileRef = useRef<File | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    companyName: "", bio: "", logoPreview: "", bannerPreview: "",
    acceptPrivacy: false, acceptTerms: false,
  });
  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const { data: allPlans = [], isLoading: pkgsLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billing-plans-company"],
    queryFn: () => api.fetchJson<BillingPlan[]>("/billing/plans"),
    staleTime: 5 * 60_000,
  });

  // Filter: only active plans visible to companies (userType "company" or "all")
  const companyPlans = allPlans
    .filter(p => p.status === "active" && (p.userType === "company" || p.userType === "all"))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || parseFloat(a.price) - parseFloat(b.price));

  useEffect(() => {
    if (user) {
      if (user.role === "provider") setLocation("/dashboard");
      else if (user.role === "admin") setLocation("/admin/dashboard");
    }
  }, [user]);

  const pwStrength = getPasswordStrength(form.password);

  /* ── Validate ── */
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())   e.name = "الاسم مطلوب";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "بريد إلكتروني غير صالح";
    if (!form.phone.trim())  e.phone = "رقم الهاتف مطلوب";
    else if (!validateEgyptianPhone(form.phone)) e.phone = "يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقماً";
    if (form.password.length < 8) e.password = "يجب أن تكون 8 أحرف على الأقل";
    if (form.password !== form.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "اسم الشركة مطلوب";
    if (!form.acceptPrivacy) e.acceptPrivacy = "يجب الموافقة على سياسة الخصوصية";
    if (!form.acceptTerms)   e.acceptTerms   = "يجب الموافقة على الشروط والأحكام";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const registered = await api.auth.register({
        name:  form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: "provider",
      });
      setUser(registered as any);

      const provider   = await api.auth.becomeProvider();
      const providerId = (provider as any).providerId;
      setUser(provider as any);

      let logoUrl:   string | undefined;
      let bannerUrl: string | undefined;
      if (logoFileRef.current)   { try { const r = await api.upload.avatar(logoFileRef.current);  logoUrl   = r.url; } catch {} }
      if (bannerFileRef.current) { try { const r = await api.upload.banner(bannerFileRef.current); bannerUrl = r.url; } catch {} }

      if (providerId) {
        await api.providers.update(providerId, {
          bio: form.bio || undefined,
          ...(logoUrl   ? { avatar: logoUrl }   : {}),
          ...(bannerUrl ? { banner: bannerUrl } : {}),
        });
        await api.users.update((registered as any).id, {
          name: form.companyName.trim() || form.name.trim(),
        });
        if (selectedPkg !== null) {
          try { await api.subscriptions.subscribe(providerId, selectedPkg); } catch {}
        }
      }

      const me = await api.auth.me();
      setUser(me as any);
      // Mark as new user so dashboard shows welcome message
      localStorage.setItem("newUserWelcome", (me as any).name || form.companyName.trim() || form.name.trim());
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success — auto-redirect ── */
  if (done) return (
    <AutoRedirectScreen
      name={form.companyName.trim() || form.name.trim()}
      onRedirect={() => setLocation("/provider/dashboard")}
    />
  );

  /* ── Step labels ── */
  const stepLabels = ["معلومات الحساب", "بيانات الشركة", "الباقة"];

  /* ── Width: wider on step 3 for grid ── */
  const containerWidth = step === 3 ? "max-w-4xl" : "max-w-lg";

  return (
    <div className="min-h-screen bg-zinc-50" dir="rtl">
      <Header />

      <div className={`${containerWidth} mx-auto px-4 py-10 transition-all duration-300`}>

        {/* Page header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-800">إنشاء حساب شركة عقارية</h1>
          <p className="text-zinc-500 mt-1.5 text-sm">انضم إلى منصة عقارات بنها وابدأ نشر عقاراتك</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300
                  ${done ? "bg-primary text-white" : active ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "bg-zinc-200 text-zinc-500"}`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-sm font-semibold hidden sm:block transition-colors shrink-0
                  ${active ? "text-primary" : done ? "text-zinc-600" : "text-zinc-400"}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-zinc-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════ STEP 1 ═══════════ */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-5 animate-in fade-in slide-in-from-right-4 duration-400">
              <div>
                <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />معلومات الحساب
                </h2>
                <p className="text-zinc-500 text-sm mt-0.5">ستستخدم هذه البيانات لتسجيل الدخول</p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">الاسم الكامل *</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input value={form.name}
                    onChange={e => { set({ name: e.target.value }); setErrors(p => ({ ...p, name: "" })); }}
                    placeholder="أحمد محمد"
                    className={`h-12 pr-10 rounded-xl ${errors.name ? "border-red-400" : ""}`} />
                </div>
                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">البريد الإلكتروني *</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input type="email" dir="ltr" value={form.email}
                    onChange={e => { set({ email: e.target.value }); setErrors(p => ({ ...p, email: "" })); }}
                    placeholder="info@company.com"
                    className={`h-12 pr-10 rounded-xl text-right ${errors.email ? "border-red-400" : ""}`} />
                </div>
                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">رقم الهاتف المصري *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 border-l border-zinc-200 pl-2">
                    <span className="text-sm">🇪🇬</span>
                    <span className="text-xs text-zinc-500 font-mono">+20</span>
                  </div>
                  <Input inputMode="numeric" dir="ltr" value={form.phone}
                    onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 11); set({ phone: d }); setErrors(p => ({ ...p, phone: "" })); }}
                    placeholder="01xxxxxxxxx"
                    className={`h-12 pr-10 pl-16 rounded-xl font-mono text-right tracking-wider
                      ${errors.phone ? "border-red-400" : form.phone.length === 11 && validateEgyptianPhone(form.phone) ? "border-emerald-400" : ""}`} />
                  {form.phone.length === 11 && validateEgyptianPhone(form.phone) && (
                    <CheckCircle2 className="absolute left-[68px] top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {errors.phone
                  ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>
                  : <p className="text-xs text-zinc-400">يبدأ بـ 010 أو 011 أو 012 أو 015</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">كلمة المرور *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input type={showPass ? "text" : "password"} dir="ltr" value={form.password}
                    onChange={e => { set({ password: e.target.value }); setErrors(p => ({ ...p, password: "" })); }}
                    placeholder="••••••••" className={`h-12 pr-10 pl-10 rounded-xl ${errors.password ? "border-red-400" : ""}`} />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.score ? pwStrength.color : "bg-zinc-100"}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${pwStrength.score <= 2 ? "text-red-500" : pwStrength.score === 3 ? "text-yellow-600" : "text-emerald-600"}`}>
                      قوة كلمة المرور: {pwStrength.label}
                    </p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">تأكيد كلمة المرور *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input type={showConfirm ? "text" : "password"} dir="ltr" value={form.confirmPassword}
                    onChange={e => { set({ confirmPassword: e.target.value }); setErrors(p => ({ ...p, confirmPassword: "" })); }}
                    placeholder="••••••••"
                    className={`h-12 pr-10 pl-10 rounded-xl ${errors.confirmPassword ? "border-red-400" : form.confirmPassword && form.password === form.confirmPassword ? "border-emerald-400" : ""}`} />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <CheckCircle2 className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword}</p>}
              </div>

              <Button onClick={handleNext} size="lg" className="w-full h-13 rounded-2xl font-bold text-base mt-2 shadow-lg shadow-primary/20">
                التالي — بيانات الشركة <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
              <p className="text-center text-sm text-zinc-500">
                لديك حساب؟{" "}<Link href="/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 2 ═══════════ */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div>
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary transition-colors mb-4">
                  <ArrowLeft className="w-4 h-4 rotate-180" />العودة
                </button>
                <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />بيانات الشركة العقارية
                </h2>
                <p className="text-zinc-500 text-sm mt-0.5">ستظهر هذه المعلومات في ملف شركتك أمام العملاء</p>
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">اسم الشركة العقارية *</Label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input value={form.companyName}
                    onChange={e => { set({ companyName: e.target.value }); setErrors(p => ({ ...p, companyName: "" })); }}
                    placeholder="مثال: شركة الخليج للعقارات"
                    className={`h-12 pr-10 rounded-xl ${errors.companyName ? "border-red-400" : ""}`} />
                </div>
                {errors.companyName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyName}</p>}
              </div>

              {/* Banner */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />بانر الشركة
                  <span className="text-zinc-400 font-normal text-xs">(اختياري)</span>
                </Label>
                <DragDropZone label="اسحب وأفلت صورة البانر" hint="JPG, PNG — حجم موصى به 1200×400"
                  preview={form.bannerPreview} aspectRatio="aspect-[3/1]"
                  onFile={f => { bannerFileRef.current = f; set({ bannerPreview: URL.createObjectURL(f) }); }}
                  onClear={() => { bannerFileRef.current = null; set({ bannerPreview: "" }); }} />
              </div>

              {/* Logo */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />لوجو الشركة
                  <span className="text-zinc-400 font-normal text-xs">(اختياري)</span>
                </Label>
                <div className="flex gap-4 items-start">
                  <div className="w-32 shrink-0">
                    <DragDropZone label="اسحب اللوجو" hint="PNG شفاف مثالي"
                      preview={form.logoPreview} aspectRatio="aspect-square"
                      onFile={f => { logoFileRef.current = f; set({ logoPreview: URL.createObjectURL(f) }); }}
                      onClear={() => { logoFileRef.current = null; set({ logoPreview: "" }); }} />
                  </div>
                  <div className="flex-1 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <p className="text-xs text-zinc-500 font-semibold mb-2">نصائح اللوجو</p>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      <li>• مربع الشكل 1:1</li><li>• خلفية شفافة (PNG)</li>
                      <li>• جودة عالية 500px+</li><li>• لا يزيد عن 5MB</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-zinc-700">
                  نبذة تعريفية<span className="text-zinc-400 font-normal text-xs mr-1">(اختياري)</span>
                </Label>
                <Textarea value={form.bio} onChange={e => set({ bio: e.target.value })}
                  placeholder="اكتب نبذة مختصرة عن شركتك وخبرتها في مجال العقارات..."
                  className="resize-none h-24 rounded-xl" maxLength={500} />
                <p className="text-xs text-zinc-400 text-left" dir="ltr">{form.bio.length}/500</p>
              </div>

              {/* Terms */}
              <div className="space-y-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                <div className="flex items-start gap-3">
                  <Checkbox id="privacy" checked={form.acceptPrivacy}
                    onCheckedChange={v => { set({ acceptPrivacy: !!v }); setErrors(p => ({ ...p, acceptPrivacy: "" })); }} className="mt-0.5" />
                  <label htmlFor="privacy" className="text-sm text-zinc-600 cursor-pointer leading-relaxed">
                    أوافق على <Link href="/privacy" className="text-primary font-semibold hover:underline">سياسة الخصوصية</Link> وكيفية استخدام البيانات
                  </label>
                </div>
                {errors.acceptPrivacy && <p className="text-xs text-red-500 flex items-center gap-1 pr-7"><AlertCircle className="w-3 h-3" />{errors.acceptPrivacy}</p>}
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={form.acceptTerms}
                    onCheckedChange={v => { set({ acceptTerms: !!v }); setErrors(p => ({ ...p, acceptTerms: "" })); }} className="mt-0.5" />
                  <label htmlFor="terms" className="text-sm text-zinc-600 cursor-pointer leading-relaxed">
                    أوافق على <Link href="/terms" className="text-primary font-semibold hover:underline">الشروط والأحكام</Link> للمنصة
                  </label>
                </div>
                {errors.acceptTerms && <p className="text-xs text-red-500 flex items-center gap-1 pr-7"><AlertCircle className="w-3 h-3" />{errors.acceptTerms}</p>}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>بياناتك محمية بتشفير SSL — لن تُشارك مع أي طرف ثالث</span>
              </div>

              <Button onClick={handleNext} size="lg" disabled={submitting}
                className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20">
                التالي — اختيار الباقة <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3 — PACKAGES ═══════════ */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-400 space-y-8">
            <div className="text-center">
              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary transition-colors mx-auto mb-5">
                <ArrowLeft className="w-4 h-4 rotate-180" />العودة
              </button>
              <h2 className="text-2xl font-extrabold text-zinc-800 mb-2">اختر باقتك</h2>
              <p className="text-zinc-500 text-sm max-w-lg mx-auto">
                اختر الباقة المناسبة لنشاطك العقاري. يمكنك الترقية في أي وقت من لوحة التحكم.
              </p>
            </div>

            {pkgsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="mr-3 text-zinc-500 font-medium">جاري تحميل الباقات…</span>
              </div>
            ) : companyPlans.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <PkgIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">لا توجد باقات متاحة للشركات حالياً</p>
                <p className="text-xs mt-1">يمكنك المتابعة والاشتراك لاحقاً من لوحة التحكم</p>
              </div>
            ) : (
              <>
                {/* Premium 4-per-row grid — wraps automatically when more than 4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {companyPlans.map(plan => (
                    <PackageCard
                      key={plan.id}
                      plan={plan}
                      selected={selectedPkg === plan.id}
                      onSelect={() => setSelectedPkg(prev => prev === plan.id ? null : plan.id)}
                    />
                  ))}
                </div>

                {/* Selected summary banner */}
                {selectedPkg !== null && (() => {
                  const p = companyPlans.find(x => x.id === selectedPkg);
                  if (!p) return null;
                  const isFree = parseFloat(p.price) === 0;
                  const accent = p.color || "#0d9488";
                  return (
                    <div className="rounded-2xl px-5 py-4 flex items-center justify-between border"
                      style={{ background: `${accent}0f`, borderColor: `${accent}40` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                          style={{ background: accent }}>
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: accent }}>
                            الباقة المختارة: {p.nameAr ?? p.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {p.durationDays} يوم ·{" "}
                            {isFree ? "مجانية" : `${Number(p.price).toLocaleString("ar")} ${p.currency}`}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedPkg(null)}
                        className="text-xs font-semibold underline shrink-0" style={{ color: accent }}>
                        تغيير
                      </button>
                    </div>
                  );
                })()}

                {/* Skip note */}
                <p className="text-center text-xs text-zinc-400">
                  يمكنك تخطي هذه الخطوة الآن والاشتراك لاحقاً من لوحة التحكم
                </p>
              </>
            )}

            {/* Submit */}
            <div className="max-w-lg mx-auto space-y-3">
              <Button onClick={handleSubmit} size="lg" disabled={submitting}
                className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20">
                {submitting
                  ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري إنشاء الحساب…</>
                  : <><CheckCircle2 className="w-5 h-5 ml-2" />إنشاء حساب الشركة{selectedPkg !== null ? " والاشتراك" : ""}</>}
              </Button>
              {selectedPkg === null && (
                <p className="text-center text-xs text-zinc-400">ستنشئ حساباً بالباقة المجانية</p>
              )}
            </div>
          </div>
        )}

        {/* Login link (steps 1 & 2) */}
        {step < 3 && (
          <p className="text-center text-sm text-zinc-500 mt-6">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
          </p>
        )}
      </div>
      <RealEstateFooter />
    </div>
  );
}
