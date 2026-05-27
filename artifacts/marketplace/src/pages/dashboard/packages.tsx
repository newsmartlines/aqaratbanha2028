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
import { useRole } from "@/lib/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProviderStats, type BillingPlan, type UserCurrentSub, type SubHistoryItem } from "@/lib/api";
import {
  parseLimits, parseFeatures, fmtLimit, fmtMoney, fmtDate,
  FEATURE_LABELS, LIMIT_LABELS,
} from "@/lib/plan-helpers";

// ── Status helpers ─────────────────────────────────────────────────────────────
function subStatus(row: SubHistoryItem) {
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

// ── Active Subscription Card (world-class) ─────────────────────────────────────
type SubShape = {
  isActive: boolean;
  billingPlanId?: number | null;
  packageNameAr?: string | null;
  packagePrice?: string | null;
  durationDays?: number | null;
  daysLeft?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  maxListings?: number | null;
  planColor?: string | null;
};

type StatusInfo = { label: string; cls: string; icon: React.ElementType } | null;

function DaysRing({ pct, days, isActive }: { pct: number; days: number; isActive: boolean }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  const color = !isActive ? "#ef4444" : pct > 50 ? "#14b8a6" : pct > 20 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="rotate-[-90deg]">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums" style={{ color }}>{days}</span>
        <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">يوم</span>
      </div>
    </div>
  );
}

