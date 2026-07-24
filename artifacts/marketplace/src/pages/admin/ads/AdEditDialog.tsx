/**
 * AdEditDialog — Enterprise Ad Editor
 * Type-conditional fields based on contentType selection.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Megaphone, Image, Code2, Tv2, BarChart2, Settings2, Target, Clock } from "lucide-react";

export interface AdSpotForm {
  id?: number;
  name: string;
  position: string;
  isActive: boolean;
  contentType: string;
  displayType: string;
  sortOrder: number;
  priority: number;
  weight: number;
  rotationType: string;
  // Banner / Internal
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  linkTarget: string;
  bgColor: string;
  textColor: string;
  badgeText: string;
  buttonText: string;
  // HTML
  customHtml: string;
  // JS
  customJs: string;
  // AdSense
  adsensePublisherId: string;
  adsenseSlotId: string;
  adsenseFormat: string;
  adsenseResponsive: boolean;
  adsenseAutoAds: boolean;
  // Ad Manager
  admNetworkId: string;
  admUnitId: string;
  admSizes: string;
  // Targeting
  targetGovernorates: string;
  targetCities: string;
  targetCategories: string;
  targetPropertyTypes: string;
  targetListingType: string;
  targetLanguage: string;
  targetDevices: string;
  targetUserType: string;
  targetSubscriptionPlans: string;
  // Scheduling
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleTimeFrom: string;
  scheduleTimeTo: string;
  scheduleAutoEnable: boolean;
  // Rotation
  frequencyCap: string;
  frequencyCapPeriod: string;
  fallbackAdId: string;
  // A/B
  abTestGroupId: string;
  abTestVariant: string;
  // Advertiser
  advertiserId: string;
  campaignId: string;
}

export const EMPTY_AD: AdSpotForm = {
  name: "", position: "hero_bottom", isActive: false,
  contentType: "banner", displayType: "leaderboard",
  sortOrder: 0, priority: 5, weight: 100, rotationType: "weighted",
  title: "", subtitle: "", imageUrl: "", linkUrl: "#", linkTarget: "_blank",
  bgColor: "#0d9488", textColor: "#ffffff", badgeText: "إعلان مدفوع", buttonText: "اعرف أكثر",
  customHtml: "", customJs: "",
  adsensePublisherId: "", adsenseSlotId: "", adsenseFormat: "auto",
  adsenseResponsive: true, adsenseAutoAds: false,
  admNetworkId: "", admUnitId: "", admSizes: "[[728,90],[300,250]]",
  targetGovernorates: "[]", targetCities: "[]", targetCategories: "[]",
  targetPropertyTypes: "[]", targetListingType: "both", targetLanguage: "both",
  targetDevices: "[]", targetUserType: "all", targetSubscriptionPlans: "[]",
  scheduleStartDate: "", scheduleEndDate: "",
  scheduleTimeFrom: "", scheduleTimeTo: "", scheduleAutoEnable: false,
  frequencyCap: "", frequencyCapPeriod: "day", fallbackAdId: "",
  abTestGroupId: "", abTestVariant: "",
  advertiserId: "", campaignId: "",
};

export const POSITION_LABELS: Record<string, string> = {
  hero_bottom: "🏠 الرئيسية — أسفل الهيرو",
  homepage_mid: "🏠 الرئيسية — منتصف الصفحة",
  homepage_before_footer: "🏠 الرئيسية — قبل الفوتر",
  search_top: "🔍 البحث — أعلى النتائج",
  search_inline: "🔍 البحث — داخل النتائج",
  property_sidebar: "🏘️ العقار — الشريط الجانبي",
  property_bottom: "🏘️ العقار — أسفل التفاصيل",
  categories_top: "📂 التصنيفات — أعلى الصفحة",
};

const PRESET_COLORS = [
  "#0d9488","#6366f1","#f59e0b","#ef4444","#3b82f6",
  "#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16",
];

const CONTENT_TYPES = [
  { value: "banner",    label: "🖼️ بانر مصوّر (Image Banner)", icon: Image },
  { value: "html",      label: "📄 HTML مخصص",                 icon: Code2 },
  { value: "adsense",   label: "🔵 Google AdSense",             icon: BarChart2 },
  { value: "admanager", label: "🟡 Google Ad Manager",          icon: Tv2 },
  { value: "javascript",label: "⚙️ JavaScript مخصص",           icon: Settings2 },
  { value: "internal",  label: "⭐ إعلان داخلي (ترويج)",        icon: Megaphone },
];

const DISPLAY_TYPES = [
  { value: "leaderboard", label: "بانر عريض (Leaderboard)" },
  { value: "box",         label: "مربع (Box 300×250)" },
  { value: "native",      label: "بطاقة طبيعية (Native)" },
];

/* ── Live Preview ─────────────────────────────────────────────────────────── */
function LivePreview({ ad }: { ad: AdSpotForm }) {
  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  const type = ad.contentType;

  if (type === "adsense") {
    return (
      <div className="rounded-xl bg-slate-100 border-2 border-dashed border-blue-300 p-6 text-center">
        <div className="text-3xl mb-2">🔵</div>
        <p className="font-bold text-blue-700 text-sm">Google AdSense</p>
        <p className="text-xs text-slate-500 mt-1">Publisher: {ad.adsensePublisherId || "غير محدد"}</p>
        <p className="text-xs text-slate-500">Slot: {ad.adsenseSlotId || "غير محدد"}</p>
        <p className="text-xs text-slate-400 mt-2">Format: {ad.adsenseFormat}</p>
      </div>
    );
  }
  if (type === "admanager") {
    return (
      <div className="rounded-xl bg-slate-100 border-2 border-dashed border-yellow-400 p-6 text-center">
        <div className="text-3xl mb-2">🟡</div>
        <p className="font-bold text-yellow-700 text-sm">Google Ad Manager</p>
        <p className="text-xs text-slate-500 mt-1">Network: {ad.admNetworkId || "غير محدد"}</p>
        <p className="text-xs text-slate-500">Unit: {ad.admUnitId || "غير محدد"}</p>
      </div>
    );
  }
  if (type === "html" && ad.customHtml) {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-200"
        dangerouslySetInnerHTML={{ __html: ad.customHtml }} />
    );
  }
  if (type === "javascript") {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-center">
        <p className="text-emerald-400 font-mono text-xs">// Custom JavaScript Ad</p>
        <p className="text-slate-400 text-xs mt-1">سيتم تنفيذ الكود عند ظهور الإعلان</p>
      </div>
    );
  }

  // Banner / Internal visual preview
  return (
    <div className="rounded-xl overflow-hidden cursor-pointer" style={{ background: bg }}>
      <div className="relative">
        <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full opacity-10" style={{ background: fg }} />
        <div className="relative z-10 p-4 flex items-center gap-4">
          {ad.imageUrl ? (
            <img src={ad.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 shadow" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <Megaphone className="w-5 h-5" style={{ color: fg }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm truncate" style={{ color: fg }}>
              {ad.title || "عنوان الإعلان"}
            </p>
            {ad.subtitle && <p className="text-xs opacity-75 truncate" style={{ color: fg }}>{ad.subtitle}</p>}
          </div>
          {ad.buttonText && (
            <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.2)", color: fg }}>
              {ad.buttonText}
            </span>
          )}
        </div>
        {ad.badgeText && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.2)", color: fg }}>
            {ad.badgeText}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Tag input helper (comma-separated) ─────────────────────────────────── */
function TagInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  let tags: string[] = [];
  try { tags = JSON.parse(value || "[]"); } catch {}

  const add = () => {
    const t = input.trim();
    if (!t) return;
    const next = [...tags.filter(x => x !== t), t];
    onChange(JSON.stringify(next));
    setInput("");
  };
  const remove = (t: string) => onChange(JSON.stringify(tags.filter(x => x !== t)));

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder || "أضف قيمة واضغط Enter"} className="text-sm" />
        <Button type="button" size="sm" variant="outline" onClick={add}>+</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {t}
              <button onClick={() => remove(t)} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Dialog ─────────────────────────────────────────────────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  form: AdSpotForm;
  setForm: (fn: (prev: AdSpotForm) => AdSpotForm) => void;
  onSave: () => void;
  isSaving: boolean;
  isNew: boolean;
}

export function AdEditDialog({ open, onClose, form, setForm, onSave, isSaving, isNew }: Props) {
  const set = <K extends keyof AdSpotForm>(key: K, val: AdSpotForm[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const contentType = form.contentType;
  const isBannerOrInternal = contentType === "banner" || contentType === "internal";
  const isHtml = contentType === "html";
  const isAdsense = contentType === "adsense";
  const isAdManager = contentType === "admanager";
  const isJs = contentType === "javascript";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5 text-primary" />
            {isNew ? "إنشاء إعلان جديد" : "تعديل الإعلان"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <LivePreview ad={form} />
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="content">المحتوى</TabsTrigger>
            <TabsTrigger value="targeting">الاستهداف</TabsTrigger>
            <TabsTrigger value="schedule">الجدولة</TabsTrigger>
            <TabsTrigger value="rotation">التحكم</TabsTrigger>
          </TabsList>

          {/* ─── Content Tab ─────────────────────────────────────────────── */}
          <TabsContent value="content" className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>اسم الإعلان *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="مثال: بانر الشركة X" />
              </div>
              <div className="space-y-1.5">
                <Label>موضع الإعلان *</Label>
                <Select value={form.position} onValueChange={v => set("position", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(POSITION_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                    <SelectItem value="custom">موضع مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content type selector */}
            <div className="space-y-2">
              <Label>نوع الإعلان *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_TYPES.map(ct => (
                  <button key={ct.value} type="button"
                    onClick={() => set("contentType", ct.value)}
                    className={`flex items-center gap-2 text-right p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.contentType === ct.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}>
                    <span>{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Display type (for non-network ads) */}
            {(isBannerOrInternal || isHtml || isJs) && (
              <div className="space-y-1.5">
                <Label>شكل العرض</Label>
                <Select value={form.displayType} onValueChange={v => set("displayType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_TYPES.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Banner / Internal fields ── */}
            {isBannerOrInternal && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>عنوان الإعلان</Label>
                    <Input value={form.title} onChange={e => set("title", e.target.value)}
                      placeholder="العنوان الرئيسي" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>النص التعريفي</Label>
                    <Input value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
                      placeholder="نص وصفي مختصر" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>رابط الصورة</Label>
                    <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)}
                      placeholder="https://example.com/image.jpg" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>رابط الإعلان</Label>
                    <Input value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)}
                      placeholder="https://..." dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>فتح الرابط</Label>
                    <Select value={form.linkTarget} onValueChange={v => set("linkTarget", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_blank">تبويب جديد</SelectItem>
                        <SelectItem value="_self">نفس الصفحة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>نص الشارة</Label>
                    <Input value={form.badgeText} onChange={e => set("badgeText", e.target.value)}
                      placeholder="إعلان مدفوع" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>نص الزر</Label>
                    <Input value={form.buttonText} onChange={e => set("buttonText", e.target.value)}
                      placeholder="اعرف أكثر" />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>لون الخلفية</Label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => set("bgColor", c)} type="button"
                          className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${form.bgColor === c ? "ring-2 ring-offset-1 ring-slate-500 scale-110" : ""}`}
                          style={{ background: c }} />
                      ))}
                      <input type="color" value={form.bgColor}
                        onChange={e => set("bgColor", e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 p-0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>لون النص</Label>
                    <div className="flex gap-2 items-center">
                      {["#ffffff", "#000000", "#1e293b", "#f1f5f9"].map(c => (
                        <button key={c} onClick={() => set("textColor", c)} type="button"
                          className={`w-7 h-7 rounded-lg border transition-all hover:scale-110 ${form.textColor === c ? "ring-2 ring-offset-1 ring-slate-500 scale-110" : "border-slate-200"}`}
                          style={{ background: c }} />
                      ))}
                      <input type="color" value={form.textColor}
                        onChange={e => set("textColor", e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 p-0" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HTML fields ── */}
            {isHtml && (
              <div className="space-y-1.5">
                <Label>كود HTML</Label>
                <Textarea value={form.customHtml}
                  onChange={e => set("customHtml", e.target.value)}
                  placeholder="<div>...</div>"
                  className="font-mono text-xs min-h-[140px]" dir="ltr" />
                <p className="text-xs text-slate-400">يُعرض مباشرةً داخل صفحة الموقع</p>
              </div>
            )}

            {/* ── JavaScript fields ── */}
            {isJs && (
              <div className="space-y-1.5">
                <Label>كود JavaScript</Label>
                <Textarea value={form.customJs}
                  onChange={e => set("customJs", e.target.value)}
                  placeholder={`// يمكن استخدام this للوصول إلى حاوية الإعلان\nconst div = document.createElement('div');\nthis.appendChild(div);`}
                  className="font-mono text-xs min-h-[140px]" dir="ltr" />
                <p className="text-xs text-amber-600">⚠️ تأكد من مصدر الكود — يُنفَّذ مباشرةً في المتصفح</p>
              </div>
            )}

            {/* ── AdSense fields ── */}
            {isAdsense && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700">
                  🔵 يُحمَّل سكريبت AdSense مرة واحدة فقط لكل تحميل صفحة، مما يضمن الامتثال لسياسة Google.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Publisher ID *</Label>
                    <Input value={form.adsensePublisherId}
                      onChange={e => set("adsensePublisherId", e.target.value)}
                      placeholder="pub-XXXXXXXXXXXXXXXX" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ad Slot ID *</Label>
                    <Input value={form.adsenseSlotId}
                      onChange={e => set("adsenseSlotId", e.target.value)}
                      placeholder="1234567890" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ad Format</Label>
                    <Select value={form.adsenseFormat} onValueChange={v => set("adsenseFormat", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (تلقائي)</SelectItem>
                        <SelectItem value="rectangle">Rectangle (مستطيل)</SelectItem>
                        <SelectItem value="vertical">Vertical (رأسي)</SelectItem>
                        <SelectItem value="horizontal">Horizontal (أفقي)</SelectItem>
                        <SelectItem value="fluid">Fluid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Responsive Ads</p>
                      <p className="text-xs text-slate-500">تكيّف الإعلان تلقائياً مع حجم الشاشة</p>
                    </div>
                    <Switch checked={form.adsenseResponsive}
                      onCheckedChange={v => set("adsenseResponsive", v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Auto Ads</p>
                      <p className="text-xs text-slate-500">تفعيل الإعلانات التلقائية من Google</p>
                    </div>
                    <Switch checked={form.adsenseAutoAds}
                      onCheckedChange={v => set("adsenseAutoAds", v)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Ad Manager fields ── */}
            {isAdManager && (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-xs text-yellow-700">
                  🟡 يتطلب Google Ad Manager (GAM) حسابًا على Google Ad Manager وإعداد GPT.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Network ID *</Label>
                    <Input value={form.admNetworkId}
                      onChange={e => set("admNetworkId", e.target.value)}
                      placeholder="/12345678" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ad Unit ID *</Label>
                    <Input value={form.admUnitId}
                      onChange={e => set("admUnitId", e.target.value)}
                      placeholder="/12345678/unit_name" dir="ltr" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Sizes (JSON)</Label>
                    <Input value={form.admSizes}
                      onChange={e => set("admSizes", e.target.value)}
                      placeholder='[[728,90],[970,250],[300,250]]' dir="ltr" />
                    <p className="text-xs text-slate-400">مصفوفة من الأحجام المدعومة بصيغة JSON</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sort & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الترتيب</Label>
                <Input type="number" value={form.sortOrder}
                  onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>الأولوية (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.priority}
                  onChange={e => set("priority", Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-800 text-sm">تفعيل الإعلان</p>
                <p className="text-slate-400 text-xs">يظهر الإعلان على الموقع فوراً عند التفعيل</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} />
            </div>
          </TabsContent>

          {/* ─── Targeting Tab ────────────────────────────────────────────── */}
          <TabsContent value="targeting" className="space-y-5">
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-700">
              🎯 اترك الحقول فارغة للعرض للجميع دون قيود
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>نوع المستخدم</Label>
                <Select value={form.targetUserType} onValueChange={v => set("targetUserType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الجميع</SelectItem>
                    <SelectItem value="logged_in">المسجّلون فقط</SelectItem>
                    <SelectItem value="guests">الزوار فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع الإعلان (بيع/إيجار)</Label>
                <Select value={form.targetListingType} onValueChange={v => set("targetListingType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">الكل</SelectItem>
                    <SelectItem value="sale">بيع فقط</SelectItem>
                    <SelectItem value="rent">إيجار فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>اللغة</Label>
                <Select value={form.targetLanguage} onValueChange={v => set("targetLanguage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">الكل</SelectItem>
                    <SelectItem value="ar">عربي فقط</SelectItem>
                    <SelectItem value="en">إنجليزي فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Devices */}
            <div className="space-y-2">
              <Label>الأجهزة المستهدفة</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "desktop", label: "💻 كمبيوتر" },
                  { value: "tablet",  label: "📱 تابلت" },
                  { value: "mobile",  label: "📱 موبايل" },
                ].map(d => {
                  let devs: string[] = [];
                  try { devs = JSON.parse(form.targetDevices || "[]"); } catch {}
                  const active = devs.includes(d.value);
                  return (
                    <button key={d.value} type="button"
                      onClick={() => {
                        const next = active ? devs.filter(x => x !== d.value) : [...devs, d.value];
                        set("targetDevices", JSON.stringify(next));
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500"
                      }`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">اتركه فارغاً لاستهداف جميع الأجهزة</p>
            </div>

            <TagInput label="المحافظات المستهدفة (IDs)" value={form.targetGovernorates}
              onChange={v => set("targetGovernorates", v)} placeholder="أدخل ID المحافظة واضغط Enter" />
            <TagInput label="المدن المستهدفة (IDs)" value={form.targetCities}
              onChange={v => set("targetCities", v)} placeholder="أدخل ID المدينة واضغط Enter" />
            <TagInput label="تصنيفات العقارات (slug)" value={form.targetCategories}
              onChange={v => set("targetCategories", v)} placeholder="مثال: apartment, villa" />
            <TagInput label="أنواع العقارات" value={form.targetPropertyTypes}
              onChange={v => set("targetPropertyTypes", v)} placeholder="مثال: residential, commercial" />
            <TagInput label="خطط الاشتراك المستهدفة (IDs)" value={form.targetSubscriptionPlans}
              onChange={v => set("targetSubscriptionPlans", v)} placeholder="أدخل ID الخطة واضغط Enter" />

            {/* A/B Testing */}
            <div className="pt-2 border-t border-slate-100">
              <p className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-500" /> اختبار A/B
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>مجموعة الاختبار (Group ID)</Label>
                  <Input value={form.abTestGroupId}
                    onChange={e => set("abTestGroupId", e.target.value)}
                    placeholder="مثال: hero-banner-test" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>المتغير</Label>
                  <Select value={form.abTestVariant || "none"} onValueChange={v => set("abTestVariant", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="بدون اختبار" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون اختبار</SelectItem>
                      <SelectItem value="A">متغير A</SelectItem>
                      <SelectItem value="B">متغير B</SelectItem>
                      <SelectItem value="C">متغير C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                أنشئ إعلانين بنفس الموضع ونفس Group ID لكن متغيرات مختلفة لمقارنة أدائهما.
              </p>
            </div>
          </TabsContent>

          {/* ─── Schedule Tab ─────────────────────────────────────────────── */}
          <TabsContent value="schedule" className="space-y-5">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
              🕒 الجدولة تعمل إضافةً على حالة التفعيل — الإعلان يجب أن يكون مفعّلاً ليعمل الجدول الزمني.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>تاريخ البدء</Label>
                <Input type="datetime-local" value={form.scheduleStartDate}
                  onChange={e => set("scheduleStartDate", e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الانتهاء</Label>
                <Input type="datetime-local" value={form.scheduleEndDate}
                  onChange={e => set("scheduleEndDate", e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>وقت البدء اليومي</Label>
                <Input type="time" value={form.scheduleTimeFrom}
                  onChange={e => set("scheduleTimeFrom", e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>وقت الانتهاء اليومي</Label>
                <Input type="time" value={form.scheduleTimeTo}
                  onChange={e => set("scheduleTimeTo", e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-800 text-sm">تفعيل/إيقاف تلقائي</p>
                <p className="text-slate-400 text-xs">يُفعَّل الإعلان تلقائياً عند بدء الجدول ويُوقَف عند انتهائه</p>
              </div>
              <Switch checked={form.scheduleAutoEnable}
                onCheckedChange={v => set("scheduleAutoEnable", v)} />
            </div>
          </TabsContent>

          {/* ─── Rotation / Control Tab ───────────────────────────────────── */}
          <TabsContent value="rotation" className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>نوع التدوير</Label>
                <Select value={form.rotationType} onValueChange={v => set("rotationType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weighted">مرجّح (Weighted)</SelectItem>
                    <SelectItem value="random">عشوائي (Random)</SelectItem>
                    <SelectItem value="sequential">تسلسلي (Sequential)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الوزن (Weight)</Label>
                <Input type="number" min={1} max={1000} value={form.weight}
                  onChange={e => set("weight", parseInt(e.target.value) || 100)} />
                <p className="text-xs text-slate-400">الوزن الأعلى = ظهور أكثر في التدوير المرجّح</p>
              </div>
              <div className="space-y-1.5">
                <Label>الأولوية (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.priority}
                  onChange={e => set("priority", Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))} />
                <p className="text-xs text-slate-400">الأولوية الأعلى تُفضَّل عند التعارض</p>
              </div>
              <div className="space-y-1.5">
                <Label>Fallback Ad ID</Label>
                <Input type="number" value={form.fallbackAdId}
                  onChange={e => set("fallbackAdId", e.target.value)}
                  placeholder="ID إعلان بديل إذا لم يُحمَّل Google" />
              </div>
            </div>

            {/* Frequency capping */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <p className="font-semibold text-slate-700 text-sm">Frequency Capping</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الحد الأقصى للمشاهدات</Label>
                  <Input type="number" value={form.frequencyCap}
                    onChange={e => set("frequencyCap", e.target.value)}
                    placeholder="مثال: 3 (اتركه فارغاً لعدم التحديد)" />
                </div>
                <div className="space-y-1.5">
                  <Label>الفترة</Label>
                  <Select value={form.frequencyCapPeriod} onValueChange={v => set("frequencyCapPeriod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">لكل ساعة</SelectItem>
                      <SelectItem value="day">لكل يوم</SelectItem>
                      <SelectItem value="week">لكل أسبوع</SelectItem>
                      <SelectItem value="month">لكل شهر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Advertiser link */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <p className="font-semibold text-slate-700 text-sm">ربط بالمعلن</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>ID المعلن</Label>
                  <Input type="number" value={form.advertiserId}
                    onChange={e => set("advertiserId", e.target.value)}
                    placeholder="ID المعلن" />
                </div>
                <div className="space-y-1.5">
                  <Label>ID الحملة</Label>
                  <Input type="number" value={form.campaignId}
                    onChange={e => set("campaignId", e.target.value)}
                    placeholder="ID الحملة" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl">إلغاء</Button>
          <Button onClick={onSave} disabled={isSaving} className="rounded-xl gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? "إنشاء الإعلان" : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
