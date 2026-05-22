import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api, mediaUrl, type Package } from "@/lib/api";
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

/* ─── Build readable feature bullets from package data ─── */
function buildFeatures(pkg: Package): string[] {
  const f: string[] = [];
  const price = parseFloat(pkg.price);
  if (price === 0)      f.push("نشر مجاني بدون رسوم");
  else                  f.push(`نشر لمدة ${pkg.durationDays} يوماً`);
  if (pkg.maxListings)  f.push(`حتى ${pkg.maxListings} إعلان نشط`);
  else                  f.push("عدد إعلانات غير محدود");
  if (pkg.featuredAllowed && pkg.featuredAllowed > 0)
                        f.push(`${pkg.featuredAllowed} إعلان مميز`);
  if (pkg.topBadge)     f.push("شارة أعلى النتائج");
  const comm = parseFloat(pkg.commissionRate);
  if (comm > 0)         f.push(`عمولة ${comm}% فقط`);
  else                  f.push("بدون عمولة على المبيعات");
  if (pkg.priorityRank >= 2) f.push("أولوية في نتائج البحث");
  if (pkg.priorityRank >= 1) f.push("دعم فني مخصص");
  return f;
}

/* ─── Package card ─── */
function PackageCard({
  pkg, selected, onSelect, recommended,
}: {
  pkg: Package; selected: boolean; onSelect: () => void; recommended?: boolean;
}) {
  const price   = parseFloat(pkg.price);
  const isFree  = price === 0;
  const features = buildFeatures(pkg);

  // Tier style
  let ring   = "border-zinc-200";
  let badge  = "";
  let btnCls = "bg-teal-600 hover:bg-teal-700 text-white";
  let rankBg = "from-zinc-50 to-zinc-100";

  if (recommended) {
    ring   = "border-amber-400 shadow-amber-100 shadow-xl";
    badge  = "الأكثر طلباً";
    btnCls = "bg-amber-500 hover:bg-amber-600 text-white";
    rankBg = "from-amber-50 to-amber-100/60";
  } else if (pkg.topBadge) {
    ring   = "border-purple-300 shadow-purple-50 shadow-lg";
    badge  = "مميز";
    btnCls = "bg-purple-600 hover:bg-purple-700 text-white";
    rankBg = "from-purple-50 to-purple-100/40";
  } else if (pkg.priorityRank >= 1) {
    ring   = "border-teal-300 shadow-teal-50 shadow-md";
    rankBg = "from-teal-50 to-teal-100/40";
  }

  if (selected) {
    ring   = "border-teal-600 shadow-teal-100 shadow-xl ring-2 ring-teal-400 ring-offset-2";
    btnCls = "bg-teal-700 text-white";
  }

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border-2 bg-white transition-all duration-200 cursor-pointer flex flex-col overflow-hidden group
        hover:shadow-xl hover:-translate-y-1 ${ring}`}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-0 right-0 left-0 flex justify-center -translate-y-1/2 z-10">
          <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm
            ${recommended ? "bg-amber-500 text-white" : "bg-purple-600 text-white"}`}>
            {badge}
          </span>
        </div>
      )}

      {/* Selected check */}
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center z-10">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${rankBg} px-5 pt-7 pb-5 border-b border-zinc-100`}>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{pkg.nameEn || ""}</p>
        <h3 className="text-lg font-extrabold text-zinc-800 mb-3">{pkg.nameAr}</h3>
        <div className="flex items-end gap-1">
          {isFree ? (
            <span className="text-3xl font-black text-emerald-600">مجاني</span>
          ) : (
            <>
              <span className="text-3xl font-black text-zinc-800">{Number(price).toLocaleString("ar")}</span>
              <span className="text-sm text-zinc-400 mb-1">ج.م / {pkg.durationDays}ي</span>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="px-5 py-4 flex-1 space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
              ${selected ? "bg-teal-100" : "bg-zinc-100 group-hover:bg-teal-50"}`}>
              <Check className={`w-2.5 h-2.5 ${selected ? "text-teal-600" : "text-zinc-400 group-hover:text-teal-500"}`} strokeWidth={3} />
            </div>
            <span className="text-sm text-zinc-600">{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button type="button" onClick={e => { e.stopPropagation(); onSelect(); }}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${selected ? btnCls : "bg-zinc-100 text-zinc-700 group-hover:bg-teal-600 group-hover:text-white"}`}>
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

  const { data: pkgs = [], isLoading: pkgsLoading } = useQuery<Package[]>({
    queryKey: ["packages"],
    queryFn: api.packages.list,
    staleTime: 5 * 60_000,
  });

  // Sort packages by priorityRank asc (free first, then tiers)
  const sortedPkgs = [...pkgs].sort((a, b) => a.priorityRank - b.priorityRank);
  // Find recommended = highest priorityRank or topBadge
  const recommendedId = sortedPkgs.find(p => p.topBadge)?.id
    ?? sortedPkgs[Math.floor(sortedPkgs.length / 2)]?.id;

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
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success ── */
  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-zinc-800 mb-2">تم تسجيل شركتك بنجاح!</h1>
          <p className="text-zinc-500 text-lg leading-relaxed">مرحباً بك في عقارات بنها. يمكنك الآن نشر عقاراتك والوصول إلى آلاف العملاء.</p>
        </div>
        <div className="space-y-3 pt-2">
          <Button size="lg" className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20" onClick={() => setLocation("/dashboard")}>
            <Building2 className="w-5 h-5 ml-2" />الذهاب إلى لوحة التحكم
          </Button>
          <Button variant="outline" size="lg" className="w-full h-12 rounded-2xl text-base font-semibold" onClick={() => setLocation("/real-estate-onboarding")}>
            أضف عقارك الأول الآن
          </Button>
        </div>
      </div>
    </div>
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
            ) : sortedPkgs.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <PkgIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">لا توجد باقات متاحة حالياً</p>
              </div>
            ) : (
              <>
                {/* Grid: max 4 per row */}
                <div className={`grid gap-5
                  ${sortedPkgs.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : ""}
                  ${sortedPkgs.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : ""}
                  ${sortedPkgs.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : ""}
                  ${sortedPkgs.length >= 4  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : ""}`}>
                  {sortedPkgs.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      selected={selectedPkg === pkg.id}
                      onSelect={() => setSelectedPkg(prev => prev === pkg.id ? null : pkg.id)}
                      recommended={pkg.id === recommendedId}
                    />
                  ))}
                </div>

                {/* Selected summary */}
                {selectedPkg !== null && (() => {
                  const p = sortedPkgs.find(x => x.id === selectedPkg);
                  if (!p) return null;
                  const isFree = parseFloat(p.price) === 0;
                  return (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <div>
                          <p className="font-bold text-teal-800 text-sm">الباقة المختارة: {p.nameAr}</p>
                          <p className="text-xs text-teal-600">{p.durationDays} يوم · {isFree ? "مجانية" : `${Number(p.price).toLocaleString("ar")} ج.م`}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedPkg(null)}
                        className="text-xs text-teal-500 hover:text-teal-700 font-semibold underline shrink-0">تغيير</button>
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
    </div>
  );
}
