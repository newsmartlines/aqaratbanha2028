import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
  Megaphone, Plus, Pencil, Trash2, Eye, MousePointerClick,
  Power, PowerOff, Loader2, Wand2, RefreshCw, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

interface AdSpot {
  id: number; name: string; position: string; isActive: boolean; adType: string;
  title?: string | null; subtitle?: string | null; imageUrl?: string | null;
  linkUrl?: string | null; linkTarget?: string | null;
  bgColor?: string | null; textColor?: string | null;
  badgeText?: string | null; buttonText?: string | null;
  customHtml?: string | null; sortOrder?: number;
  impressions?: number; clicks?: number;
}

const POSITION_LABELS: Record<string, string> = {
  hero_bottom: "🏠 الرئيسية — بانر أسفل الهيرو",
  homepage_mid: "🏠 الرئيسية — بانر المنتصف",
  homepage_before_footer: "🏠 الرئيسية — قبل الفوتر",
  search_top: "🔍 البحث — أعلى النتائج",
  search_inline: "🔍 البحث — داخل النتائج (native)",
  property_sidebar: "🏘️ العقار — الشريط الجانبي",
  property_bottom: "🏘️ العقار — أسفل التفاصيل",
  categories_top: "📂 التصنيفات — أعلى الصفحة",
};

const AD_TYPES = [
  { value: "leaderboard", label: "بانر عريض (Leaderboard)" },
  { value: "box", label: "مربع (Box 300×250)" },
  { value: "native", label: "إعلان طبيعي (Native Card)" },
];

const PRESET_COLORS = [
  "#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const EMPTY_AD: Partial<AdSpot> = {
  name: "", position: "hero_bottom", isActive: false, adType: "leaderboard",
  title: "", subtitle: "", imageUrl: "", linkUrl: "#", linkTarget: "_blank",
  bgColor: "#0d9488", textColor: "#ffffff", badgeText: "إعلان مدفوع",
  buttonText: "اعرف أكثر", customHtml: "", sortOrder: 0,
};

/* ── Live Preview — defined OUTSIDE the component so React never recreates it ── */
function LivePreview({ ad }: { ad: Partial<AdSpot> }) {
  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{ background: bg }}
    >
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
            {ad.subtitle && (
              <p className="text-xs opacity-75 truncate" style={{ color: fg }}>{ad.subtitle}</p>
            )}
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

