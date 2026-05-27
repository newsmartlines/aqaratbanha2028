/**
 * SubscriptionWidget — Shared dashboard component for both "user" and "provider" roles.
 *
 * Drop this anywhere inside DashboardLayout and it automatically fetches the
 * correct subscription data based on the current user's role.  Any design or
 * logic change here is reflected for all roles immediately.
 */

import { Link } from "wouter";
import {
  Crown, Clock, AlertTriangle, CheckCircle2, XCircle,
  ArrowUpRight, Zap, Building2, CalendarDays, Package,
  Infinity, RefreshCw, Sparkles, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/lib/use-role";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats } from "@/lib/api";
import { parseLimits, parseFeatures, fmtDate, FEATURE_LABELS } from "@/lib/plan-helpers";
import { useAuth } from "@/lib/auth-context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubscriptionData {
  packageNameAr: string | null;
  startDate: string;
  endDate: string;
  daysLeft: number | null;
  durationDays: number | null;
  isActive: boolean;
  maxListings?: number | null;
  billingPlanId?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(sub: SubscriptionData | null): "expired" | "critical" | "warning" | "active" | "none" {
  if (!sub) return "none";
  if (!sub.isActive) return "expired";
  const days = sub.daysLeft ?? 0;
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "active";
}

const STATUS_CONFIG = {
  active: {
    label: "نشطة",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    iconCls: "text-emerald-500",
  },
  warning: {
    label: "تنتهي قريباً",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    iconCls: "text-amber-500",
  },
  critical: {
    label: "تنتهي قريباً جداً",
    badgeCls: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
    iconCls: "text-red-500",
  },
  expired: {
    label: "منتهية",
    badgeCls: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
    iconCls: "text-red-500",
  },
  none: {
    label: "لا توجد باقة",
    badgeCls: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Package,
    iconCls: "text-gray-400",
  },
};

function SkeletonLoader() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-secondary/60 rounded-lg" />
        <div className="h-6 w-20 bg-secondary/60 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-secondary/40 rounded-xl" />
        ))}
      </div>
      <div className="h-2 bg-secondary/40 rounded-full" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-secondary/40 rounded-xl" />
        <div className="h-10 flex-1 bg-secondary/40 rounded-xl" />
      </div>
    </div>
  );
}

// ── Stat Cell ─────────────────────────────────────────────────────────────────

