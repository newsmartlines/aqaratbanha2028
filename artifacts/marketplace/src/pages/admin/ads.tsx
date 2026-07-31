/**
 * Admin Ads — Enterprise Advertising Platform
 * Tabs: Ad Units | Advertisers | Reports
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Megaphone, Plus, Pencil, Trash2, Eye, MousePointerClick,
  Wand2, Loader2, BarChart2, Building2, Target, Clock,
  CheckCircle2, XCircle, TrendingUp, RefreshCw, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { AdEditDialog, type AdSpotForm, EMPTY_AD, POSITION_LABELS } from "./ads/AdEditDialog";
import { AdvertisersTab } from "./ads/AdvertisersTab";
import { ReportsTab } from "./ads/ReportsTab";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface AdSpot {
  id: number; name: string; position: string; isActive: boolean;
  contentType: string; displayType: string; sortOrder: number;
  priority: number; weight: number;
  title?: string | null; subtitle?: string | null; imageUrl?: string | null;
  linkUrl?: string | null; linkTarget?: string | null;
  bgColor?: string | null; textColor?: string | null;
  badgeText?: string | null; buttonText?: string | null;
  customHtml?: string | null; customJs?: string | null;
  adsensePublisherId?: string | null; adsenseSlotId?: string | null;
  adsenseFormat?: string | null; adsenseResponsive?: boolean | null; adsenseAutoAds?: boolean | null;
  admNetworkId?: string | null; admUnitId?: string | null; admSizes?: string | null;
  targetGovernorates?: string | null; targetCities?: string | null;
  targetCategories?: string | null; targetPropertyTypes?: string | null;
  targetListingType?: string | null; targetLanguage?: string | null;
  targetDevices?: string | null; targetUserType?: string | null;
  targetSubscriptionPlans?: string | null;
  scheduleStartDate?: string | null; scheduleEndDate?: string | null;
  scheduleTimeFrom?: string | null; scheduleTimeTo?: string | null;
  scheduleAutoEnable?: boolean | null;
  frequencyCap?: number | null; frequencyCapPeriod?: string | null;
  fallbackAdId?: number | null; rotationType?: string | null;
  abTestGroupId?: string | null; abTestVariant?: string | null;
  advertiserId?: number | null; campaignId?: number | null;
  impressions?: number; clicks?: number;
  lastImpression?: string | null; lastClick?: string | null;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  banner: "🖼️ بانر مصوّر", html: "📄 HTML مخصص",
  adsense: "🔵 Google AdSense", admanager: "🟡 Google Ad Manager",
  javascript: "⚙️ JavaScript مخصص", internal: "⭐ ترويج داخلي",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  banner: "bg-teal-100 text-teal-700", html: "bg-slate-100 text-slate-600",
  adsense: "bg-blue-100 text-blue-700", admanager: "bg-yellow-100 text-yellow-700",
  javascript: "bg-purple-100 text-purple-700", internal: "bg-emerald-100 text-emerald-700",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function adToForm(ad: AdSpot): AdSpotForm {
  return {
    ...EMPTY_AD,
    id: ad.id,
    name: ad.name || "",
    position: ad.position || "hero_bottom",
    isActive: ad.isActive,
    contentType: ad.contentType || "banner",
    displayType: ad.displayType || "leaderboard",
    sortOrder: ad.sortOrder ?? 0,
    priority: ad.priority ?? 5,
    weight: ad.weight ?? 100,
    rotationType: ad.rotationType || "weighted",
    title: ad.title || "",
    subtitle: ad.subtitle || "",
    imageUrl: ad.imageUrl || "",
    linkUrl: ad.linkUrl || "#",
    linkTarget: ad.linkTarget || "_blank",
    bgColor: ad.bgColor || "#0d9488",
    textColor: ad.textColor || "#ffffff",
    badgeText: ad.badgeText || "",
    buttonText: ad.buttonText || "",
    customHtml: ad.customHtml || "",
    customJs: ad.customJs || "",
    adsensePublisherId: ad.adsensePublisherId || "",
    adsenseSlotId: ad.adsenseSlotId || "",
    adsenseFormat: ad.adsenseFormat || "auto",
    adsenseResponsive: ad.adsenseResponsive ?? true,
    adsenseAutoAds: ad.adsenseAutoAds ?? false,
    admNetworkId: ad.admNetworkId || "",
    admUnitId: ad.admUnitId || "",
    admSizes: ad.admSizes || "[[728,90],[300,250]]",
    targetGovernorates: ad.targetGovernorates || "[]",
    targetCities: ad.targetCities || "[]",
    targetCategories: ad.targetCategories || "[]",
    targetPropertyTypes: ad.targetPropertyTypes || "[]",
    targetListingType: ad.targetListingType || "both",
    targetLanguage: ad.targetLanguage || "both",
    targetDevices: ad.targetDevices || "[]",
    targetUserType: ad.targetUserType || "all",
    targetSubscriptionPlans: ad.targetSubscriptionPlans || "[]",
    scheduleStartDate: ad.scheduleStartDate ? ad.scheduleStartDate.slice(0, 16) : "",
    scheduleEndDate: ad.scheduleEndDate ? ad.scheduleEndDate.slice(0, 16) : "",
    scheduleTimeFrom: ad.scheduleTimeFrom || "",
    scheduleTimeTo: ad.scheduleTimeTo || "",
    scheduleAutoEnable: ad.scheduleAutoEnable ?? false,
    frequencyCap: ad.frequencyCap ? String(ad.frequencyCap) : "",
    frequencyCapPeriod: ad.frequencyCapPeriod || "day",
    fallbackAdId: ad.fallbackAdId ? String(ad.fallbackAdId) : "",
    abTestGroupId: ad.abTestGroupId || "",
    abTestVariant: ad.abTestVariant || "",
    advertiserId: ad.advertiserId ? String(ad.advertiserId) : "",
    campaignId: ad.campaignId ? String(ad.campaignId) : "",
  };
}

function formToBody(form: AdSpotForm): Record<string, any> {
  return {
    ...form,
    frequencyCap: form.frequencyCap ? parseInt(form.frequencyCap) : null,
    fallbackAdId: form.fallbackAdId ? parseInt(form.fallbackAdId) : null,
    advertiserId: form.advertiserId ? parseInt(form.advertiserId) : null,
    campaignId: form.campaignId ? parseInt(form.campaignId) : null,
    scheduleStartDate: form.scheduleStartDate || null,
    scheduleEndDate: form.scheduleEndDate || null,
    scheduleTimeFrom: form.scheduleTimeFrom || null,
    scheduleTimeTo: form.scheduleTimeTo || null,
  };
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function AdminAds() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"units" | "advertisers" | "reports">("units");
  const [editForm, setEditForm] = useState<AdSpotForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  /* ── Queries ── */
  const { data: ads = [], isFetching } = useQuery<AdSpot[]>({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const r = await fetch("/api/admin/ads", { credentials: "include" });
      return (await r.json()).data ?? [];
    },
  });

  /* ── Mutations ── */
  const seedMut = useMutation({
    mutationFn: async () => (await fetch("/api/admin/ads/seed", { method: "POST", credentials: "include" })).json(),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success(d.inserted > 0 ? `تم إضافة ${d.inserted} موضع إعلاني` : "جميع المواضع موجودة بالفعل");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (id: number) => (await fetch(`/api/admin/ads/${id}/toggle`, { method: "PATCH", credentials: "include" })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
    onError: () => toast.error("فشل التبديل"),
  });

  const saveMut = useMutation({
    mutationFn: async (form: AdSpotForm) => {
      const url = isNew ? "/api/admin/ads" : `/api/admin/ads/${form.id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToBody(form)),
      });
      return r.json();
    },
    onSuccess: (d) => {
      if (!d.success) { toast.error(d.error || "فشل الحفظ"); return; }
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["ads-public"] });
      setEditForm(null);
      toast.success(isNew ? "تم إنشاء الإعلان ✓" : "تم حفظ التغييرات ✓");
    },
    onError: () => toast.error("فشل الحفظ"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/admin/ads/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["ads-public"] });
      toast.success("تم الحذف");
    },
  });

  /* ── Filtering ── */
  const filtered = ads.filter(ad => {
    if (filterType !== "all" && ad.contentType !== filterType) return false;
    if (filterStatus === "active" && !ad.isActive) return false;
    if (filterStatus === "inactive" && ad.isActive) return false;
    return true;
  });

  const ctr = (ad: AdSpot) =>
    ad.impressions && ad.clicks
      ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%` : "—";

  const hasTargeting = (ad: AdSpot) =>
    [ad.targetGovernorates, ad.targetCities, ad.targetCategories, ad.targetDevices, ad.targetPropertyTypes]
      .some(v => { try { return v && JSON.parse(v).length > 0; } catch { return false; } })
    || (ad.targetUserType && ad.targetUserType !== "all")
    || (ad.targetListingType && ad.targetListingType !== "both");

  const hasSchedule = (ad: AdSpot) => !!(ad.scheduleStartDate || ad.scheduleEndDate || ad.scheduleTimeFrom);

  const hasAbTest = (ad: AdSpot) => !!(ad.abTestGroupId);

  /* ── Summary stats ── */
  const totalImpressions = ads.reduce((s, a) => s + (a.impressions ?? 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks ?? 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              منصة الإعلانات
            </h1>
            <p className="text-slate-500 text-sm mt-1">إدارة متكاملة للإعلانات والمعلنين والتقارير</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "units" && (
              <>
                <Button variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
                  className="gap-2 rounded-xl border-slate-200 text-sm">
                  <Wand2 className={`w-4 h-4 ${seedMut.isPending ? "animate-spin" : ""}`} />
                  المواضع الافتراضية
                </Button>
                <Button onClick={() => { setIsNew(true); setEditForm({ ...EMPTY_AD }); }} className="gap-2 rounded-xl text-sm">
                  <Plus className="w-4 h-4" /> إعلان جديد
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "إجمالي الوحدات",  value: ads.length,                    color: "bg-slate-100 text-slate-700" },
            { label: "مفعّلة",          value: ads.filter(a => a.isActive).length, color: "bg-emerald-100 text-emerald-700" },
            { label: "موقوفة",          value: ads.filter(a => !a.isActive).length, color: "bg-red-50 text-red-500" },
            { label: "إجمالي المشاهدات", value: totalImpressions.toLocaleString("ar-EG"), color: "bg-primary/10 text-primary" },
            { label: "إجمالي النقرات",   value: totalClicks.toLocaleString("ar-EG"),  color: "bg-indigo-100 text-indigo-700" },
            { label: "CTR العام",        value: `${overallCtr}%`,               color: "bg-amber-100 text-amber-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color} flex flex-col gap-1`}>
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-[11px] font-medium opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Tabs ── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {[
            { key: "units",       label: "وحدات الإعلانات", icon: Megaphone },
            { key: "advertisers", label: "المعلنون",         icon: Building2 },
            { key: "reports",     label: "التقارير",         icon: BarChart2 },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.key
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ Ad Units Tab ════════════════════════════════════════════════ */}
        {activeTab === "units" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {["all", "banner", "html", "adsense", "admanager", "javascript", "internal"].map(t => (
                  <button key={t} onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === t ? "bg-white text-primary shadow-sm" : "text-slate-500"
                    }`}>
                    {t === "all" ? "الكل" : CONTENT_TYPE_LABELS[t]?.split(" ").slice(0, 2).join(" ") || t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs mr-2">
                {[
                  { key: "all",      label: "الكل" },
                  { key: "active",   label: "✓ مفعّل" },
                  { key: "inactive", label: "✗ موقوف" },
                ].map(s => (
                  <button key={s.key} onClick={() => setFilterStatus(s.key)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterStatus === s.key ? "bg-white text-primary shadow-sm" : "text-slate-500"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {isFetching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            {/* Ad Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                <Megaphone className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-bold text-slate-600 mb-2">لا توجد إعلانات</h3>
                <p className="text-slate-400 text-sm mb-4">اضغط "المواضع الافتراضية" لإضافة 8 مواضع جاهزة</p>
                <Button onClick={() => seedMut.mutate()} className="gap-2 rounded-full px-8" disabled={seedMut.isPending}>
                  <Wand2 className="w-4 h-4" /> إنشاء المواضع الافتراضية
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(ad => (
                  <div key={ad.id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md
                      ${ad.isActive ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200 opacity-80"}`}>

                    {/* Color strip */}
                    <div className="h-1.5 w-full" style={{ background: ad.bgColor || "#0d9488" }} />

                    <div className="p-5 space-y-3">
                      {/* Top */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate text-sm">{ad.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {POSITION_LABELS[ad.position] ?? ad.position}
                          </p>
                        </div>
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

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`text-[10px] ${CONTENT_TYPE_COLORS[ad.contentType] || "bg-slate-100"}`}>
                          {CONTENT_TYPE_LABELS[ad.contentType] || ad.contentType}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400">
                          أولوية {ad.priority ?? 5}
                        </Badge>
                        {hasTargeting(ad) && (
                          <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-500">
                            <Target className="w-2.5 h-2.5 mr-1" />استهداف
                          </Badge>
                        )}
                        {hasSchedule(ad) && (
                          <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-500">
                            <Clock className="w-2.5 h-2.5 mr-1" />مجدوَل
                          </Badge>
                        )}
                        {hasAbTest(ad) && (
                          <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-500">
                            A/B
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          {(ad.impressions ?? 0).toLocaleString("ar-EG")}
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />
                          {(ad.clicks ?? 0).toLocaleString("ar-EG")}
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          {ctr(ad)}
                        </div>
                        {ad.lastImpression && (
                          <div className="text-[10px] text-slate-400 mr-auto">
                            {new Date(ad.lastImpression).toLocaleDateString("ar-EG")}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="outline"
                          onClick={() => { setIsNew(false); setEditForm(adToForm(ad)); }}
                          className="flex-1 gap-1.5 rounded-xl border-slate-200 text-xs h-8">
                          <Pencil className="w-3 h-3" /> تعديل
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => { if (confirm("تأكيد حذف هذا الإعلان؟")) deleteMut.mutate(ad.id); }}
                          className="gap-1.5 rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs h-8">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ Advertisers Tab ═════════════════════════════════════════════ */}
        {activeTab === "advertisers" && <AdvertisersTab />}

        {/* ══ Reports Tab ═════════════════════════════════════════════════ */}
        {activeTab === "reports" && <ReportsTab />}
      </div>

      {/* ── Edit / Create Dialog ── */}
      {editForm && (
        <AdEditDialog
          open={!!editForm}
          onClose={() => setEditForm(null)}
          form={editForm}
          setForm={setEditForm as any}
          onSave={() => editForm && saveMut.mutate(editForm)}
          isSaving={saveMut.isPending}
          isNew={isNew}
        />
      )}
    </AdminLayout>
  );
}