export default function AdminAds() {
  const qc = useQueryClient();
  const [editAd, setEditAd] = useState<Partial<AdSpot> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [previewAd, setPreviewAd] = useState<AdSpot | null>(null);

  /* ── Queries ── */
  const { data: ads = [], isFetching } = useQuery<AdSpot[]>({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const r = await fetch("/api/admin/ads", { credentials: "include" });
      return (await r.json()).data ?? [];
    },
  });

  /* ── Seed default positions ── */
  const seedMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/ads/seed", { method: "POST", credentials: "include" });
      return r.json();
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success(d.inserted > 0 ? `تم إضافة ${d.inserted} موضع إعلاني جديد` : "جميع المواضع موجودة بالفعل");
    },
  });

  /* ── Toggle active ── */
  const toggleMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/ads/${id}/toggle`, { method: "PATCH", credentials: "include" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
    onError: () => toast.error("فشل التبديل"),
  });

  /* ── Save (create or update) ── */
  const saveMut = useMutation({
    mutationFn: async (body: Partial<AdSpot>) => {
      const url = isNew ? "/api/admin/ads" : `/api/admin/ads/${body.id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      setEditAd(null);
      toast.success(isNew ? "تم إنشاء الإعلان" : "تم حفظ التغييرات");
    },
    onError: () => toast.error("فشل الحفظ"),
  });

  /* ── Delete ── */
  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/admin/ads/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("تم الحذف");
    },
  });

  const openNew = () => { setIsNew(true); setEditAd({ ...EMPTY_AD }); };
  const openEdit = (ad: AdSpot) => { setIsNew(false); setEditAd({ ...ad }); };
  const ctr = (e: AdSpot) => e.impressions && e.clicks
    ? `${((e.clicks / e.impressions) * 100).toFixed(1)}%` : "—";


  /* ── Render ── */
  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              إدارة الإعلانات
            </h1>
            <p className="text-slate-500 text-sm mt-1">تحكم في مواضع الإعلانات وتفعيلها أو إيقافها بسهولة</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
              className="gap-2 rounded-xl border-slate-200">
              <Wand2 className={`w-4 h-4 ${seedMut.isPending ? "animate-spin" : ""}`} />
              إنشاء المواضع الافتراضية
            </Button>
            <Button onClick={openNew} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> إعلان جديد
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "إجمالي المواضع", value: ads.length, color: "bg-primary/10 text-primary" },
            { label: "مفعّل", value: ads.filter(a => a.isActive).length, color: "bg-emerald-100 text-emerald-700" },
            { label: "موقوف", value: ads.filter(a => !a.isActive).length, color: "bg-slate-100 text-slate-600" },
            { label: "إجمالي المشاهدات", value: ads.reduce((s, a) => s + (a.impressions ?? 0), 0).toLocaleString("ar-EG"), color: "bg-indigo-100 text-indigo-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color} flex flex-col gap-1`}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs font-medium opacity-75">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ad Cards Grid */}
        {isFetching && !ads.length ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
            <Megaphone className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600 mb-2">لا توجد مواضع إعلانية بعد</h3>
            <p className="text-slate-400 text-sm mb-4">اضغط "إنشاء المواضع الافتراضية" لإضافة 8 مواضع جاهزة في ثوانٍ</p>
            <Button onClick={() => seedMut.mutate()} className="gap-2 rounded-full px-8" disabled={seedMut.isPending}>
              <Wand2 className="w-4 h-4" /> إنشاء المواضع الافتراضية
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ads.map(ad => (
              <div key={ad.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md
                  ${ad.isActive ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200 opacity-75"}`}>

                {/* Color strip preview */}
                <div className="h-2 w-full" style={{ background: ad.bgColor || "#0d9488" }} />

                <div className="p-5 space-y-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{ad.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {POSITION_LABELS[ad.position] ?? ad.position}
                      </p>
                    </div>
                    {/* Active toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${ad.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                        {ad.isActive ? "مفعّل" : "موقوف"}
                      </span>
                      <Switch
                        checked={ad.isActive}
                        onCheckedChange={() => toggleMut.mutate(ad.id)}
                        disabled={toggleMut.isPending}
                      />
                    </div>
                  </div>

                  {/* Badge row */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                      {AD_TYPES.find(t => t.value === ad.adType)?.label ?? ad.adType}
                    </Badge>
                    {ad.linkUrl && ad.linkUrl !== "#" && (
                      <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-500">
                        <ExternalLink className="w-2.5 h-2.5 mr-1" />
                        رابط خارجي
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      {(ad.impressions ?? 0).toLocaleString("ar-EG")} مشاهدة
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />
                      {(ad.clicks ?? 0).toLocaleString("ar-EG")} نقرة
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="text-xs font-bold text-slate-600">CTR: {ctr(ad)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(ad)}
                      className="flex-1 gap-1.5 rounded-xl border-slate-200 text-xs">
                      <Pencil className="w-3 h-3" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => setPreviewAd(ad)}
                      className="gap-1.5 rounded-xl border-slate-200 text-xs">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => { if (confirm("تأكيد الحذف؟")) deleteMut.mutate(ad.id); }}
                      className="gap-1.5 rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit / Create Dialog ── */}
      <Dialog open={!!editAd} onOpenChange={v => !v && setEditAd(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              {isNew ? "إنشاء إعلان جديد" : "تعديل الإعلان"}
            </DialogTitle>
          </DialogHeader>

          {editAd && (
            <div className="space-y-5 py-2">
              {/* Live preview */}
              <div>
                <Label className="text-xs text-slate-500 mb-2 block">معاينة مباشرة</Label>
                <LivePreview ad={editAd} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label>اسم الإعلان *</Label>
                  <Input value={editAd.name ?? ""} onChange={e => setEditAd(p => ({ ...p!, name: e.target.value }))}
                    placeholder="مثال: بانر الشركة X" />
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <Label>موضع الإعلان *</Label>
                  <Select value={editAd.position ?? "hero_bottom"} onValueChange={v => setEditAd(p => ({ ...p!, position: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ad Type */}
                <div className="space-y-1.5">
                  <Label>نوع الإعلان</Label>
                  <Select value={editAd.adType ?? "leaderboard"} onValueChange={v => setEditAd(p => ({ ...p!, adType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Link URL */}
                <div className="space-y-1.5">
                  <Label>رابط الإعلان</Label>
                  <Input value={editAd.linkUrl ?? ""} onChange={e => setEditAd(p => ({ ...p!, linkUrl: e.target.value }))}
                    placeholder="https://..." dir="ltr" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>عنوان الإعلان</Label>
                <Input value={editAd.title ?? ""} onChange={e => setEditAd(p => ({ ...p!, title: e.target.value }))}
                  placeholder="العنوان الرئيسي للإعلان" />
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5">
                <Label>النص التعريفي</Label>
                <Input value={editAd.subtitle ?? ""} onChange={e => setEditAd(p => ({ ...p!, subtitle: e.target.value }))}
                  placeholder="نص وصفي مختصر" />
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <Label>رابط الصورة</Label>
                <Input value={editAd.imageUrl ?? ""} onChange={e => setEditAd(p => ({ ...p!, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Badge text */}
                <div className="space-y-1.5">
                  <Label>نص الشارة</Label>
                  <Input value={editAd.badgeText ?? ""} onChange={e => setEditAd(p => ({ ...p!, badgeText: e.target.value }))}
                    placeholder="إعلان مدفوع" />
                </div>

                {/* Button text */}
                <div className="space-y-1.5">
                  <Label>نص الزر</Label>
                  <Input value={editAd.buttonText ?? ""} onChange={e => setEditAd(p => ({ ...p!, buttonText: e.target.value }))}
                    placeholder="اعرف أكثر" />
                </div>

                {/* Link target */}
                <div className="space-y-1.5">
                  <Label>فتح الرابط</Label>
                  <Select value={editAd.linkTarget ?? "_blank"} onValueChange={v => setEditAd(p => ({ ...p!, linkTarget: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_blank">تبويب جديد</SelectItem>
                      <SelectItem value="_self">نفس الصفحة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort order */}
                <div className="space-y-1.5">
                  <Label>الترتيب</Label>
                  <Input type="number" value={editAd.sortOrder ?? 0}
                    onChange={e => setEditAd(p => ({ ...p!, sortOrder: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label>لون الخلفية</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setEditAd(p => ({ ...p!, bgColor: c }))}
                      className={`w-8 h-8 rounded-xl transition-all hover:scale-110 ${editAd.bgColor === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={editAd.bgColor || "#0d9488"}
                    onChange={e => setEditAd(p => ({ ...p!, bgColor: e.target.value }))}
                    className="w-8 h-8 rounded-xl cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-400">لون مخصص</span>
                </div>
              </div>

              {/* Custom HTML (advanced) */}
              <details className="border border-slate-200 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span>HTML مخصص (متقدم)</span>
                  <span className="text-xs text-slate-400">— يتجاوز كل الإعدادات أعلاه</span>
                </summary>
                <div className="p-4">
                  <Textarea
                    value={editAd.customHtml ?? ""}
                    onChange={e => setEditAd(p => ({ ...p!, customHtml: e.target.value }))}
                    placeholder="<div>...</div> — أدخل كود HTML مخصص للإعلان"
                    className="font-mono text-xs min-h-[100px]" dir="ltr"
                  />
                </div>
              </details>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800 text-sm">تفعيل الإعلان</p>
                  <p className="text-slate-400 text-xs">يظهر الإعلان على الموقع فوراً عند التفعيل</p>
                </div>
                <Switch
                  checked={editAd.isActive ?? false}
                  onCheckedChange={v => setEditAd(p => ({ ...p!, isActive: v }))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditAd(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={() => editAd && saveMut.mutate(editAd)} disabled={saveMut.isPending}
              className="rounded-xl gap-2">
              {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isNew ? "إنشاء الإعلان" : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ── */}
      <Dialog open={!!previewAd} onOpenChange={v => !v && setPreviewAd(null)}>
        <DialogContent className="max-w-lg bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة الإعلان</DialogTitle>
          </DialogHeader>
          {previewAd && <LivePreview ad={previewAd} />}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
            <p>📍 الموضع: {POSITION_LABELS[previewAd?.position ?? ""] ?? previewAd?.position}</p>
            <p>👁️ {(previewAd?.impressions ?? 0).toLocaleString("ar-EG")} مشاهدة &nbsp;•&nbsp; 🖱️ {(previewAd?.clicks ?? 0).toLocaleString("ar-EG")} نقرة</p>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