function ActiveSubCard({
  sub, isProvider, stats, progressPct, currentStatus,
  sortedPlans, isCurrentPlan, handleSubscribeClick,
}: {
  sub: SubShape;
  isProvider: boolean;
  stats?: ProviderStats;
  progressPct: number;
  currentStatus: StatusInfo;
  sortedPlans: BillingPlan[];
  isCurrentPlan: (p: BillingPlan) => boolean;
  handleSubscribeClick: (p: BillingPlan) => void;
}) {
  const isFree = !sub.packagePrice || parseFloat(String(sub.packagePrice)) === 0;

  const gradientClass = !sub.isActive
    ? "from-red-50 via-rose-50 to-white border-red-200"
    : isFree
    ? "from-slate-50 via-gray-50 to-white border-gray-200"
    : "from-teal-50 via-cyan-50 to-white border-teal-200";

  const accentColor = !sub.isActive ? "#ef4444" : isFree ? "#64748b" : "#0d9488";

  const usedProps = stats?.activeProperties ?? 0;
  const maxProps = sub.maxListings;

  return (
    <div className={`rounded-2xl border-2 bg-gradient-to-br ${gradientClass} overflow-hidden shadow-sm`}>
      {/* Top gradient stripe */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(to left, ${accentColor}33, ${accentColor}, ${accentColor}33)` }} />

      <div className="p-6 sm:p-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">اشتراكك الحالي</p>
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              {sub.packageNameAr ?? "باقة نشطة"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isFree
                ? "الباقة المجانية — ابدأ مجاناً"
                : `${fmtMoney(sub.packagePrice)} ج.م / ${sub.durationDays ?? "—"} يوم`}
            </p>
          </div>
          {currentStatus && (
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold self-start sm:self-auto ${currentStatus.cls}`}>
              <currentStatus.icon className="w-4 h-4" />
              {currentStatus.label}
            </span>
          )}
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Column 1 — Days ring */}
          <div className="flex flex-col items-center justify-center gap-3 bg-white/70 rounded-2xl p-5 border border-white shadow-sm">
            <DaysRing pct={progressPct} days={sub.daysLeft ?? 0} isActive={sub.isActive} />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">الأيام المتبقية</p>
              <p className="text-xs text-muted-foreground">من أصل {sub.durationDays ?? "—"} يوم</p>
            </div>
          </div>

          {/* Column 2 — Start & End dates */}
          <div className="flex flex-col justify-center gap-4 bg-white/70 rounded-2xl p-5 border border-white shadow-sm">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                تاريخ البدء
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">{fmtDate(sub.startDate)}</p>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                تاريخ الانتهاء
              </p>
              <p className={`text-lg font-bold tabular-nums ${sub.isActive ? "text-foreground" : "text-red-500"}`}>
                {fmtDate(sub.endDate)}
              </p>
              {!sub.isActive && (
                <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  انتهى الاشتراك
                </p>
              )}
            </div>
          </div>

          {/* Column 3 — Usage / capacity */}
          <div className="flex flex-col justify-center gap-4 bg-white/70 rounded-2xl p-5 border border-white shadow-sm">
            {isProvider && stats != null ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    عقاراتي النشطة
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground tabular-nums">{usedProps}</span>
                    <span className="text-sm text-muted-foreground">
                      / {maxProps != null ? (maxProps < 0 ? "∞" : maxProps) : "—"}
                    </span>
                  </div>
                </div>
                {maxProps != null && maxProps > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (usedProps / maxProps) * 100)}%`,
                          backgroundColor: accentColor,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>مستخدم: {usedProps}</span>
                      <span>متبقي: {Math.max(0, maxProps - usedProps)}</span>
                    </div>
                  </div>
                )}
                {maxProps != null && maxProps < 0 && (
                  <p className="text-sm font-semibold text-teal-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    إعلانات غير محدودة
                  </p>
                )}
              </>
            ) : maxProps != null ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    حد الإعلانات
                  </p>
                  <p className="text-3xl font-black text-foreground tabular-nums">
                    {maxProps < 0 ? "∞" : maxProps}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {maxProps < 0 ? "غير محدود" : "إعلان كحد أقصى"}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">مزايا الباقة</p>
                <ul className="space-y-1.5">
                  {[
                    { icon: CheckCircle2, text: "نشر الإعلانات" },
                    { icon: CheckCircle2, text: "التواصل مع المكاتب" },
                    { icon: CheckCircle2, text: "حفظ المفضلة" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-1.5 text-sm text-foreground">
                      <Icon className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-gray-100">
          {sortedPlans.find(p => isCurrentPlan(p)) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-2 h-10 px-5 text-sm font-semibold gap-2"
              style={{ borderColor: accentColor, color: accentColor }}
              onClick={() => { const p = sortedPlans.find(p => isCurrentPlan(p)); if (p) handleSubscribeClick(p); }}
            >
              <RefreshCw className="w-4 h-4" />
              تجديد الباقة
            </Button>
          )}
          <a href="#upgrade">
            <Button
              size="sm"
              className="rounded-xl h-10 px-5 text-sm font-semibold gap-2 text-white"
              style={{ backgroundColor: accentColor }}
            >
              <ArrowUpRight className="w-4 h-4" />
              ترقية إلى باقة أعلى
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PackagesPage() {
  const { user, isProvider, providerId, loading: authLoading } = useRole();
  const userId = user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "expired">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  // Provider stats (providers only)
  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId && isProvider,
    refetchInterval: 60_000,
  });

  // User current subscription (regular users only)
  const { data: userSub, isLoading: userSubLoading } = useQuery<UserCurrentSub | null>({
    queryKey: ["userCurrentSub", userId],
    queryFn: () => api.userSubscription.current(userId!),
    enabled: !!userId && !isProvider,
    refetchInterval: 60_000,
  });

  // Subscription history — provider or user
  const { data: history = [], isLoading: histLoading } = useQuery<SubHistoryItem[]>({
    queryKey: ["subscriptionHistory", isProvider ? providerId : userId, isProvider ? "provider" : "user"],
    queryFn: () =>
      isProvider
        ? api.subscriptionHistory.list(providerId!)
        : api.subscriptionHistory.listForUser(userId!),
    enabled: isProvider ? !!providerId : !!userId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans", "all"],
    queryFn: () => api.billingPlans.publicList(),
  });

  // Unified current subscription object — normalises provider & user shapes
  const sub: SubShape | null = useMemo<SubShape | null>(() => {
    if (isProvider) {
      const s = stats?.subscription;
      if (!s) return null;
      return {
        ...s,
        startDate: s.startDate ? String(s.startDate) : null,
        endDate: s.endDate ? String(s.endDate) : null,
        planColor: null,
      };
    }

    // Try the dedicated current-subscription endpoint first
    if (userSub) {
      const maxListings = userSub.limits?.properties ?? null;
      return {
        isActive: userSub.isActive,
        billingPlanId: userSub.billingPlanId,
        packageNameAr: userSub.packageNameAr,
        packagePrice: userSub.packagePrice,
        durationDays: userSub.durationDays,
        daysLeft: userSub.daysLeft,
        startDate: userSub.startDate ? String(userSub.startDate) : null,
        endDate: userSub.endDate ? String(userSub.endDate) : null,
        maxListings: maxListings != null && maxListings < 0 ? -1 : maxListings,
        planColor: userSub.color,
      };
    }

    // Fallback: derive from the most recent active history item
    const activeHistoryItem = history.find(h => h.isActive);
    if (activeHistoryItem) {
      const dl = daysLeft(String(activeHistoryItem.endDate));
      return {
        isActive: true,
        billingPlanId: null,
        packageNameAr: activeHistoryItem.planNameAr,
        packagePrice: activeHistoryItem.planPrice,
        durationDays: activeHistoryItem.durationDays,
        daysLeft: dl,
        startDate: activeHistoryItem.startDate ? String(activeHistoryItem.startDate) : null,
        endDate: activeHistoryItem.endDate ? String(activeHistoryItem.endDate) : null,
        maxListings: activeHistoryItem.maxListings ?? null,
        planColor: null,
      };
    }

    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProvider, stats?.subscription, userSub, history]);

  // True while any required data is still in-flight (including auth)
  const isLoading = authLoading || (isProvider ? (statsLoading && !!providerId) : userSubLoading) || plansLoading;

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
    mutationFn: (plan: BillingPlan) => {
      // Use provider flow only when explicitly a provider WITH a valid providerId
      if (isProvider && providerId && Number.isFinite(providerId) && providerId > 0) {
        return api.subscriptions.subscribe(providerId, plan.id, true);
      }
      // All other cases (regular user OR provider without providerId) → user flow
      if (!userId || !Number.isFinite(userId) || userId < 1) {
        return Promise.reject(new Error("يرجى تسجيل الخروج وإعادة الدخول مجدداً."));
      }
      return api.userSubscription.subscribe(userId, plan.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
      queryClient.invalidateQueries({ queryKey: ["userCurrentSub", userId] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionHistory"] });
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
            <p className="text-muted-foreground mt-1 text-sm">
              {isProvider ? "إدارة اشتراكك الحالي وسجل باقاتك السابقة" : "الباقات المتاحة للنشر والإعلان العقاري"}
            </p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
              queryClient.invalidateQueries({ queryKey: ["userCurrentSub", userId] });
              queryClient.invalidateQueries({ queryKey: ["subscriptionHistory"] });
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ── Expiry Alert (all users with expiring sub) ─────────────────────── */}
        {!isLoading && sub?.isActive && sub.daysLeft != null && sub.daysLeft <= 7 && !alertDismissed && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">اشتراكك سينتهي خلال {sub.daysLeft} {sub.daysLeft === 1 ? "يوم" : "أيام"}</p>
                <p className="text-sm text-amber-700 mt-0.5">جدّد الآن واستمر في الاستفادة من مزايا باقتك</p>
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
                SECTION 1 — Current Plan (world-class card)
            ══════════════════════════════════════════════════════════════════ */}
            {sub ? (
              <ActiveSubCard
                sub={sub}
                isProvider={isProvider}
                stats={stats}
                progressPct={progressPct}
                currentStatus={currentStatus}
                sortedPlans={sortedPlans}
                isCurrentPlan={isCurrentPlan}
                handleSubscribeClick={handleSubscribeClick}
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-100 flex items-center justify-center mx-auto">
                  <Package className="w-9 h-9 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">لا يوجد اشتراك نشط</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                    {isProvider
                      ? "اشترك في إحدى الباقات أدناه لتفعيل حسابك وبدء استقبال الطلبات."
                      : "اختر إحدى الباقات أدناه للحصول على مزايا إضافية عند نشر عقاراتك."}
                  </p>
                </div>
                <a href="#upgrade">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 h-11 px-6 text-sm font-semibold">
                    <Zap className="w-4 h-4" />
                    اختر باقتك الآن
                  </Button>
                </a>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 2 — Subscription History (all users)
            ══════════════════════════════════════════════════════════════════ */}
            {<div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
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
            </div>}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 3 — Upgrade / Plans (visible to all roles)
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