function StatCell({
  icon: Icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1.5 ${highlight ? "border-primary/20 bg-primary/5" : "border-border/50 bg-secondary/20"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`w-3.5 h-3.5 ${highlight ? "text-primary" : ""}`} />
        <span>{label}</span>
      </div>
      <div className={`text-lg font-bold leading-tight ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── No Subscription State ─────────────────────────────────────────────────────

function NoSubscription({ packagesHref }: { packagesHref: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto">
        <Package className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-base">لا توجد باقة نشطة</h3>
        <p className="text-sm text-muted-foreground mt-1">
          اشترك في إحدى الباقات للاستفادة من كامل مميزات المنصة
        </p>
      </div>
      <Link href={packagesHref}>
        <Button className="rounded-xl gap-2 px-6">
          <Sparkles className="w-4 h-4" />
          تصفح الباقات
        </Button>
      </Link>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SubscriptionWidget() {
  const { isProvider, providerId } = useRole();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const packagesHref = isProvider ? "/dashboard/packages" : "/dashboard/packages";

  if (isLoading && isProvider) return <SkeletonLoader />;

  const sub: SubscriptionData | null = isProvider ? (stats?.subscription ?? null) : null;
  const totalProperties = isProvider ? (stats?.totalProperties ?? 0) : (0);
  const maxListings = sub?.maxListings ?? null;
  const usedListings = totalProperties;
  const remainingListings = maxListings !== null && maxListings >= 0
    ? Math.max(0, maxListings - usedListings)
    : null;

  const status = getStatus(sub);
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  const progressPct = sub?.durationDays && sub.daysLeft !== null
    ? Math.max(0, Math.min(100, Math.round((sub.daysLeft / sub.durationDays) * 100)))
    : 0;

  const isExpiring = status === "warning" || status === "critical";
  const isExpired = status === "expired";
  const hasNoSub = status === "none";

  if (hasNoSub) {
    return <NoSubscription packagesHref={packagesHref} />;
  }

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden shadow-sm transition-all
      ${isExpired ? "border-red-200 dark:border-red-900/40" : isExpiring ? "border-amber-200 dark:border-amber-900/40" : "border-border/60"}`}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`px-6 py-4 flex items-center justify-between gap-4 border-b
        ${isExpired
          ? "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/30"
          : isExpiring
          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30"
          : "bg-gradient-to-l from-primary/5 to-transparent border-border/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            ${isExpired
              ? "bg-red-100 dark:bg-red-900/30 text-red-600"
              : isExpiring
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
              : "bg-primary/10 text-primary"
            }`}
          >
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">
              {sub?.packageNameAr ?? "الباقة الحالية"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">باقتك الحالية</p>
          </div>
        </div>

        <Badge variant="outline" className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium ${cfg.badgeCls}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${cfg.iconCls}`} />
          {cfg.label}
        </Badge>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-6 space-y-6">

        {/* Warning / Expired banners */}
        {isExpired && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>انتهت باقتك.</strong> لن تتمكن من نشر عقارات جديدة أو الاستفادة من المميزات. جدّد اشتراكك الآن.
            </span>
          </div>
        )}
        {isExpiring && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>باقتك تنتهي خلال {sub?.daysLeft ?? 0} {sub?.daysLeft === 1 ? "يوم" : "أيام"}.</strong> جدّد الآن للاستمرار بدون انقطاع.
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCell
            icon={Clock}
            label="الأيام المتبقية"
            value={
              sub?.daysLeft !== null
                ? <span dir="ltr">{sub?.daysLeft ?? 0} <span className="text-sm font-normal text-muted-foreground">يوم</span></span>
                : "—"
            }
            highlight={!isExpired}
          />
          <StatCell
            icon={CalendarDays}
            label="تاريخ الانتهاء"
            value={fmtDate(sub?.endDate ?? null)}
            sub={sub?.startDate ? `من ${fmtDate(sub.startDate)}` : undefined}
          />
          <StatCell
            icon={Building2}
            label="العقارات المستخدمة"
            value={
              <span dir="ltr">
                {usedListings}
                {maxListings !== null && maxListings >= 0
                  ? <span className="text-sm font-normal text-muted-foreground"> / {maxListings}</span>
                  : <span className="text-sm font-normal text-muted-foreground"> عقار</span>
                }
              </span>
            }
          />
          <StatCell
            icon={maxListings === null || maxListings < 0 ? Infinity : Star}
            label="العقارات المتبقية"
            value={
              maxListings === null || maxListings < 0
                ? "غير محدود"
                : remainingListings !== null
                ? `${remainingListings} عقار`
                : "—"
            }
            highlight={remainingListings !== null && maxListings !== null && maxListings > 0 && remainingListings <= Math.ceil(maxListings * 0.2)}
          />
        </div>

        {/* Progress bar */}
        {sub?.durationDays && sub.daysLeft !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>مدة الاشتراك</span>
              <span className="font-medium text-foreground">{progressPct}% متبقٍّ</span>
            </div>
            <Progress
              value={progressPct}
              className={`h-2.5 rounded-full [&>div]:rounded-full
                ${isExpired ? "[&>div]:bg-red-500" : isExpiring ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>بدأ: {fmtDate(sub.startDate)}</span>
              <span>ينتهي: {fmtDate(sub.endDate)}</span>
            </div>
          </div>
        )}

        {/* Features */}
        <PlanFeatures billingPlanId={sub?.billingPlanId ?? null} maxListings={maxListings} />

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {isExpired ? (
            <>
              <Link href={packagesHref} className="flex-1">
                <Button className="w-full rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white">
                  <RefreshCw className="w-4 h-4" />
                  تجديد الاشتراك الآن
                </Button>
              </Link>
              <Link href={packagesHref} className="flex-1">
                <Button variant="outline" className="w-full rounded-xl gap-2 border-red-200 text-red-700 hover:bg-red-50">
                  <Zap className="w-4 h-4" />
                  الترقية إلى باقة أعلى
                </Button>
              </Link>
            </>
          ) : isExpiring ? (
            <>
              <Link href={packagesHref} className="flex-1">
                <Button className="w-full rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                  <RefreshCw className="w-4 h-4" />
                  تجديد الاشتراك
                </Button>
              </Link>
              <Link href={packagesHref} className="flex-1">
                <Button variant="outline" className="w-full rounded-xl gap-2">
                  <Zap className="w-4 h-4" />
                  ترقية الباقة
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href={packagesHref} className="flex-1">
                <Button className="w-full rounded-xl gap-2">
                  <Zap className="w-4 h-4" />
                  ترقية الباقة
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href={packagesHref} className="flex-1">
                <Button variant="outline" className="w-full rounded-xl gap-2">
                  <Crown className="w-4 h-4" />
                  شراء باقة أعلى
                </Button>
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Plan Features (fetched from billingPlan) ──────────────────────────────────

function PlanFeatures({
  billingPlanId,
  maxListings,
}: {
  billingPlanId: number | null;
  maxListings?: number | null;
}) {
  const { isProvider } = useRole();
  const billingUserType: "company" | "user" = isProvider ? "company" : "user";
  const { data: plans = [] } = useQuery({
    queryKey: ["billingPlans", billingUserType],
    queryFn: () => api.billingPlans.publicListByType(billingUserType),
    staleTime: 0,
  });

  const plan = billingPlanId ? plans.find((p: any) => p.id === billingPlanId) : null;
  const features = parseFeatures(plan?.features);
  const limits = parseLimits(plan?.limits);

  const enabledFeatures = Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => FEATURE_LABELS[k] ?? k)
    .slice(0, 6);

  if (enabledFeatures.length === 0 && !plan) return null;

  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">مميزات الباقة</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {/* Max listings from limits or direct maxListings */}
        {(limits.properties > 0 || (maxListings !== null && maxListings !== undefined)) && (
          <FeatureRow
            label={`${limits.properties > 0 ? limits.properties : maxListings} عقار مسموح`}
            active={true}
          />
        )}
        {/* Enabled feature flags */}
        {enabledFeatures.map((label) => (
          <FeatureRow key={label} label={label} active={true} />
        ))}
        {/* Photos per listing */}
        {limits.photos > 0 && (
          <FeatureRow label={`${limits.photos} صورة لكل عقار`} active={true} />
        )}
      </div>
    </div>
  );
}

function FeatureRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-emerald-500/10" : "bg-secondary"}`}>
        <CheckCircle2 className={`w-3 h-3 ${active ? "text-emerald-600" : "text-muted-foreground"}`} />
      </div>
      <span className={active ? "text-foreground" : "text-muted-foreground line-through"}>{label}</span>
    </div>
  );
}
