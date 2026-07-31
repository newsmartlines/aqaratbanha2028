import { useState } from "react";
import {
  TrendingUp, Zap, Star, Sparkles, DollarSign,
  RefreshCw, Loader2, X, ChevronRight, ChevronLeft,
  Building2, User, Clock, CheckCircle2, ShieldOff,
  ShoppingCart, Settings, Flame, Diamond, Tag, Rocket,
  BarChart3, AlertTriangle, BadgeCheck, Edit3, Save,
  XCircle, Eye, Receipt, Plus, Database,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { promotions } from "@/lib/api";
import { api } from "@/lib/api";

const PAGE_SIZE = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

type PromoDashboard = {
  stats: {
    totalActive: number; activeBumps: number; activeFeatured: number;
    activeSpotlight: number; manualCount: number; addonCount: number;
    revenue: number; totalGranted: number; totalUsed: number;
  };
  activePromos: Array<{
    id: number; propertyId: number; userId: number; type: string; source: string;
    boostScore: number; expiresAt: string | null; isActive: boolean; createdAt: string;
    propertyTitle: string | null; propertyStatus: string | null;
    userName: string | null; userEmail: string | null;
  }>;
  topProperties: Array<{
    propertyId: number; propertyTitle: string | null; userName: string | null;
    totalBoost: number; types: string | null;
  }>;
};

type PromotionTypeRow = {
  id: number; key: string; nameAr: string; nameEn: string; descriptionAr: string | null;
  isEnabled: boolean; price: string; durationDays: number; boostScore: number;
  badgeText: string | null; badgeColor: string; badgeBgColor: string; maxSimultaneous: number;
  vatPercent: string; discountPercent: string; requiresApproval: boolean; autoExpiry: boolean;
  priority: number; benefits: string | null; visibility: string;
};

type PurchaseRow = {
  id: number; userId: number; propertyId: number; promotionTypeId: number; promotionId: number | null;
  status: string; paymentMethod: string; priceAtPurchase: string; vatAmount: string; totalAmount: string;
  durationDays: number; paymentReference: string | null; adminNote: string | null;
  approvedAt: string | null; expiresAt: string | null; createdAt: string;
  propertyTitle: string | null; userName: string | null; userEmail: string | null;
  typeNameAr: string | null; typeKey: string | null; typeBadgeBgColor: string | null; typeBadgeColor: string | null;
};

type RevenueData = {
  summary: { totalRevenue: number; pendingCount: number; activeCount: number; expiredCount: number; rejectedCount: number; cancelledCount: number };
  byType: Array<{ typeNameAr: string | null; typeKey: string | null; typeBadgeBgColor: string | null; count: number; revenue: number }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  bump_up: Zap, spotlight: Sparkles, featured_homepage: Star,
  featured_category: Tag, urgent_badge: Flame, premium_listing: Diamond,
  bump: TrendingUp, featured: Star,
};

const TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string; badge: string }> = {
  bump:              { label: "ترفيع",     icon: TrendingUp, cls: "text-blue-600 bg-blue-50",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  bump_up:           { label: "Bump Up",   icon: Zap,        cls: "text-blue-600 bg-blue-50",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  featured:          { label: "مميّز",    icon: Star,       cls: "text-amber-600 bg-amber-50",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  featured_homepage: { label: "مميز رئيسي", icon: Star,     cls: "text-amber-600 bg-amber-50",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  featured_category: { label: "مميز قسم", icon: Tag,        cls: "text-orange-600 bg-orange-50", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  spotlight:         { label: "سبوتلايت", icon: Sparkles,   cls: "text-purple-600 bg-purple-50", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  urgent_badge:      { label: "عاجل",     icon: Flame,      cls: "text-red-600 bg-red-50",       badge: "bg-red-50 text-red-700 border-red-200" },
  premium_listing:   { label: "بريميوم",  icon: Diamond,    cls: "text-violet-600 bg-violet-50", badge: "bg-violet-50 text-violet-700 border-violet-200" },
};

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  plan:   { label: "باقة", cls: "bg-slate-100 text-slate-600" },
  addon:  { label: "إضافة", cls: "bg-teal-50 text-teal-700" },
  manual: { label: "يدوي", cls: "bg-orange-50 text-orange-700" },
  paid:   { label: "مدفوع", cls: "bg-violet-50 text-violet-700" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "انتظار", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active:    { label: "نشط",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired:   { label: "منتهي", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled: { label: "ملغي",  cls: "bg-red-50 text-red-500 border-red-200" },
  rejected:  { label: "مرفوض", cls: "bg-red-50 text-red-600 border-red-200" },
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}
function fmtMoney(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? "0" : n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function StatCard({ label, value, sub, icon: Icon, valueColor = "text-slate-900" }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; valueColor?: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        <p className={`text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Type Editor Row ───────────────────────────────────────────────────────────

function TypeEditorRow({ pt, onSave }: { pt: PromotionTypeRow; onSave: (id: number, data: Partial<PromotionTypeRow>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    price: pt.price,
    durationDays: String(pt.durationDays),
    boostScore: String(pt.boostScore),
    vatPercent: pt.vatPercent,
    discountPercent: pt.discountPercent,
    isEnabled: pt.isEnabled,
    requiresApproval: pt.requiresApproval,
    badgeBgColor: pt.badgeBgColor,
  });
  const Icon = TYPE_ICONS[pt.key] ?? Rocket;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(pt.id, {
        price: form.price,
        durationDays: parseInt(form.durationDays),
        boostScore: parseInt(form.boostScore),
        vatPercent: form.vatPercent,
        discountPercent: form.discountPercent,
        isEnabled: form.isEnabled,
        requiresApproval: form.requiresApproval,
        badgeBgColor: form.badgeBgColor,
      } as any);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`border rounded-xl p-4 transition-all ${form.isEnabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-70"}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: form.badgeBgColor }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-slate-800">{pt.nameAr}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${form.isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {form.isEnabled ? "مفعّل" : "معطّل"}
            </span>
          </div>
          {!editing && (
            <p className="text-xs text-slate-500 mt-0.5">
              {fmtMoney(form.price)} ج.م · {form.durationDays} يوم · boostScore: {form.boostScore}
              {parseFloat(form.vatPercent) > 0 ? ` · VAT ${form.vatPercent}%` : ""}
              {parseFloat(form.discountPercent) > 0 ? ` · خصم ${form.discountPercent}%` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setForm(f => ({ ...f, isEnabled: !f.isEnabled })); }}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${form.isEnabled ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
          >
            {form.isEnabled ? "تعطيل" : "تفعيل"}
          </button>
          <button
            onClick={() => setEditing(e => !e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">السعر (ج.م)</Label>
            <Input type="number" min={0} step={0.01} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">المدة (أيام)</Label>
            <Input type="number" min={1} value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Boost Score</Label>
            <Input type="number" min={0} value={form.boostScore} onChange={e => setForm(f => ({ ...f, boostScore: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">اللون (#hex)</Label>
            <div className="flex gap-1">
              <input type="color" value={form.badgeBgColor} onChange={e => setForm(f => ({ ...f, badgeBgColor: e.target.value }))} className="w-8 h-8 cursor-pointer rounded border" />
              <Input value={form.badgeBgColor} onChange={e => setForm(f => ({ ...f, badgeBgColor: e.target.value }))} className="h-8 text-xs flex-1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">VAT %</Label>
            <Input type="number" min={0} max={100} step={0.01} value={form.vatPercent} onChange={e => setForm(f => ({ ...f, vatPercent: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">خصم %</Label>
            <Input type="number" min={0} max={100} step={0.01} value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2 flex items-center gap-4 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} className="w-4 h-4" />
              يحتاج موافقة إدارية
            </label>
          </div>
          <div className="col-span-2 sm:col-span-4 flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 h-8 text-xs gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              حفظ التغييرات
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-8 text-xs">إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPromotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"monitor" | "purchases" | "types" | "revenue">("monitor");

  // Legacy monitor state
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [applyPropertyId, setApplyPropertyId] = useState("");
  const [applyType, setApplyType] = useState<"bump" | "featured" | "spotlight">("bump");
  const [applyDays, setApplyDays] = useState("7");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantType, setGrantType] = useState("bump");
  const [grantQty, setGrantQty] = useState("1");
  const [grantNote, setGrantNote] = useState("");

  // Purchases state
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Create type modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const EMPTY_FORM = {
    key: "", nameAr: "", nameEn: "", descriptionAr: "",
    price: "0", durationDays: "7", boostScore: "100",
    badgeText: "", badgeColor: "#FFFFFF", badgeBgColor: "#14b8a6",
    vatPercent: "0", discountPercent: "0",
    isEnabled: true, requiresApproval: true, autoExpiry: true,
    priority: "10", visibility: "all",
    benefits: "",
  };
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-promotions-dashboard"],
    queryFn: () => promotions.adminDashboard(),
    refetchInterval: 20_000,
  });

  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ["admin-promotion-purchases", purchaseStatusFilter],
    queryFn: () => api.fetchJson(`/admin/promotion-purchases${purchaseStatusFilter !== "all" ? `?status=${purchaseStatusFilter}` : ""}`),
    enabled: activeTab === "purchases",
  });

  const { data: typesData, isLoading: typesLoading, refetch: refetchTypes } = useQuery({
    queryKey: ["admin-promotion-types"],
    queryFn: () => api.fetchJson("/admin/promotion-types"),
    enabled: activeTab === "types",
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-promotion-revenue"],
    queryFn: () => api.fetchJson("/admin/promotion-purchases/revenue"),
    enabled: activeTab === "revenue",
  });

  const dash: PromoDashboard | null = data ?? null;
  const purchases: PurchaseRow[] = purchasesData ?? [];
  const promotionTypes: PromotionTypeRow[] = typesData ?? [];
  const revenue: RevenueData | null = revenueData ?? null;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const revokeMutation = useMutation({
    mutationFn: (id: number) => promotions.adminRevoke(id),
    onSuccess: () => { toast({ title: "✅ تم إلغاء الترقية" }); queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] }); },
    onError: (e: any) => toast({ title: "فشل الإلغاء", description: e?.message, variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: async ({ propertyId, type, days }: { propertyId: number; type: string; days: number }) => {
      if (type === "bump") return promotions.adminBumpProperty(propertyId, days);
      if (type === "featured") return promotions.adminFeatureProperty(propertyId);
      if (type === "spotlight") return promotions.adminSpotlightProperty(propertyId);
      throw new Error("نوع غير معروف");
    },
    onSuccess: () => { toast({ title: "✅ تم تطبيق الترقية بنجاح" }); setApplyPropertyId(""); queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] }); },
    onError: (e: any) => toast({ title: "فشل التطبيق", description: e?.message, variant: "destructive" }),
  });

  const grantMutation = useMutation({
    mutationFn: (d: { userId: number; type: string; quantity: number; note?: string }) => promotions.adminGrantAddon(d),
    onSuccess: () => { toast({ title: "✅ تم منح الإضافات بنجاح" }); setGrantUserId(""); setGrantQty("1"); setGrantNote(""); queryClient.invalidateQueries({ queryKey: ["admin-promotions-dashboard"] }); },
    onError: (e: any) => toast({ title: "فشل المنح", description: e?.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/promotion-purchases/${id}/approve`, { method: "POST" }),
    onSuccess: () => { toast({ title: "✅ تمت الموافقة وتفعيل الترقية" }); refetchPurchases(); },
    onError: (e: any) => toast({ title: "فشل الموافقة", description: e?.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.fetchJson(`/admin/promotion-purchases/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNote: note }) }),
    onSuccess: () => { toast({ title: "تم رفض الطلب" }); setRejectId(null); setRejectNote(""); refetchPurchases(); },
    onError: (e: any) => toast({ title: "فشل الرفض", description: e?.message, variant: "destructive" }),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PromotionTypeRow> }) =>
      api.fetchJson(`/admin/promotion-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "✅ تم حفظ التعديلات" }); refetchTypes(); },
    onError: (e: any) => toast({ title: "فشل الحفظ", description: e?.message, variant: "destructive" }),
  });

  const createTypeMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.fetchJson("/admin/promotion-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "✅ تم إضافة نوع الترقية بنجاح" });
      setCreateModalOpen(false);
      setCreateForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-types"] });
      refetchTypes();
    },
    onError: (e: any) => toast({ title: "فشل الإضافة", description: e?.message, variant: "destructive" }),
  });

  const seedTypesMutation = useMutation({
    mutationFn: () => api.fetchJson("/admin/promotion-types/seed", { method: "POST" }),
    onSuccess: (res: any) => {
      toast({ title: `✅ تم إضافة ${res.inserted} نوع من الأنواع الافتراضية` });
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-types"] });
      refetchTypes();
    },
    onError: (e: any) => toast({ title: "فشل البذر", description: e?.message, variant: "destructive" }),
  });

  // Legacy handlers
  const promos = dash?.activePromos ?? [];
  const filtered = typeFilter === "all" ? promos : promos.filter(p => p.type === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = purchases.filter(p => p.status === "pending").length;

  const tabs = [
    { key: "monitor",   label: "المراقبة النشطة", icon: Eye },
    { key: "purchases", label: "طلبات الشراء", icon: ShoppingCart, badge: activeTab !== "purchases" ? undefined : purchases.filter(p => p.status === "pending").length },
    { key: "types",     label: "إعدادات الأنواع", icon: Settings },
    { key: "revenue",   label: "التقارير والإيرادات", icon: BarChart3 },
  ] as const;

  return (
    <AdminLayout title="الترقيات والبوستات">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">إدارة شاملة لترقيات العقارات المدفوعة والمجانية</p>
        <Button variant="outline" size="sm" onClick={() => { refetch(); refetchPurchases(); }} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === "purchases" && pendingCount > 0 && activeTab !== "purchases" && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Monitor Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "monitor" && (
        isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="ترفيعات نشطة" value={dash?.stats.activeBumps ?? 0} sub="bump نشط" icon={TrendingUp} valueColor="text-blue-600" />
              <StatCard label="مميّزة نشطة" value={dash?.stats.activeFeatured ?? 0} sub="featured نشط" icon={Star} valueColor="text-amber-600" />
              <StatCard label="سبوتلايت نشط" value={dash?.stats.activeSpotlight ?? 0} sub="spotlight نشط" icon={Sparkles} valueColor="text-purple-600" />
              <StatCard label="إيرادات الإضافات" value={`${fmtMoney(dash?.stats.revenue)} ج.م`} sub={`${dash?.stats.totalUsed ?? 0} / ${dash?.stats.totalGranted ?? 0}`} icon={DollarSign} valueColor="text-emerald-600" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Active promotions table */}
              <div className="xl:col-span-2">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-700">
                      الترقيات النشطة <Badge variant="outline" className="mr-2 text-xs">{filtered.length}</Badge>
                    </CardTitle>
                    <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="bump">ترفيع</SelectItem>
                        <SelectItem value="featured">مميّز</SelectItem>
                        <SelectItem value="spotlight">سبوتلايت</SelectItem>
                        <SelectItem value="bump_up">Bump Up</SelectItem>
                        <SelectItem value="premium_listing">بريميوم</SelectItem>
                        <SelectItem value="urgent_badge">عاجل</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 bg-slate-50">
                          <TableHead className="text-right">العقار</TableHead>
                          <TableHead className="text-right">المستخدم</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">المصدر</TableHead>
                          <TableHead className="text-right">تنتهي</TableHead>
                          <TableHead className="text-right w-14">إلغاء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paged.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-12 text-sm">لا توجد ترقيات نشطة</TableCell></TableRow>
                        ) : paged.map(promo => {
                          const tm = TYPE_META[promo.type] ?? TYPE_META.bump;
                          const sm = SOURCE_META[promo.source] ?? SOURCE_META.plan;
                          const TypeIcon = tm.icon;
                          return (
                            <TableRow key={promo.id} className="hover:bg-slate-50">
                              <TableCell className="max-w-[180px]">
                                <p className="text-sm font-medium text-slate-700 truncate">{promo.propertyTitle ?? `#${promo.propertyId}`}</p>
                                <p className="text-xs text-slate-400">ID: {promo.propertyId}</p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs text-slate-600 truncate">{promo.userName ?? "—"}</p>
                                <p className="text-xs text-slate-400">{promo.userEmail ?? ""}</p>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${tm.badge}`}>
                                  <TypeIcon className="w-3 h-3" />{tm.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sm.cls}`}>{sm.label}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />{fmtDate(promo.expiresAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <button
                                  onClick={() => revokeMutation.mutate(promo.id)}
                                  disabled={revokeMutation.isPending && revokeMutation.variables === promo.id}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  {revokeMutation.isPending && revokeMutation.variables === promo.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <ShieldOff className="w-3.5 h-3.5" />}
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}</p>
                      <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
              {/* Right col: manual apply + grant + top properties */}
              <div className="flex flex-col gap-5">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2"><Zap className="w-4 h-4 text-teal-500" />تطبيق ترقية يدوياً</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5"><Label className="text-xs text-slate-500">رقم العقار (ID)</Label><Input type="number" placeholder="مثال: 42" value={applyPropertyId} onChange={e => setApplyPropertyId(e.target.value)} className="h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs text-slate-500">نوع الترقية</Label>
                      <Select value={applyType} onValueChange={v => setApplyType(v as any)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bump">ترفيع (Bump)</SelectItem>
                          <SelectItem value="featured">مميّز (Featured)</SelectItem>
                          <SelectItem value="spotlight">سبوتلايت (Spotlight)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {applyType === "bump" && (<div className="space-y-1.5"><Label className="text-xs text-slate-500">المدة (أيام)</Label><Input type="number" placeholder="7" value={applyDays} onChange={e => setApplyDays(e.target.value)} className="h-9 text-sm" min={1} max={365} /></div>)}
                    <Button className="w-full h-9 text-sm bg-teal-600 hover:bg-teal-700" onClick={() => { const pid = parseInt(applyPropertyId, 10); if (isNaN(pid) || pid <= 0) { toast({ title: "أدخل رقم العقار", variant: "destructive" }); return; } applyMutation.mutate({ propertyId: pid, type: applyType, days: parseInt(applyDays, 10) || 7 }); }} disabled={applyMutation.isPending}>
                      {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <CheckCircle2 className="w-4 h-4 ml-1" />}تطبيق
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-500" />منح إضافات لمستخدم</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5"><Label className="text-xs text-slate-500">رقم المستخدم (ID)</Label><Input type="number" placeholder="مثال: 5" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} className="h-9 text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">النوع</Label>
                        <Select value={grantType} onValueChange={setGrantType}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="bump">ترفيع</SelectItem><SelectItem value="featured">مميّز</SelectItem><SelectItem value="spotlight">سبوتلايت</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">الكمية</Label><Input type="number" placeholder="1" value={grantQty} onChange={e => setGrantQty(e.target.value)} className="h-9 text-sm" min={1} /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs text-slate-500">ملاحظة</Label><Input placeholder="سبب المنح..." value={grantNote} onChange={e => setGrantNote(e.target.value)} className="h-9 text-sm" /></div>
                    <Button variant="outline" className="w-full h-9 text-sm border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => { const uid = parseInt(grantUserId, 10); const qty = parseInt(grantQty, 10); if (isNaN(uid) || uid <= 0) { toast({ title: "أدخل رقم المستخدم", variant: "destructive" }); return; } if (isNaN(qty) || qty <= 0) { toast({ title: "أدخل كمية صحيحة", variant: "destructive" }); return; } grantMutation.mutate({ userId: uid, type: grantType, quantity: qty, note: grantNote || undefined }); }} disabled={grantMutation.isPending}>
                      {grantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}منح الإضافات
                    </Button>
                  </CardContent>
                </Card>
                {(dash?.topProperties?.length ?? 0) > 0 && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="px-5 py-4 border-b border-slate-100">
                      <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-500" />أعلى عقارات مُرقّاة</CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-slate-100">
                      {(dash?.topProperties ?? []).map((prop, i) => (
                        <div key={prop.propertyId} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{prop.propertyTitle ?? `#${prop.propertyId}`}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{prop.userName ?? "—"}</p>
                          </div>
                          <div className="text-sm font-bold text-teal-600 tabular-nums shrink-0">{prop.totalBoost}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </>
        )
      )}

      {/* ── Purchases Tab ────────────────────────────────────────────────────── */}
      {activeTab === "purchases" && (
        <div className="space-y-5">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-slate-600 shrink-0">تصفية حسب الحالة:</Label>
            <div className="flex gap-2 flex-wrap">
              {(["pending", "active", "expired", "rejected", "cancelled", "all"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setPurchaseStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    purchaseStatusFilter === s ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "الكل" : STATUS_META[s]?.label ?? s}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPurchases()} className="mr-auto">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {purchasesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-teal-500" /></div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات بهذه الحالة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map(p => {
                const sm = STATUS_META[p.status] ?? STATUS_META.pending;
                const Icon = TYPE_ICONS[p.typeKey ?? ""] ?? Rocket;
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (p.typeBadgeBgColor ?? "#6366f1") + "22" }}>
                        <Icon className="w-5 h-5" style={{ color: p.typeBadgeBgColor ?? "#6366f1" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-800">{p.typeNameAr ?? "ترقية"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sm.cls}`}>{sm.label}</span>
                          <span className="text-xs text-slate-500">{p.durationDays} يوم</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          العقار: {p.propertyTitle ?? `#${p.propertyId}`} | المستخدم: {p.userName ?? "—"} ({p.userEmail ?? ""})
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span>{p.paymentMethod === "manual_transfer" ? "تحويل بنكي" : p.paymentMethod}</span>
                          {p.paymentReference && <span className="font-mono">Ref: {p.paymentReference}</span>}
                          <span>{fmtDate(p.createdAt)}</span>
                          {p.expiresAt && <span>تنتهي: {fmtDate(p.expiresAt)}</span>}
                        </div>
                        {p.adminNote && (
                          <p className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1 mt-2">
                            ملاحظة: {p.adminNote}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-slate-800">{fmtMoney(p.totalAmount)} ج.م</p>
                        {p.status === "pending" && (
                          <div className="flex flex-col gap-1.5 mt-2">
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => approveMutation.mutate(p.id)}
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setRejectId(p.id)}
                            >
                              <XCircle className="w-3 h-3" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Types Config Tab ─────────────────────────────────────────────────── */}
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-700">إعدادات أنواع الترقيات</h2>
              <p className="text-xs text-slate-500 mt-0.5">عدّل الأسعار والمدة والإعدادات لكل نوع — لا توجد قيم مثبتة</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchTypes()}
                disabled={typesLoading}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${typesLoading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="gap-1.5 text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة نوع جديد
              </Button>
            </div>
          </div>
          {typesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-teal-500" /></div>
          ) : promotionTypes.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">لا توجد أنواع ترقيات مُضافة بعد</p>
                <p className="text-xs text-slate-400 mt-1">أضف نوعاً جديداً أو استعد الأنواع الافتراضية الستة</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  إضافة نوع جديد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seedTypesMutation.mutate()}
                  disabled={seedTypesMutation.isPending}
                  className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  {seedTypesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  استعادة الأنواع الافتراضية (6)
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {promotionTypes.map(pt => (
                <TypeEditorRow
                  key={pt.id}
                  pt={pt}
                  onSave={async (id, data) => { await updateTypeMutation.mutateAsync({ id, data }); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Revenue Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {revenueLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-teal-500" /></div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {([
                  { key: "totalRevenue", label: "إجمالي الإيراد", isRevenue: true },
                  { key: "pendingCount", label: "انتظار" },
                  { key: "activeCount", label: "نشط" },
                  { key: "expiredCount", label: "منتهي" },
                  { key: "rejectedCount", label: "مرفوض" },
                  { key: "cancelledCount", label: "ملغي" },
                ] as const).map(item => (
                  <div key={item.key} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">
                      {item.isRevenue
                        ? `${fmtMoney((revenue?.summary as any)?.[item.key])} ج.م`
                        : ((revenue?.summary as any)?.[item.key] ?? 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue by type */}
              {(revenue?.byType?.length ?? 0) > 0 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-500" />
                      الإيرادات حسب نوع الترقية
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-slate-100">
                    {(revenue?.byType ?? []).map((row, i) => {
                      const Icon = TYPE_ICONS[row.typeKey ?? ""] ?? Rocket;
                      const maxRevenue = Math.max(...(revenue?.byType ?? []).map(r => parseFloat(String(r.revenue ?? 0))));
                      const pct = maxRevenue > 0 ? (parseFloat(String(row.revenue ?? 0)) / maxRevenue) * 100 : 0;
                      return (
                        <div key={i} className="px-5 py-4 flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: (row.typeBadgeBgColor ?? "#6366f1") + "22" }}>
                            <Icon className="w-4 h-4" style={{ color: row.typeBadgeBgColor ?? "#6366f1" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-slate-700">{row.typeNameAr ?? row.typeKey}</p>
                              <div className="text-right">
                                <p className="font-black text-slate-800 text-sm">{fmtMoney(row.revenue)} ج.م</p>
                                <p className="text-xs text-slate-400">{row.count} طلب</p>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: row.typeBadgeBgColor ?? "#6366f1" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Create Type Modal ────────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">إضافة نوع ترقية جديد</h3>
                  <p className="text-xs text-slate-400">أضف نوعاً مخصصاً لترقيات العقارات</p>
                </div>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">المعلومات الأساسية</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">الاسم بالعربي *</Label>
                    <Input value={createForm.nameAr} onChange={e => setCreateForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: ترفيع فوري" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">الاسم بالإنجليزي *</Label>
                    <Input value={createForm.nameEn} onChange={e => setCreateForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="e.g. Quick Boost" className="h-9 text-sm" dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">المفتاح البرمجي (key) *</Label>
                  <Input value={createForm.key} onChange={e => setCreateForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="مثال: quick_boost" className="h-9 text-sm font-mono" dir="ltr" />
                  <p className="text-[10px] text-slate-400 mt-1">حروف إنجليزية صغيرة وشرطة سفلية فقط — يجب أن يكون فريداً</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">الوصف</Label>
                  <Input value={createForm.descriptionAr} onChange={e => setCreateForm(f => ({ ...f, descriptionAr: e.target.value }))} placeholder="وصف مختصر للنوع" className="h-9 text-sm" />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">التسعير والمدة</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">السعر (ج.م)</Label>
                    <Input type="number" min="0" value={createForm.price} onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">المدة (أيام)</Label>
                    <Input type="number" min="1" value={createForm.durationDays} onChange={e => setCreateForm(f => ({ ...f, durationDays: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">درجة الإبراز</Label>
                    <Input type="number" min="0" value={createForm.boostScore} onChange={e => setCreateForm(f => ({ ...f, boostScore: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">ضريبة %</Label>
                    <Input type="number" min="0" max="100" value={createForm.vatPercent} onChange={e => setCreateForm(f => ({ ...f, vatPercent: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">خصم %</Label>
                    <Input type="number" min="0" max="100" value={createForm.discountPercent} onChange={e => setCreateForm(f => ({ ...f, discountPercent: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">الشارة والعرض</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">نص الشارة</Label>
                    <Input value={createForm.badgeText} onChange={e => setCreateForm(f => ({ ...f, badgeText: e.target.value }))} placeholder="مميز" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">لون النص</Label>
                    <div className="flex items-center gap-2 h-9 border border-slate-200 rounded-lg px-2">
                      <input type="color" value={createForm.badgeColor} onChange={e => setCreateForm(f => ({ ...f, badgeColor: e.target.value }))} className="w-6 h-6 rounded border-0 cursor-pointer" />
                      <span className="text-xs font-mono text-slate-500">{createForm.badgeColor}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">لون الخلفية</Label>
                    <div className="flex items-center gap-2 h-9 border border-slate-200 rounded-lg px-2">
                      <input type="color" value={createForm.badgeBgColor} onChange={e => setCreateForm(f => ({ ...f, badgeBgColor: e.target.value }))} className="w-6 h-6 rounded border-0 cursor-pointer" />
                      <span className="text-xs font-mono text-slate-500">{createForm.badgeBgColor}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">الظهور</Label>
                    <select value={createForm.visibility} onChange={e => setCreateForm(f => ({ ...f, visibility: e.target.value }))} className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                      <option value="all">الكل</option>
                      <option value="search">نتائج البحث</option>
                      <option value="homepage">الرئيسية</option>
                      <option value="category">صفحة القسم</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">الأولوية</Label>
                    <Input type="number" min="0" value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">المزايا (سطر لكل ميزة)</Label>
                  <textarea
                    value={createForm.benefits}
                    onChange={e => setCreateForm(f => ({ ...f, benefits: e.target.value }))}
                    placeholder={"يظهر في أعلى نتائج البحث\nمدة 7 أيام\nترتيب أولوية مرتفع"}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                {([
                  { key: "isEnabled", label: "مفعّل" },
                  { key: "requiresApproval", label: "يحتاج موافقة" },
                  { key: "autoExpiry", label: "انتهاء تلقائي" },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm[key] as boolean}
                      onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded accent-teal-600"
                    />
                    <span className="text-xs text-slate-600">{label}</span>
                  </label>
                ))}
              </div>

              {/* Preview badge */}
              {createForm.badgeText && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500">معاينة الشارة:</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: createForm.badgeBgColor, color: createForm.badgeColor }}>
                    {createForm.badgeText}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setCreateModalOpen(false); setCreateForm(EMPTY_FORM); }} className="flex-1">إلغاء</Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={createTypeMutation.isPending || !createForm.key || !createForm.nameAr || !createForm.nameEn}
                  onClick={() => {
                    const benefitsArr = createForm.benefits.split("\n").map(s => s.trim()).filter(Boolean);
                    createTypeMutation.mutate({
                      ...createForm,
                      price: String(parseFloat(createForm.price) || 0),
                      durationDays: parseInt(createForm.durationDays) || 7,
                      boostScore: parseInt(createForm.boostScore) || 100,
                      vatPercent: String(parseFloat(createForm.vatPercent) || 0),
                      discountPercent: String(parseFloat(createForm.discountPercent) || 0),
                      priority: parseInt(createForm.priority) || 10,
                      benefits: benefitsArr.length ? JSON.stringify(benefitsArr) : null,
                    });
                  }}
                >
                  {createTypeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                  حفظ النوع الجديد
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" dir="rtl">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              رفض طلب الترقية
            </h3>
            <div className="space-y-3">
              <Label className="text-sm text-slate-600">سبب الرفض (سيُرسَل للمستخدم)</Label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="مثال: لم يتم التحقق من الدفع..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => { setRejectId(null); setRejectNote(""); }} className="flex-1">إلغاء</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => rejectMutation.mutate({ id: rejectId, note: rejectNote })}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                تأكيد الرفض
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
