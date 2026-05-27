import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Plus, Pencil, Trash2, Loader2, Copy, Layers3, TrendingUp, Users, DollarSign,
  RefreshCw, Star, Crown, CheckCircle2, XCircle, Sparkles, Ticket, Percent,
  Package, Settings, ChevronDown, ChevronUp, ArrowUpDown, BarChart3, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingPlan = {
  id: number; name: string; nameAr?: string; descriptionAr?: string;
  price: string; yearlyPrice?: string; currency: string;
  durationDays: number; durationType: string; userType: string;
  status: string; isRecommended: boolean; isMostPopular: boolean;
  trialDays: number; sortOrder: number; color: string;
  limits: string; features: string; commissionPercent: string;
  createdAt: string;
};

type CommissionRule = {
  id: number; name: string; type: string; value: string;
  isPercentage: boolean; appliesTo: string; userType: string;
  priority: number; isActive: boolean; notes?: string;
};

type Coupon = {
  id: number; code: string; name: string; discountType: string;
  discountValue: string; maxUses?: number; usedCount: number;
  minAmount?: string; expiresAt?: string; isActive: boolean; createdAt: string;
};

type Limits = {
  properties: number; photos: number; videos: number;
  featuredAds: number; pinnedAds: number; messages: number; leads: number;
  bumpUpsPerMonth: number; spotlightAds: number; boostDurationDays: number;
  priorityScore: number;
};
type Features = {
  homepageDisplay: boolean; topSearch: boolean; verifiedBadge: boolean;
  premiumBadge: boolean; prioritySupport: boolean; analytics: boolean;
  seo: boolean; aiTools: boolean; autoBoost: boolean;
  bumpUp: boolean; spotlightAd: boolean; extraBoostPurchase: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_TYPES: Record<string, string> = {
  all: "الكل (أفراد + شركات + مزودو الخدمات)",
  provider: "مزودو الخدمات",
  user: "أفراد / مستخدمون عاديون",
  company: "شركات",
  vip: "VIP / بريميوم",
};
const DURATION_TYPES: Record<string, string> = { monthly: "شهري", quarterly: "ربع سنوي", yearly: "سنوي", lifetime: "مدى الحياة" };
const APPLIES_TO: Record<string, string> = { all: "الكل", sale: "بيع", rent: "إيجار", featured: "إعلان مميز", renewal: "تجديد", paid_ads: "إعلانات مدفوعة" };
const LIMIT_LABELS: Record<keyof Limits, string> = {
  properties: "العقارات", photos: "الصور", videos: "الفيديوهات",
  featuredAds: "إعلانات مميزة / شهر", pinnedAds: "إعلانات مثبتة", messages: "الرسائل", leads: "الطلبات",
  bumpUpsPerMonth: "⬆ Bump Up / شهر (-1 = ∞)", spotlightAds: "✨ Spotlight Ads / شهر",
  boostDurationDays: "مدة الترقية (أيام)", priorityScore: "أولوية الظهور (0-100)",
};
const FEATURE_LABELS: Record<keyof Features, string> = {
  homepageDisplay: "ظهور الصفحة الرئيسية", topSearch: "أعلى البحث", verifiedBadge: "شارة موثق",
  premiumBadge: "شارة Premium", prioritySupport: "دعم الأولوية", analytics: "إحصائيات متقدمة",
  seo: "SEO متقدم", aiTools: "أدوات AI", autoBoost: "Auto Boost تلقائي",
  bumpUp: "⬆ ترفيع الإعلانات (Bump Up)", spotlightAd: "✨ Spotlight Ads", extraBoostPurchase: "شراء ترقيات إضافية",
};

const defaultLimits: Limits = {
  properties: 10, photos: 20, videos: 2, featuredAds: 3, pinnedAds: 1, messages: 100, leads: 50,
  bumpUpsPerMonth: 0, spotlightAds: 0, boostDurationDays: 7, priorityScore: 0,
};
const defaultFeatures: Features = {
  homepageDisplay: false, topSearch: false, verifiedBadge: false, premiumBadge: false,
  prioritySupport: false, analytics: false, seo: false, aiTools: false, autoBoost: false,
  bumpUp: false, spotlightAd: false, extraBoostPurchase: false,
};

const defaultPlan = {
  name: "", nameAr: "", descriptionAr: "", price: "99", yearlyPrice: "",
  currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all",
  status: "active", isRecommended: false, isMostPopular: false,
  trialDays: 0, sortOrder: 0, color: "#0d9488", commissionPercent: "10",
  limits: { ...defaultLimits }, features: { ...defaultFeatures },
};

const PLAN_COLORS = ["#0d9488", "#64748b", "#b45309", "#475569", "#ca8a04", "#7c3aed", "#0ea5e9", "#16a34a", "#dc2626"];

function parseLimits(raw: string): Limits {
  try { return { ...defaultLimits, ...JSON.parse(raw) }; } catch { return { ...defaultLimits }; }
}
function parseFeatures(raw: string): Features {
  try { return { ...defaultFeatures, ...JSON.parse(raw) }; } catch { return { ...defaultFeatures }; }
}
function limitLabel(v: number) { return v === -1 ? "غير محدود ∞" : String(v); }

// ── Main Component ────────────────────────────────────────────────────────────

export default function PlansCommissions() {
  const qc = useQueryClient();

  // Plan modal
  const [planModal, setPlanModal] = useState<{ open: boolean; mode: "add" | "edit"; data: any }>({ open: false, mode: "add", data: { ...defaultPlan } });
  const [planSection, setPlanSection] = useState<"info" | "limits" | "features">("info");

  // Commission modal
  const [commModal, setCommModal] = useState<{ open: boolean; mode: "add" | "edit"; data: any }>({ open: false, mode: "add", data: { name: "", type: "percentage", value: "5", isPercentage: true, appliesTo: "all", userType: "all", priority: 0, notes: "" } });

  // Coupon modal
  const [couponModal, setCouponModal] = useState<{ open: boolean; mode: "add" | "edit"; data: any }>({ open: false, mode: "add", data: { code: "", name: "", discountType: "percentage", discountValue: "10", maxUses: "", isActive: true } });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: "plan" | "commission" | "coupon"; id: number; name: string } | null>(null);

  // Seed
  const [seeding, setSeeding] = useState(false);
  const [yearlyPricing, setYearlyPricing] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billing-plans"],
    queryFn: () => api.fetchJson<BillingPlan[]>("/admin/billing/plans"),
  });

  const { data: commissions = [], isLoading: commLoading } = useQuery<CommissionRule[]>({
    queryKey: ["billing-commissions"],
    queryFn: () => api.fetchJson<CommissionRule[]>("/admin/billing/commissions"),
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["billing-coupons"],
    queryFn: () => api.fetchJson<Coupon[]>("/admin/billing/coupons"),
  });

  const { data: dashboard } = useQuery<{ totalRevenue: number; subscriptionsCount: number; activePlans: number; totalPlans: number; plans: BillingPlan[] }>({
    queryKey: ["billing-dashboard"],
    queryFn: () => api.fetchJson("/admin/billing/dashboard"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  // يُبطل جميع caches الباقات (أدمن + مستخدمين + شركات) فوراً عند أي تعديل
  const invalidateAllPlanCaches = () => {
    qc.invalidateQueries({ queryKey: ["billing-plans"] });
    qc.invalidateQueries({ queryKey: ["billingPlans"] }); // يشمل ["billingPlans","company"] و ["billingPlans","user"]
    qc.invalidateQueries({ queryKey: ["billing-plans-pricing"] });
  };

  const createPlan = useMutation({
    mutationFn: (d: any) => api.fetchJson("/admin/billing/plans", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { invalidateAllPlanCaches(); toast.success("تمت إضافة الباقة"); setPlanModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updatePlan = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => api.fetchJson(`/admin/billing/plans/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { invalidateAllPlanCaches(); toast.success("تم التحديث"); setPlanModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deletePlan = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/billing/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidateAllPlanCaches(); toast.success("تم الحذف"); setDeleteTarget(null); },
  });
  const duplicatePlan = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/billing/plans/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => { invalidateAllPlanCaches(); toast.success("تم نسخ الباقة"); },
  });
  const togglePlan = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/billing/plans/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => invalidateAllPlanCaches(),
  });

  const createComm = useMutation({
    mutationFn: (d: any) => api.fetchJson("/admin/billing/commissions", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-commissions"] }); toast.success("تمت الإضافة"); setCommModal(m => ({ ...m, open: false })); },
  });
  const updateComm = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => api.fetchJson(`/admin/billing/commissions/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-commissions"] }); toast.success("تم التحديث"); setCommModal(m => ({ ...m, open: false })); },
  });
  const deleteComm = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/billing/commissions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-commissions"] }); setDeleteTarget(null); },
  });

  const createCoupon = useMutation({
    mutationFn: (d: any) => api.fetchJson("/admin/billing/coupons", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-coupons"] }); toast.success("تم إنشاء الكوبون"); setCouponModal(m => ({ ...m, open: false })); },
  });
  const updateCoupon = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => api.fetchJson(`/admin/billing/coupons/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-coupons"] }); toast.success("تم التحديث"); setCouponModal(m => ({ ...m, open: false })); },
  });
  const deleteCoupon = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/admin/billing/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-coupons"] }); setDeleteTarget(null); },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.fetchJson<{ addedPlans: number; addedCommissions: number }>("/admin/billing/seed", { method: "POST" });
      invalidateAllPlanCaches();
      qc.invalidateQueries({ queryKey: ["billing-commissions"] });
      toast.success(`أضفنا ${res.addedPlans} باقة و${res.addedCommissions} قاعدة عمولة`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSeeding(false); }
  };

  const submitPlan = () => {
    const d = { ...planModal.data };
    if (!d.name) { toast.error("أدخل اسم الباقة"); return; }
    // Convert empty strings to null for numeric nullable fields
    if (d.yearlyPrice === "" || d.yearlyPrice === undefined) d.yearlyPrice = null;
    if (d.trialDays === "" || d.trialDays === undefined) d.trialDays = 0;
    if (d.price === "" || d.price === undefined) d.price = "0";
    if (planModal.mode === "add") createPlan.mutate(d);
    else updatePlan.mutate({ id: (planModal.data as BillingPlan).id, d });
  };

  const openEditPlan = (plan: BillingPlan) => {
    setPlanModal({
      open: true, mode: "edit",
      data: { ...plan, limits: parseLimits(plan.limits), features: parseFeatures(plan.features) },
    });
    setPlanSection("info");
  };

  const openAddPlan = () => {
    setPlanModal({ open: true, mode: "add", data: { ...defaultPlan, limits: { ...defaultLimits }, features: { ...defaultFeatures } } });
    setPlanSection("info");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "plan") deletePlan.mutate(deleteTarget.id);
    else if (deleteTarget.type === "commission") deleteComm.mutate(deleteTarget.id);
    else deleteCoupon.mutate(deleteTarget.id);
  };

  // ── Dashboard chart data ──────────────────────────────────────────────────────

  const chartData = [
    { name: "يناير", revenue: 4200 }, { name: "فبراير", revenue: 5800 }, { name: "مارس", revenue: 7200 },
    { name: "أبريل", revenue: 6400 }, { name: "مايو", revenue: 9100 }, { name: "يونيو", revenue: 11200 },
    { name: "يوليو", revenue: 10500 }, { name: "أغسطس", revenue: 13800 },
  ];

  const pieColors = ["#0d9488", "#ca8a04", "#475569", "#7c3aed", "#b45309"];

  const pieDummy = (dashboard?.plans ?? plans).filter(p => p.status === "active").slice(0, 5).map((p, i) => ({
    name: p.nameAr ?? p.name,
    value: Math.max(1, (5 - i) * 12),
    color: pieColors[i % pieColors.length],
  }));

  return (
    <AdminLayout title="إدارة الباقات والعمولات">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <Layers3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Plans & Commissions Manager</h2>
            <p className="text-sm text-slate-500">إدارة الباقات والعمولات والكوبونات وتحليل الإيرادات</p>
          </div>
          <div className="ms-auto flex gap-2">
            {plans.length === 0 && (
              <Button onClick={handleSeed} disabled={seeding} variant="outline" size="sm" className="border-violet-300 text-violet-700 hover:bg-violet-50">
                {seeding ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 me-1" />}
                تحميل الباقات الافتراضية
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "إجمالي الإيرادات", value: `${Number(dashboard?.totalRevenue ?? 0).toLocaleString("ar")} ج.م`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "إجمالي الاشتراكات", value: (dashboard?.subscriptionsCount ?? 0).toLocaleString("ar"), icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { label: "الباقات النشطة", value: (dashboard?.activePlans ?? plans.filter(p => p.status === "active").length).toString(), icon: Package, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
            { label: "قواعد العمولة", value: commissions.filter(c => c.isActive).length.toString(), icon: Percent, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
          ].map(s => (
            <Card key={s.label} className={`border ${s.border} shadow-sm`}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="plans">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="plans" className="gap-1.5"><Package className="w-3.5 h-3.5" /> الباقات ({plans.length})</TabsTrigger>
            <TabsTrigger value="commissions" className="gap-1.5"><Percent className="w-3.5 h-3.5" /> العمولات</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5"><Ticket className="w-3.5 h-3.5" /> الكوبونات</TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> لوحة الإيرادات</TabsTrigger>
          </TabsList>

          {/* ── Plans Tab ────────────────────────────────────────────── */}
          <TabsContent value="plans" className="mt-5">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">باقات الاشتراك</h3>
                <p className="text-sm text-slate-500">{plans.length} باقة مسجلة</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5">
                  <span>شهري</span>
                  <Switch checked={yearlyPricing} onCheckedChange={setYearlyPricing} className="scale-75" />
                  <span>سنوي</span>
                  {yearlyPricing && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">توفير 20%</Badge>}
                </div>
                <Button onClick={openAddPlan} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 me-2" /> باقة جديدة
                </Button>
              </div>
            </div>

            {plansLoading ? (
              <div className="flex justify-center h-40 items-center"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
            ) : plans.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                <Package className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium mb-4">لا توجد باقات بعد</p>
                <Button onClick={handleSeed} disabled={seeding} className="bg-violet-600 hover:bg-violet-700">
                  {seeding ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                  تحميل الباقات الافتراضية
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {plans.map(plan => {
                  const limits = parseLimits(plan.limits);
                  const features = parseFeatures(plan.features);
                  const price = yearlyPricing && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
                  const enabledFeatures = Object.entries(features).filter(([, v]) => v).map(([k]) => FEATURE_LABELS[k as keyof Features]);
                  return (
                    <div key={plan.id} className="relative group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Color bar */}
                      <div className="h-1.5 w-full" style={{ background: plan.color }} />

                      {/* Badges */}
                      <div className="absolute top-4 start-3 flex flex-col gap-1">
                        {plan.isMostPopular && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><Star className="w-2.5 h-2.5" /> الأكثر شيوعاً</span>}
                        {plan.isRecommended && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full"><Crown className="w-2.5 h-2.5" /> موصى به</span>}
                      </div>

                      {/* Status toggle */}
                      <div className="absolute top-4 end-3">
                        <Switch checked={plan.status === "active"} onCheckedChange={() => togglePlan.mutate(plan.id)} className="scale-75" />
                      </div>

                      <div className="p-4 pt-8">
                        {/* Name & type */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: plan.color }}>
                            {(plan.nameAr ?? plan.name).charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{plan.nameAr ?? plan.name}</p>
                            <p className="text-[10px] text-slate-400">{USER_TYPES[plan.userType] ?? plan.userType}</p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="my-3">
                          <span className="text-2xl font-black text-slate-900">{Number(price).toLocaleString("ar")}</span>
                          <span className="text-slate-400 text-sm me-1"> {plan.currency}</span>
                          <span className="text-slate-400 text-xs">/ {yearlyPricing ? "سنة" : DURATION_TYPES[plan.durationType] ?? "شهر"}</span>
                          {plan.trialDays > 0 && <div className="mt-0.5 text-xs text-emerald-600 font-medium">تجربة مجانية {plan.trialDays} يوم</div>}
                        </div>

                        {/* Commission */}
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 mb-3 text-xs text-slate-600 flex justify-between">
                          <span>نسبة العمولة</span>
                          <span className="font-semibold text-slate-800">{plan.commissionPercent}%</span>
                        </div>

                        {/* Features */}
                        <div className="space-y-1 mb-3">
                          {enabledFeatures.slice(0, 4).map(f => (
                            <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              {f}
                            </div>
                          ))}
                          {enabledFeatures.length > 4 && (
                            <div className="text-xs text-slate-400">+{enabledFeatures.length - 4} ميزة أخرى</div>
                          )}
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-1 mb-4 text-[10px]">
                          {(Object.entries(limits) as [keyof Limits, number][]).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="bg-slate-50 rounded px-1.5 py-0.5 text-slate-600">
                              <span className="text-slate-400">{LIMIT_LABELS[k]}:</span> <strong>{limitLabel(v)}</strong>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 pt-2 border-t border-slate-100">
                          <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)} className="flex-1 h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                            <Pencil className="w-3 h-3 me-1" /> تعديل
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => duplicatePlan.mutate(plan.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "plan", id: plan.id, name: plan.nameAr ?? plan.name })} className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Commission Rules Tab ─────────────────────────────────── */}
          <TabsContent value="commissions" className="mt-5">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>قواعد العمولة</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">محرك العمولات الذكي — {commissions.length} قاعدة</p>
                </div>
                <Button onClick={() => setCommModal({ open: true, mode: "add", data: { name: "", type: "percentage", value: "5", isPercentage: true, appliesTo: "all", userType: "all", priority: 0, notes: "" } })} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 me-2" /> قاعدة جديدة
                </Button>
              </CardHeader>
              <CardContent>
                {commLoading ? (
                  <div className="flex justify-center h-32 items-center"><Loader2 className="w-5 h-5 animate-spin text-orange-500" /></div>
                ) : commissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Percent className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد قواعد عمولة</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>القاعدة</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>القيمة</TableHead>
                          <TableHead>تطبق على</TableHead>
                          <TableHead>نوع المستخدم</TableHead>
                          <TableHead>الأولوية</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-end">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map(rule => (
                          <TableRow key={rule.id} className="hover:bg-slate-50/60">
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{rule.name}</p>
                                {rule.notes && <p className="text-xs text-slate-400">{rule.notes}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={rule.isPercentage ? "border-orange-200 text-orange-700 bg-orange-50" : "border-blue-200 text-blue-700 bg-blue-50"}>
                                {rule.isPercentage ? "نسبة %" : "مبلغ ثابت"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-slate-800">{rule.value}{rule.isPercentage ? "%" : " ج.م"}</TableCell>
                            <TableCell className="text-sm text-slate-600">{APPLIES_TO[rule.appliesTo] ?? rule.appliesTo}</TableCell>
                            <TableCell className="text-sm text-slate-600">{USER_TYPES[rule.userType] ?? rule.userType}</TableCell>
                            <TableCell className="text-sm text-center">{rule.priority}</TableCell>
                            <TableCell>
                              <Switch checked={rule.isActive} onCheckedChange={(v) => updateComm.mutate({ id: rule.id, d: { isActive: v } })} className="scale-75" />
                            </TableCell>
                            <TableCell className="text-end">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setCommModal({ open: true, mode: "edit", data: { ...rule } })} className="h-7 w-7 p-0 text-teal-500 hover:bg-teal-50">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "commission", id: rule.id, name: rule.name })} className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Coupons Tab ──────────────────────────────────────────── */}
          <TabsContent value="coupons" className="mt-5">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>الكوبونات والخصومات</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{coupons.length} كوبون</p>
                </div>
                <Button onClick={() => setCouponModal({ open: true, mode: "add", data: { code: "", name: "", discountType: "percentage", discountValue: "10", maxUses: "", isActive: true } })} className="bg-pink-600 hover:bg-pink-700">
                  <Plus className="w-4 h-4 me-2" /> كوبون جديد
                </Button>
              </CardHeader>
              <CardContent>
                {couponsLoading ? (
                  <div className="flex justify-center h-32 items-center"><Loader2 className="w-5 h-5 animate-spin text-pink-500" /></div>
                ) : coupons.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد كوبونات بعد</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>الكود</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>الخصم</TableHead>
                          <TableHead>الاستخدامات</TableHead>
                          <TableHead>الانتهاء</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-end">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map(c => {
                          const expired = c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
                          return (
                            <TableRow key={c.id} className="hover:bg-slate-50/60">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-xs font-bold">{c.code}</code>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("تم نسخ الكود"); }}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{c.name}</TableCell>
                              <TableCell>
                                <span className="font-bold text-pink-600">{c.discountValue}{c.discountType === "percentage" ? "%" : " ج.م"}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-600">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : " / ∞"}</span>
                              </TableCell>
                              <TableCell>
                                {c.expiresAt ? (
                                  <span className={`text-xs ${expired ? "text-red-500" : "text-slate-500"}`}>
                                    {expired ? "منتهي" : new Date(c.expiresAt).toLocaleDateString("ar")}
                                  </span>
                                ) : <span className="text-xs text-slate-400">—</span>}
                              </TableCell>
                              <TableCell>
                                <Switch checked={c.isActive && !expired} onCheckedChange={(v) => updateCoupon.mutate({ id: c.id, d: { isActive: v } })} className="scale-75" disabled={expired} />
                              </TableCell>
                              <TableCell className="text-end">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setCouponModal({ open: true, mode: "edit", data: { ...c } })} className="h-7 w-7 p-0 text-teal-500 hover:bg-teal-50">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "coupon", id: c.id, name: c.code })} className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Revenue Dashboard Tab ────────────────────────────────── */}
          <TabsContent value="dashboard" className="mt-5">
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                {/* Revenue chart */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-600" /> نمو الإيرادات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString("ar")} ج.م`, "الإيرادات"]} />
                        <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Plans bar chart */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" /> الاشتراكات حسب الباقة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={pieDummy}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v} اشتراك`, ""]} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {pieDummy.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Side panel */}
              <div className="space-y-5">
                {/* Pie chart */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">توزيع الباقات</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieDummy} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                          {pieDummy.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v}`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full space-y-1.5 mt-2">
                      {pieDummy.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-medium text-slate-700">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick stats */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader><CardTitle className="text-sm">ملخص سريع</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "الباقة الأكثر شيوعاً", value: plans.find(p => p.isMostPopular)?.nameAr ?? "—" },
                      { label: "متوسط الاشتراك", value: plans.length > 0 ? `${(plans.reduce((s, p) => s + Number(p.price), 0) / plans.length).toFixed(0)} ج.م` : "—" },
                      { label: "أعلى عمولة", value: commissions.length > 0 ? `${Math.max(...commissions.map(c => Number(c.value)))}${commissions[0]?.isPercentage ? "%" : " ج.م"}` : "—" },
                      { label: "الكوبونات النشطة", value: coupons.filter(c => c.isActive).length.toString() },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{item.label}</span>
                        <span className="font-semibold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Plan Editor Modal ─────────────────────────────────────── */}
      <Dialog open={planModal.open} onOpenChange={o => setPlanModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              {planModal.mode === "add" ? "إضافة باقة جديدة" : "تعديل الباقة"}
            </DialogTitle>
          </DialogHeader>

          {/* Section switcher */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            {(["info", "limits", "features"] as const).map(s => (
              <button key={s} onClick={() => setPlanSection(s)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${planSection === s ? "bg-white shadow-sm text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
                {s === "info" ? "المعلومات الأساسية" : s === "limits" ? "الحدود" : "المميزات"}
              </button>
            ))}
          </div>

          {/* Info section */}
          {planSection === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم الباقة <span className="text-red-500">*</span></Label>
                  <Input placeholder="مثال: Gold" value={planModal.data.name ?? ""} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>الاسم بالعربي</Label>
                  <Input placeholder="ذهبي" value={planModal.data.nameAr ?? ""} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, nameAr: e.target.value } }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الوصف بالعربي</Label>
                <Textarea rows={2} placeholder="وصف الباقة..." value={planModal.data.descriptionAr ?? ""} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, descriptionAr: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>السعر الشهري</Label>
                  <Input type="number" placeholder="99" value={planModal.data.price ?? ""} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, price: e.target.value } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>السعر السنوي</Label>
                  <Input type="number" placeholder="999" value={planModal.data.yearlyPrice ?? ""} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, yearlyPrice: e.target.value } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>العملة</Label>
                  <Input dir="ltr" placeholder="EGP" value={planModal.data.currency ?? "EGP"} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, currency: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>نوع المدة</Label>
                  <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={planModal.data.durationType ?? "monthly"} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, durationType: e.target.value } }))}>
                    {Object.entries(DURATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>نوع المستخدم</Label>
                  <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={planModal.data.userType ?? "all"} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, userType: e.target.value } }))}>
                    {Object.entries(USER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>نسبة العمولة %</Label>
                  <Input type="number" placeholder="10" value={planModal.data.commissionPercent ?? "10"} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, commissionPercent: e.target.value } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>أيام التجربة المجانية</Label>
                  <Input type="number" placeholder="0" value={planModal.data.trialDays ?? 0} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, trialDays: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>لون الباقة</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" className="h-9 w-16 p-1 cursor-pointer" value={planModal.data.color ?? "#0d9488"} onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, color: e.target.value } }))} />
                    <div className="flex gap-1.5 flex-wrap">
                      {PLAN_COLORS.map(c => <button key={c} onClick={() => setPlanModal(m => ({ ...m, data: { ...m.data, color: c } }))} className="w-6 h-6 rounded-full border-2 transition-all" style={{ background: c, borderColor: planModal.data.color === c ? "#1e293b" : "transparent" }} />)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border">
                {[
                  { key: "isRecommended", label: "موصى به", icon: "👑" },
                  { key: "isMostPopular", label: "الأكثر شيوعاً", icon: "⭐" },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Switch checked={!!(planModal.data[f.key])} onCheckedChange={v => setPlanModal(m => ({ ...m, data: { ...m.data, [f.key]: v } }))} />
                    <Label className="text-sm cursor-pointer">{f.icon} {f.label}</Label>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Switch checked={planModal.data.status === "active"} onCheckedChange={v => setPlanModal(m => ({ ...m, data: { ...m.data, status: v ? "active" : "inactive" } }))} />
                  <Label className="text-sm">مفعّلة</Label>
                </div>
              </div>
            </div>
          )}

          {/* Limits section */}
          {planSection === "limits" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">حدد الحدود القصوى للباقة. القيمة <strong>-1</strong> تعني "غير محدود".</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(LIMIT_LABELS) as (keyof Limits)[]).map(key => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm">{LIMIT_LABELS[key]}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="-1"
                        value={planModal.data.limits?.[key] ?? -1}
                        onChange={e => setPlanModal(m => ({ ...m, data: { ...m.data, limits: { ...m.data.limits, [key]: Number(e.target.value) } } }))}
                      />
                      <Switch
                        checked={(planModal.data.limits?.[key] ?? 0) === -1}
                        onCheckedChange={v => setPlanModal(m => ({ ...m, data: { ...m.data, limits: { ...m.data.limits, [key]: v ? -1 : 10 } } }))}
                        className="scale-75 shrink-0"
                        title="غير محدود"
                      />
                    </div>
                    {(planModal.data.limits?.[key] ?? 0) === -1 && <p className="text-xs text-emerald-600">∞ غير محدود</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features section */}
          {planSection === "features" && (
            <div className="space-y-2">
              {(Object.keys(FEATURE_LABELS) as (keyof Features)[]).map(key => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <Label className="cursor-pointer text-sm">{FEATURE_LABELS[key]}</Label>
                  <Switch
                    checked={!!(planModal.data.features?.[key])}
                    onCheckedChange={v => setPlanModal(m => ({ ...m, data: { ...m.data, features: { ...m.data.features, [key]: v } } }))}
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <div className="flex gap-2 me-auto text-xs text-slate-400">
              {planSection !== "info" && <Button variant="ghost" size="sm" onClick={() => setPlanSection(planSection === "limits" ? "info" : "limits")}>← السابق</Button>}
              {planSection !== "features" && <Button variant="ghost" size="sm" onClick={() => setPlanSection(planSection === "info" ? "limits" : "features")}>التالي →</Button>}
            </div>
            <Button variant="outline" onClick={() => setPlanModal(m => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={submitPlan} disabled={createPlan.isPending || updatePlan.isPending} className="bg-violet-600 hover:bg-violet-700">
              {(createPlan.isPending || updatePlan.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {planModal.mode === "add" ? "إضافة الباقة" : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Commission Rule Modal ────────────────────────────────── */}
      <Dialog open={commModal.open} onOpenChange={o => setCommModal(m => ({ ...m, open: o }))}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{commModal.mode === "add" ? "إضافة قاعدة عمولة" : "تعديل القاعدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>اسم القاعدة</Label>
              <Input value={commModal.data.name ?? ""} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نوع العمولة</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background"
                  value={commModal.data.isPercentage ? "percentage" : "flat"}
                  onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, isPercentage: e.target.value === "percentage" } }))}>
                  <option value="percentage">نسبة مئوية %</option>
                  <option value="flat">مبلغ ثابت</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>القيمة {commModal.data.isPercentage ? "(%)" : "(ج.م)"}</Label>
                <Input type="number" value={commModal.data.value ?? ""} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, value: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تطبق على</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={commModal.data.appliesTo ?? "all"} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, appliesTo: e.target.value } }))}>
                  {Object.entries(APPLIES_TO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع المستخدم</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={commModal.data.userType ?? "all"} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, userType: e.target.value } }))}>
                  {Object.entries(USER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الأولوية</Label>
              <Input type="number" value={commModal.data.priority ?? 0} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, priority: Number(e.target.value) } }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={commModal.data.notes ?? ""} onChange={e => setCommModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCommModal(m => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={() => { if (!commModal.data.name) { toast.error("أدخل اسم القاعدة"); return; } commModal.mode === "add" ? createComm.mutate(commModal.data) : updateComm.mutate({ id: commModal.data.id, d: commModal.data }); }}
              disabled={createComm.isPending || updateComm.isPending} className="bg-orange-600 hover:bg-orange-700">
              {(createComm.isPending || updateComm.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {commModal.mode === "add" ? "إضافة" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Coupon Modal ──────────────────────────────────────────── */}
      <Dialog open={couponModal.open} onOpenChange={o => setCouponModal(m => ({ ...m, open: o }))}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{couponModal.mode === "add" ? "إضافة كوبون خصم" : "تعديل الكوبون"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>كود الخصم</Label>
                <div className="flex gap-2">
                  <Input dir="ltr" placeholder="SAVE20" value={couponModal.data.code ?? ""} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, code: e.target.value.toUpperCase() } }))} className="font-mono" />
                  <Button variant="outline" size="sm" onClick={() => setCouponModal(m => ({ ...m, data: { ...m.data, code: Math.random().toString(36).substring(2, 8).toUpperCase() } }))}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>اسم الكوبون</Label>
                <Input value={couponModal.data.name ?? ""} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نوع الخصم</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={couponModal.data.discountType ?? "percentage"} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, discountType: e.target.value } }))}>
                  <option value="percentage">نسبة %</option>
                  <option value="flat">مبلغ ثابت</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>قيمة الخصم</Label>
                <Input type="number" value={couponModal.data.discountValue ?? ""} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, discountValue: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الحد الأقصى للاستخدام</Label>
                <Input type="number" placeholder="∞ غير محدود" value={couponModal.data.maxUses ?? ""} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, maxUses: e.target.value ? Number(e.target.value) : null } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الانتهاء</Label>
                <Input type="date" value={couponModal.data.expiresAt ? couponModal.data.expiresAt.substring(0, 10) : ""} onChange={e => setCouponModal(m => ({ ...m, data: { ...m.data, expiresAt: e.target.value || null } }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <Switch checked={couponModal.data.isActive !== false} onCheckedChange={v => setCouponModal(m => ({ ...m, data: { ...m.data, isActive: v } }))} />
              <Label>تفعيل الكوبون</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCouponModal(m => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={() => { if (!couponModal.data.code || !couponModal.data.name) { toast.error("أدخل الكود والاسم"); return; } couponModal.mode === "add" ? createCoupon.mutate(couponModal.data) : updateCoupon.mutate({ id: couponModal.data.id, d: couponModal.data }); }}
              disabled={createCoupon.isPending || updateCoupon.isPending} className="bg-pink-600 hover:bg-pink-700">
              {(createCoupon.isPending || updateCoupon.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {couponModal.mode === "add" ? "إنشاء الكوبون" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف <strong>"{deleteTarget?.name}"</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
