import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Crown, CheckCircle2, XCircle, Clock, Calendar, AlertTriangle,
  Package, Building2, Loader2, ChevronRight, ChevronLeft,
  Search, Filter, RefreshCw, Zap, Shield, Star, TrendingUp,
  Home, BarChart2, Headphones, Sparkles, Repeat2,
  ArrowUpRight, Check, X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProviderStats, type BillingPlan } from "@/lib/api";
import {
  parseLimits, parseFeatures, fmtLimit, fmtMoney, fmtDate,
  FEATURE_LABELS, LIMIT_LABELS,
} from "@/lib/plan-helpers";

// ── Types ─────────────────────────────────────────────────────────────────────
type SubHistory = {
  id: number;
  planNameAr: string | null;
  planPrice: string | null;
  durationDays: number;
  maxListings: number | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  isActive: boolean;
};

// ── Status helpers ─────────────────────────────────────────────────────────────
function subStatus(row: SubHistory) {
  if (row.isActive) {
    const days = Math.ceil((new Date(row.endDate).getTime() - Date.now()) / 86400000);
    if (days <= 7) return { label: "تنتهي قريباً", cls: "bg-amber-50 text-amber-700 border border-amber-200" };
    return { label: "نشطة", cls: "bg-green-50 text-green-700 border border-green-200" };
  }
  if (row.status === "active") return { label: "منتهية", cls: "bg-red-50 text-red-700 border border-red-200" };
  if (row.status === "cancelled") return { label: "ملغية", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
  return { label: row.status, cls: "bg-gray-100 text-gray-600 border border-gray-200" };
}

function daysLeft(endDate: string) {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

const FEATURE_ICONS: Record<string, any> = {
  homepageDisplay: Home, topSearch: Search, verifiedBadge: Shield,
  premiumBadge: Crown, prioritySupport: Headphones, analytics: BarChart2,
  seo: TrendingUp, aiTools: Sparkles, autoBoost: Repeat2,
};

const PAGE_SIZE = 8;

// ── Plan Icon ──────────────────────────────────────────────────────────────────
function PlanIcon({ plan }: { plan: BillingPlan }) {
  const price = parseFloat(plan.price ?? "0");
  if (price === 0) return <Package className="w-6 h-6 text-gray-500" />;
  if (price < 300) return <Zap className="w-6 h-6 text-blue-600" />;
  if (price < 700) return <Star className="w-6 h-6 text-violet-600" />;
  return <Crown className="w-6 h-6 text-amber-600" />;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PackagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const providerId = user?.providerId;

  const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "expired">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
    refetchInterval: 60_000,
  });

  const { data: history = [], isLoading: histLoading } = useQuery<SubHistory[]>({
    queryKey: ["subscriptionHistory", providerId],
    queryFn: () => api.subscriptionHistory.list(providerId!),
    enabled: !!providerId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans", "company"],
    queryFn: () => api.billingPlans.publicListByType("company"),
  });

  const sub = stats?.subscription ?? null;
  const isLoading = statsLoading || plansLoading;

  // ── Subscription helpers ─────────────────────────────────────────────────────
  const progressPct = sub?.daysLeft != null && sub?.durationDays
    ? Math.min(100, Math.round((sub.daysLeft / sub.durationDays) * 100))
    : 0;

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || parseFloat(a.price ?? "0") - parseFloat(b.price ?? "0")),
    [plans]
  );

  const isCurrentPlan = (plan: BillingPlan) => {
    if (!sub?.isActive) return false;
    return (sub as any).billingPlanId === plan.id || sub.packageNameAr === (plan.nameAr ?? plan.name);
  };

  const hasUsedFreePlan = Boolean(
    sub && (sub.packagePrice == null || parseFloat(String(sub.packagePrice)) === 0)
  );

  const handleSubscribeClick = (plan: BillingPlan) => {
    if (isCurrentPlan(plan)) return;
    if (parseFloat(String(plan.price ?? "0")) === 0 && hasUsedFreePlan) {
      toast({ title: "غير متاح", description: "لا يمكن تفعيل الباقة المجانية أكثر من مرة.", variant: "destructive" });
      return;
    }
    setSelectedPlan(plan);
    if (parseFloat(String(plan.price ?? "0")) > 0) {
      const qs = new URLSearchParams({
        planName: plan.nameAr ?? plan.name ?? "",
        price: String(plan.price),
        duration: String(plan.durationDays),
        currency: plan.currency ?? "EGP",
        planId: String(plan.id),
      }).toString();
      setLocation(`/pay/subscription?${qs}`);
    } else {
      setConfirmOpen(true);
    }
  };

  const subscribeMutation = useMutation({
    mutationFn: (plan: BillingPlan) => api.subscriptions.subscribe(providerId!, plan.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionHistory", providerId] });
      toast({ title: "تم الاشتراك بنجاح! 🎉", description: `تم تفعيل باقة ${selectedPlan?.nameAr ?? selectedPlan?.name}` });
      setConfirmOpen(false);
      setSelectedPlan(null);
    },
    onError: (err: Error) => toast({ title: "فشل الاشتراك", description: err.message, variant: "destructive" }),
  });

  // ── History filter & pagination ──────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return history.filter(row => {
      const matchStatus =
        historyFilter === "all" ? true :
        historyFilter === "active" ? row.isActive :
        !row.isActive;
      const matchSearch = !historySearch || (row.planNameAr ?? "").includes(historySearch);
      return matchStatus && matchSearch;
    });
  }, [history, historyFilter, historySearch]);

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
  const pagedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  // ── User view (non-provider) ──────────────────────────────────────────────────
  if (user?.role === "user") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-6" dir="rtl">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الباقات</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة اشتراكاتك وباقاتك</p>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold">أضف عقاراتك مجاناً</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              كمستخدم عادي، يمكنك إضافة إعلانات عقارية مجاناً دون الحاجة إلى اشتراك مدفوع.
            </p>
            <Link href="/add-property">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 mt-2">
                <Building2 className="w-4 h-4" />
                أضف عقارك الآن
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Current plan status label ─────────────────────────────────────────────────
  const currentStatus = (() => {
    if (!sub) return null;
    if (!sub.isActive) return { label: "منتهية", cls: "bg-red-50 text-red-700 border border-red-200", icon: XCircle };
    if (sub.daysLeft != null && sub.daysLeft <= 7) return { label: "تنتهي قريباً", cls: "bg-amber-50 text-amber-700 border border-amber-200", icon: AlertTriangle };
    return { label: "نشطة", cls: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle2 };
  })();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8" dir="rtl">

        {/* ── Page Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">باقاتي</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة اشتراكك الحالي وسجل باقاتك السابقة</p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
              queryClient.invalidateQueries({ queryKey: ["subscriptionHistory", providerId] });
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ── Expiry Alert ──────────────────────────────────────────────────────── */}
        {!statsLoading && sub?.isActive && sub.daysLeft != null && sub.daysLeft <= 7 && !alertDismissed && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">اشتراكك سينتهي خلال {sub.daysLeft} {sub.daysLeft === 1 ? "يوم" : "أيام"}</p>
                <p className="text-sm text-amber-700 mt-0.5">جدّد الآن لتبقى ظاهراً في نتائج البحث</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm h-9 px-4"
                onClick={() => {
                  const p = sortedPlans.find(p => isCurrentPlan(p));
                  if (p) handleSubscribeClick(p);
                }}
              >
                تجديد الآن
              </Button>
              <button onClick={() => setAlertDismissed(true)} className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                SECTION 1 — Current Plan
            ══════════════════════════════════════════════════════════════════ */}
            {sub ? (
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {/* Card top strip */}
                <div className="h-1.5 w-full bg-gradient-to-l from-teal-500 via-blue-500 to-indigo-500" />

                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Plan info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">الباقة الحالية</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-foreground">
                          {sub.packageNameAr ?? "اشتراك"}
                        </h2>
                        {sub.packagePrice != null && (
                          <p className="text-muted-foreground text-sm mt-1">
                            {fmtMoney(sub.packagePrice)} ج.م
                            {sub.durationDays ? ` / ${sub.durationDays} يوم` : ""}
                          </p>
                        )}
                      </div>

                      {currentStatus && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${currentStatus.cls}`}>
                          <currentStatus.icon className="w-3.5 h-3.5" />
                          {currentStatus.label}
                        </span>
                      )}

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>تاريخ البدء: <strong className="text-foreground">{fmtDate(sub.startDate)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>تاريخ الانتهاء: <strong className="text-foreground">{fmtDate(sub.endDate)}</strong></span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 flex-wrap">
                        {sortedPlans.find(p => isCurrentPlan(p)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-primary text-primary hover:bg-primary/5 h-9 px-4 text-sm font-semibold"
                            onClick={() => { const p = sortedPlans.find(p => isCurrentPlan(p)); if (p) handleSubscribeClick(p); }}
                          >
                            <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                            تجديد الباقة
                          </Button>
                        )}
                        <a href="#upgrade">
                          <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-white h-9 px-4 text-sm font-semibold gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            ترقية
                          </Button>
                        </a>
                      </div>
                    </div>

                    {/* Center: Days progress */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">الوقت المتبقي</span>
                        <span className="text-sm text-muted-foreground">{progressPct}%</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-end justify-between">
                          <span className={`text-4xl font-extrabold tabular-nums ${sub.isActive ? "text-foreground" : "text-red-500"}`}>
                            {sub.daysLeft ?? 0}
                          </span>
                          <span className="text-sm text-muted-foreground mb-1">
                            من {sub.durationDays ?? "—"} يوم
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">يوم متبقي</p>
                        <div className="relative mt-2">
                          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPct > 50 ? "bg-teal-500" :
                                progressPct > 20 ? "bg-amber-400" : "bg-red-400"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>انتهى</span>
                          <span>متبقي</span>
                        </div>
                      </div>

                      {!sub.isActive && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium flex items-center gap-2">
                          <XCircle className="w-4 h-4 shrink-0" />
                          انتهى اشتراكك — جدّد لاستقبال الطلبات
                        </div>
                      )}
                    </div>

                    {/* Right: Properties usage + features */}
                    <div className="space-y-4">
                      {/* Properties usage */}
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          استخدام العقارات
                        </p>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-extrabold text-foreground tabular-nums">
                            {stats?.activeProperties ?? 0}
                          </span>
                          <span className="text-muted-foreground text-sm mb-1">
                            / {sub.maxListings != null ? (sub.maxListings < 0 ? "∞" : sub.maxListings) : "—"}
                          </span>
                        </div>
                        {sub.maxListings != null && sub.maxListings > 0 && (
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ((stats?.activeProperties ?? 0) / sub.maxListings) * 100)}%` }}
                            />
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>مستخدم: {stats?.activeProperties ?? 0}</span>
                          <span>
                            متبقي:{" "}
                            {sub.maxListings != null && sub.maxListings >= 0
                              ? Math.max(0, sub.maxListings - (stats?.activeProperties ?? 0))
                              : "غير محدود"
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground">لا توجد باقة نشطة</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  اشترك في إحدى الباقات أدناه لتفعيل حسابك وبدء استقبال الطلبات.
                </p>
                <a href="#upgrade">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2">
                    <Zap className="w-4 h-4" />
                    اختر باقتك الآن
                  </Button>
                </a>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 2 — Subscription History
            ══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">سجل الاشتراكات</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">جميع باقاتك السابقة والحالية</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={historySearch}
                      onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      placeholder="بحث باسم الباقة…"
                      className="pr-8 pl-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
                    />
                  </div>
                  {/* Filter */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {(["all", "active", "expired"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          historyFilter === f
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f === "all" ? "الكل" : f === "active" ? "النشطة" : "المنتهية"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {histLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pagedHistory.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                    <Package className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-foreground">لا توجد اشتراكات</p>
                  <p className="text-xs text-muted-foreground">
                    {historySearch || historyFilter !== "all"
                      ? "لا توجد نتائج مطابقة للفلتر المحدد"
                      : "لم تشترك في أي باقة حتى الآن"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">#</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">اسم الباقة</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">السعر</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">المدة</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">الإعلانات</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">تاريخ البدء</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">تاريخ الانتهاء</th>
                          <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedHistory.map((row, i) => {
                          const st = subStatus(row);
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                            >
                              <td className="px-5 py-3.5 text-xs text-muted-foreground tabular-nums">
                                {(historyPage - 1) * PAGE_SIZE + i + 1}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-semibold text-foreground">
                                  {row.planNameAr ?? "—"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-foreground tabular-nums">
                                {row.planPrice != null
                                  ? `${fmtMoney(row.planPrice)} ج.م`
                                  : <span className="text-muted-foreground">مجانية</span>
                                }
                              </td>
                              <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
                                {row.durationDays} يوم
                              </td>
                              <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
                                {row.maxListings != null
                                  ? (row.maxListings < 0 ? "غير محدود" : row.maxListings)
                                  : "—"
                                }
                              </td>
                              <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
                                {fmtDate(row.startDate)}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
                                {fmtDate(row.endDate)}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">
                        عرض {(historyPage - 1) * PAGE_SIZE + 1}–{Math.min(historyPage * PAGE_SIZE, filteredHistory.length)} من {filteredHistory.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage(p => p - 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-muted-foreground hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setHistoryPage(p)}
                            className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors ${
                              historyPage === p
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-gray-200 text-muted-foreground hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          disabled={historyPage === totalPages}
                          onClick={() => setHistoryPage(p => p + 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-muted-foreground hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 3 — Upgrade / Plans
            ══════════════════════════════════════════════════════════════════ */}
            <div id="upgrade" className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">الباقات المتاحة</h2>
                <p className="text-sm text-muted-foreground mt-1">اختر الباقة المناسبة لأعمالك وابدأ الترقية الآن</p>
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sortedPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                  <p className="text-muted-foreground text-sm">لا توجد باقات متاحة حالياً</p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 gap-5 ${
                  sortedPlans.length === 2 ? "sm:grid-cols-2" :
                  sortedPlans.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : ""
                }`}>
                  {sortedPlans.map((plan) => {
                    const isCurrent = isCurrentPlan(plan);
                    const price = parseFloat(plan.price ?? "0");
                    const isFree = price === 0;
                    const limits = parseLimits(plan.limits);
                    const features = parseFeatures(plan.features);
                    const enabledFeatures = Object.entries(features).filter(([, v]) => v);
                    const isPopular = !isFree && sortedPlans.filter(p => parseFloat(p.price ?? "0") > 0).indexOf(plan) === 0;

                    return (
                      <div
                        key={plan.id}
                        className={`relative rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${
                          isCurrent
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : isPopular
                            ? "border-blue-300 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Top badge */}
                        {isCurrent && (
                          <div className="bg-primary text-primary-foreground text-center py-1.5 text-xs font-bold tracking-wide">
                            ✓ باقتك الحالية
                          </div>
                        )}
                        {!isCurrent && isPopular && (
                          <div className="bg-blue-600 text-white text-center py-1.5 text-xs font-bold tracking-wide">
                            ⚡ الأكثر طلباً
                          </div>
                        )}

                        <div className="p-6 space-y-5">
                          {/* Plan header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                                isFree ? "bg-gray-100" : isPopular ? "bg-blue-100" : "bg-amber-100"
                              }`}>
                                <PlanIcon plan={plan} />
                              </div>
                              <h3 className="text-lg font-bold text-foreground">
                                {plan.nameAr ?? plan.name}
                              </h3>
                              {plan.descriptionAr && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{plan.descriptionAr}</p>
                              )}
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="border-t border-gray-100 pt-4">
                            {isFree ? (
                              <div className="flex items-end gap-1">
                                <span className="text-3xl font-extrabold text-foreground">مجاناً</span>
                              </div>
                            ) : (
                              <div className="flex items-end gap-1">
                                <span className="text-3xl font-extrabold text-foreground tabular-nums">
                                  {fmtMoney(plan.price)}
                                </span>
                                <span className="text-muted-foreground text-sm mb-1">{plan.currency ?? "EGP"}</span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              لمدة {plan.durationDays} يوم
                            </p>
                          </div>

                          {/* Limits */}
                          <div className="space-y-2">
                            {Object.entries(limits).slice(0, 4).map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{LIMIT_LABELS[key] ?? key}</span>
                                <span className="font-semibold text-foreground tabular-nums">{fmtLimit(val)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          {enabledFeatures.length > 0 && (
                            <div className="border-t border-gray-100 pt-4 space-y-2">
                              {enabledFeatures.slice(0, 5).map(([key]) => (
                                <div key={key} className="flex items-center gap-2 text-sm text-foreground">
                                  <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                  <span>{FEATURE_LABELS[key] ?? key}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* CTA */}
                          <Button
                            className={`w-full h-10 rounded-xl font-bold text-sm ${
                              isCurrent
                                ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
                                : isFree
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                                : isPopular
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            }`}
                            disabled={isCurrent && sub?.isActive}
                            onClick={() => !isCurrent && handleSubscribeClick(plan)}
                          >
                            {isCurrent
                              ? "باقتك الحالية"
                              : isFree
                              ? "تفعيل مجاناً"
                              : `الترقية إلى ${plan.nameAr ?? plan.name}`
                            }
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Free plan confirm dialog ──────────────────────────────────────────── */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader>
              <DialogTitle>تأكيد الاشتراك المجاني</DialogTitle>
              <DialogDescription>
                سيتم تفعيل باقة <strong>{selectedPlan?.nameAr ?? selectedPlan?.name}</strong> مجاناً لمدة {selectedPlan?.durationDays} يوم.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button
                className="rounded-xl bg-primary text-primary-foreground"
                disabled={subscribeMutation.isPending}
                onClick={() => selectedPlan && subscribeMutation.mutate(selectedPlan)}
              >
                {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
