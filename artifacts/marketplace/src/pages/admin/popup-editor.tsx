import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Megaphone, Plus, ArrowRight, X, Loader2, Upload, Image as ImageIcon, Check, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

interface Popup {
  id?: number;
  name: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  bgColor?: string | null;
  overlayOpacity?: number | null;
  textColor?: string | null;
  btnColor?: string | null;
  btnTextColor?: string | null;
  borderRadius?: number | null;
  size?: string | null;
  position?: string | null;
  triggerType?: string | null;
  triggerDelay?: number | null;
  triggerScrollPct?: number | null;
  pages?: string | null;
  showCloseBtn?: boolean | null;
  cookieDuration?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

const EMPTY: Popup = {
  name: "", title: "", description: "", imageUrl: "",
  ctaText: "", ctaLink: "",
  bgColor: "#ffffff", overlayOpacity: 50,
  textColor: "#111827", btnColor: "#0d9488", btnTextColor: "#ffffff",
  borderRadius: 12, size: "md", position: "center",
  triggerType: "immediate", triggerDelay: 3, triggerScrollPct: 50,
  pages: '["all"]', showCloseBtn: true, cookieDuration: 1,
  startDate: "", endDate: "", isActive: false, sortOrder: 0,
};

const TEMPLATES: { label: string; emoji: string; desc: string; data: Partial<Popup> }[] = [
  {
    label: "ترحيب بالزوار",
    emoji: "👋",
    desc: "بوب آب أهلاً وسهلاً للزيارة الأولى",
    data: {
      name: "ترحيب بالزوار", title: "أهلاً بك في عقارات بنها!",
      description: "اكتشف أفضل العقارات في بنها بأسعار تنافسية. سجّل الآن واحصل على تنبيهات مجانية.",
      ctaText: "تصفّح العقارات", ctaLink: "/properties",
      bgColor: "#0d9488", textColor: "#ffffff", btnColor: "#ffffff", btnTextColor: "#0d9488",
      borderRadius: 16, triggerType: "delay", triggerDelay: 3,
    },
  },
  {
    label: "عرض خاص",
    emoji: "🔥",
    desc: "إعلان عروض ترويجية وخصومات",
    data: {
      name: "عرض خاص", title: "🔥 عرض محدود المدة!",
      description: "شقق وفيلات بأسعار مخفوضة في بنها — العرض ينتهي قريباً!",
      ctaText: "اغتنم الفرصة", ctaLink: "/properties",
      bgColor: "#1e293b", textColor: "#fbbf24", btnColor: "#f59e0b", btnTextColor: "#1e293b",
      borderRadius: 12, triggerType: "delay", triggerDelay: 5,
    },
  },
  {
    label: "تنبيه إشعارات",
    emoji: "🔔",
    desc: "اطلب من الزائر تفعيل الإشعارات",
    data: {
      name: "تنبيه إشعارات", title: "لا تفوّت أي فرصة!",
      description: "فعّل الإشعارات وكن أول من يعرف عن العقارات الجديدة في منطقتك.",
      ctaText: "تفعيل الإشعارات", ctaLink: "",
      bgColor: "#7c3aed", textColor: "#ffffff", btnColor: "#a78bfa", btnTextColor: "#1e1b4b",
      borderRadius: 20, triggerType: "scroll", triggerScrollPct: 40, position: "bottom-right",
    },
  },
  {
    label: "نية المغادرة",
    emoji: "🚪",
    desc: "يظهر حين يريد الزائر المغادرة",
    data: {
      name: "قبل أن تغادر", title: "انتظر! لديك عقارات لم تراها",
      description: "لا تغادر قبل أن تطّلع على أحدث العقارات المضافة هذا الأسبوع.",
      ctaText: "أرني العقارات", ctaLink: "/properties",
      bgColor: "#ffffff", textColor: "#111827", btnColor: "#0d9488", btnTextColor: "#ffffff",
      borderRadius: 12, triggerType: "exit",
    },
  },
  {
    label: "تسجيل / اشتراك",
    emoji: "📧",
    desc: "شجّع الزوار على التسجيل",
    data: {
      name: "دعوة التسجيل", title: "سجّل مجاناً الآن",
      description: "احفظ بحثك، تابع العقارات المفضلة، واستلم تنبيهات فورية لكل إعلان جديد.",
      ctaText: "إنشاء حساب مجاني", ctaLink: "/register",
      bgColor: "#f0fdf4", textColor: "#166534", btnColor: "#16a34a", btnTextColor: "#ffffff",
      borderRadius: 14, triggerType: "delay", triggerDelay: 8, position: "bottom",
    },
  },
  {
    label: "صورة كاملة",
    emoji: "🖼️",
    desc: "بوب آب مبني على صورة بانر كبيرة",
    data: {
      name: "إعلان مصوّر", title: "عقارات بنها",
      description: "شريكك الموثوق في البحث عن منزل أحلامك",
      ctaText: "اعرف أكثر", ctaLink: "/about",
      bgColor: "#111827", textColor: "#ffffff", btnColor: "#0d9488", btnTextColor: "#ffffff",
      borderRadius: 8, size: "lg", triggerType: "immediate",
    },
  },
];

const PAGES_OPTIONS = [
  { value: "all", label: "كل الموقع" },
  { value: "home", label: "الرئيسية" },
  { value: "properties", label: "نتائج البحث" },
  { value: "property", label: "صفحة عقار معين" },
];

const SIZE_OPTIONS = [
  { value: "sm", label: "صغير (SM)" },
  { value: "md", label: "متوسط (MD)" },
  { value: "lg", label: "كبير (LG)" },
  { value: "xl", label: "كبير جداً (XL)" },
];

const POSITION_OPTIONS = [
  { value: "center", label: "المنتصف" },
  { value: "top", label: "أعلى" },
  { value: "bottom", label: "أسفل" },
  { value: "bottom-right", label: "أسفل يمين" },
  { value: "bottom-left", label: "أسفل يسار" },
  { value: "top-right", label: "أعلى يمين" },
  { value: "top-left", label: "أعلى يسار" },
];

const TRIGGER_OPTIONS = [
  { value: "immediate", label: "فور دخول الصفحة" },
  { value: "delay", label: "بعد عدد ثواني" },
  { value: "scroll", label: "عند النزول (Scroll)" },
  { value: "exit", label: "نية المغادرة (Exit Intent)" },
];

const PRESET_COLORS = [
  "#ffffff", "#111827", "#0d9488", "#3b82f6", "#8b5cf6",
  "#ef4444", "#f59e0b", "#10b981", "#ec4899", "#1e293b",
];

function parsePages(val: string | null | undefined): string[] {
  if (!val) return ["all"];
  try { return JSON.parse(val); } catch { return ["all"]; }
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 shrink-0" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="flex-1 h-8 text-xs font-mono" />
      </div>
      <div className="flex gap-1 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-5 h-5 rounded border transition-transform hover:scale-110 ${value === c ? "ring-2 ring-primary ring-offset-1" : "border-gray-200"}`}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function PopupPreview({ form }: { form: Partial<Popup> }) {
  const radius = form.borderRadius ?? 12;
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 flex items-center justify-center min-h-[200px]">
      <div
        className="relative w-full max-w-xs shadow-xl overflow-hidden"
        style={{ borderRadius: radius, background: form.bgColor ?? "#ffffff", color: form.textColor ?? "#111827" }}
        dir="rtl"
      >
        {form.imageUrl && (
          <img src={form.imageUrl} alt="" className="w-full h-32 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        <div className="p-4">
          {form.title && <h3 className="font-bold text-base mb-1 leading-snug">{form.title}</h3>}
          {form.description && <p className="text-xs opacity-70 mb-3 line-clamp-2 leading-relaxed">{form.description}</p>}
          {form.ctaText && (
            <button type="button"
              className="w-full py-2 rounded-lg text-sm font-bold"
              style={{ background: form.btnColor ?? "#0d9488", color: form.btnTextColor ?? "#ffffff", borderRadius: radius * 0.5 }}
            >
              {form.ctaText}
            </button>
          )}
        </div>
        {form.showCloseBtn !== false && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
            <X className="w-3 h-3" style={{ color: form.textColor ?? "#111827" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PopupEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const editId = params?.id ? parseInt(params.id) : null;
  const qc = useQueryClient();

  const [form, setForm] = useState<Popup>(EMPTY);
  const [step, setStep] = useState<"template" | "edit">(editId ? "edit" : "template");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: popupData } = useQuery<{ success: boolean; data: Popup }>({
    queryKey: ["popup", editId],
    queryFn: () => fetch(`/api/admin/popups/${editId}`).then(r => r.json()),
    enabled: !!editId,
  });
  useEffect(() => {
    if (popupData?.data) setForm({ ...EMPTY, ...popupData.data });
  }, [popupData]);

  const saveMut = useMutation({
    mutationFn: (body: Partial<Popup>) =>
      editId
        ? fetch(`/api/admin/popups/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json())
        : fetch("/api/admin/popups", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => {
      toast.success(editId ? "تم التحديث ✓" : "تم إنشاء البوب آب ✓");
      qc.invalidateQueries({ queryKey: ["admin-popups"] });
      setLocation("/admin/popups");
    },
    onError: () => toast.error("حدث خطأ، حاول مجدداً"),
  });

  const f = (k: keyof Popup, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const pages = parsePages(form.pages);
  const togglePage = (val: string) => {
    let next: string[];
    if (val === "all") { next = ["all"]; }
    else {
      const cur = pages.filter(p => p !== "all");
      next = cur.includes(val) ? cur.filter(p => p !== val) : [...cur, val];
      if (!next.length) next = ["all"];
    }
    f("pages", JSON.stringify(next));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة أكبر من 5MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await fetch("/api/upload/banner", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (data.url) {
        f("imageUrl", `/api-server${data.url}`);
        toast.success("تم رفع الصورة ✓");
      } else {
        toast.error("فشل رفع الصورة");
      }
    } catch {
      toast.error("خطأ في رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  if (step === "template") {
    return (
      <AdminLayout>
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
          <div className="flex items-center gap-3 mb-8">
            <button type="button" onClick={() => setLocation("/admin/popups")}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" /> اختر قالب للبداية
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">اختر قالباً جاهزاً وخصّصه كما تشاء، أو ابدأ من الصفر</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setForm({ ...EMPTY, ...tpl.data });
                  setStep("edit");
                }}
                className="group text-right p-5 rounded-2xl border-2 border-gray-200 hover:border-primary hover:shadow-lg transition-all bg-white"
              >
                <div className="text-3xl mb-3">{tpl.emoji}</div>
                <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{tpl.label}</div>
                <div className="text-xs text-gray-500 mt-1">{tpl.desc}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setStep("edit");
              }}
              className="group text-right p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary hover:shadow-lg transition-all bg-white"
            >
              <div className="text-3xl mb-3"><Plus className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" /></div>
              <div className="font-bold text-gray-500 group-hover:text-primary transition-colors">ابدأ من الصفر</div>
              <div className="text-xs text-gray-400 mt-1">قالب فارغ بدون تصميم مسبق</div>
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => editId ? setLocation("/admin/popups") : setStep("template")}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                {editId ? "تعديل البوب آب" : "إنشاء بوب آب جديد"}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">خصّص التصميم والسلوك ثم احفظ</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive !== false} onCheckedChange={v => f("isActive", v)} />
              <Label className="text-sm font-medium">{form.isActive ? "مفعّل" : "معطّل"}</Label>
            </div>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name.trim()} className="gap-2 rounded-xl">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              حفظ البوب آب
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN FORM */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">١</span>
                المعلومات الأساسية
              </h2>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم البوب آب (داخلي للأدمن)</Label>
                <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: عرض رمضان" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">العنوان (يظهر للزائر)</Label>
                  <Input value={form.title ?? ""} onChange={e => f("title", e.target.value)} placeholder="عنوان البوب آب" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">رابط زر الإجراء (CTA)</Label>
                  <Input value={form.ctaLink ?? ""} onChange={e => f("ctaLink", e.target.value)} placeholder="/properties" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Textarea rows={2} value={form.description ?? ""} onChange={e => f("description", e.target.value)} placeholder="نص توضيحي..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نص زر الإجراء (CTA)</Label>
                <Input value={form.ctaText ?? ""} onChange={e => f("ctaText", e.target.value)} placeholder="مثال: اعرف أكثر" />
              </div>
            </section>

            {/* Image Upload */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٢</span>
                الصورة / البانر
              </h2>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">رابط URL للصورة</Label>
                  <Input value={form.imageUrl ?? ""} onChange={e => f("imageUrl", e.target.value)} placeholder="https://... أو ارفع صورة →" dir="ltr" />
                </div>
                <div className="shrink-0 pt-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2 rounded-xl h-10"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "جاري الرفع..." : "رفع صورة"}
                  </Button>
                </div>
              </div>
              {form.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 h-36">
                  <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => f("imageUrl", "")}
                    className="absolute top-2 left-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {!form.imageUrl && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary/40 hover:text-primary/60 transition-colors">
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-xs">اضغط لرفع صورة أو ضع رابطاً أعلاه</span>
                </button>
              )}
            </section>

            {/* Schedule */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٣</span>
                جدولة الظهور (اختياري)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">📅 تاريخ ووقت البداية</Label>
                  <Input
                    type="datetime-local"
                    value={(form.startDate ?? "").replace("Z", "").slice(0, 16)}
                    onChange={e => f("startDate", e.target.value || null)}
                    className="h-10 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">اتركه فارغاً للبدء فوراً</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">📅 تاريخ ووقت الانتهاء</Label>
                  <Input
                    type="datetime-local"
                    value={(form.endDate ?? "").replace("Z", "").slice(0, 16)}
                    onChange={e => f("endDate", e.target.value || null)}
                    className="h-10 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">اتركه فارغاً لعدم التوقف</p>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٤</span>
                المظهر والألوان
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker label="لون الخلفية" value={form.bgColor ?? "#ffffff"} onChange={v => f("bgColor", v)} />
                <ColorPicker label="لون النص" value={form.textColor ?? "#111827"} onChange={v => f("textColor", v)} />
                <ColorPicker label="لون الزر" value={form.btnColor ?? "#0d9488"} onChange={v => f("btnColor", v)} />
                <ColorPicker label="لون نص الزر" value={form.btnTextColor ?? "#ffffff"} onChange={v => f("btnTextColor", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تدوير الزوايا: {form.borderRadius ?? 12}px</Label>
                <Slider min={0} max={32} step={2} value={[form.borderRadius ?? 12]}
                  onValueChange={([v]) => f("borderRadius", v)} className="my-1" />
              </div>
            </section>

            {/* Layout */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٥</span>
                التخطيط والموضع
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">حجم البوب آب</Label>
                  <Select value={form.size ?? "md"} onValueChange={v => f("size", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">مكان الظهور على الشاشة</Label>
                  <Select value={form.position ?? "center"} onValueChange={v => f("position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{POSITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Trigger */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٦</span>
                طريقة وتوقيت الظهور
              </h2>
              <Select value={form.triggerType ?? "immediate"} onValueChange={v => f("triggerType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {form.triggerType === "delay" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">عدد الثواني قبل الظهور: {form.triggerDelay ?? 3} ثانية</Label>
                  <Slider min={1} max={30} step={1} value={[form.triggerDelay ?? 3]}
                    onValueChange={([v]) => f("triggerDelay", v)} />
                </div>
              )}
              {form.triggerType === "scroll" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">يظهر بعد نزول: {form.triggerScrollPct ?? 50}% من الصفحة</Label>
                  <Slider min={10} max={100} step={5} value={[form.triggerScrollPct ?? 50]}
                    onValueChange={([v]) => f("triggerScrollPct", v)} />
                </div>
              )}
            </section>

            {/* Pages & Behavior */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">٧</span>
                الصفحات والسلوك
              </h2>
              <div>
                <Label className="text-xs mb-2 block">يظهر في هذه الصفحات</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGES_OPTIONS.map(o => (
                    <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={pages.includes(o.value)} onCheckedChange={() => togglePage(o.value)} />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={form.showCloseBtn !== false} onCheckedChange={v => f("showCloseBtn", v)} />
                <Label className="text-sm">إظهار زر الإغلاق (X)</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">عدم إظهاره مجدداً لمدة: {form.cookieDuration ?? 1} {form.cookieDuration === 0 ? "— يظهر في كل زيارة" : "يوم"}</Label>
                <Slider min={0} max={30} step={1} value={[form.cookieDuration ?? 1]}
                  onValueChange={([v]) => f("cookieDuration", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ترتيب الأولوية (في حالة وجود أكثر من بوب آب)</Label>
                <Input type="number" value={form.sortOrder ?? 0} onChange={e => f("sortOrder", parseInt(e.target.value) || 0)} className="w-28 h-9" />
              </div>
            </section>
          </div>

          {/* LIVE PREVIEW SIDEBAR */}
          <div className="space-y-4">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  معاينة مباشرة
                </h2>
                <PopupPreview form={form} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-gray-800 text-sm">ملخص الإعدادات</h2>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">الحالة</span>
                    <Badge variant={form.isActive ? "default" : "secondary"} className="text-[10px]">
                      {form.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">الحجم</span>
                    <span>{SIZE_OPTIONS.find(s => s.value === form.size)?.label ?? form.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">الموضع</span>
                    <span>{POSITION_OPTIONS.find(s => s.value === form.position)?.label ?? form.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">طريقة الظهور</span>
                    <span>{TRIGGER_OPTIONS.find(s => s.value === form.triggerType)?.label ?? form.triggerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">الصفحات</span>
                    <span>{pages.map(p => PAGES_OPTIONS.find(o => o.value === p)?.label ?? p).join("، ")}</span>
                  </div>
                  {form.startDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">يبدأ</span>
                      <span>{new Date(form.startDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  )}
                  {form.endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">ينتهي</span>
                      <span>{new Date(form.endDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => saveMut.mutate(form)}
                disabled={saveMut.isPending || !form.name.trim()}
                className="w-full gap-2 rounded-xl h-11"
              >
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? "حفظ التعديلات" : "نشر البوب آب"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
