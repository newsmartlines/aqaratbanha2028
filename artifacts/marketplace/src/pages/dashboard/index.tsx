/**
 * Dashboard Overview — Unified for "user" and "provider" roles.
 *
 * Architecture:
 * ─────────────────────────────────────────────────────────────
 * • ONE component tree, ONE DashboardLayout, ONE render path
 * • Shared components: DashboardHero, DashboardStatCard
 * • Role-specific DATA is passed as config arrays — not duplicate JSX
 * • Role-specific SECTIONS use {isProvider && ...} / {isUser && ...}
 *
 * Adding a new card, button, or UI element to this page automatically
 * appears for both roles unless explicitly wrapped in a role guard.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Star, Heart, BellRing, Bell, Search, Building2,
  Loader2, AlertCircle, Plus, Eye, Phone,
  MessageCircle, Clock, CheckCircle2, Sparkles, TrendingUp,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardStatCard, type StatCardConfig } from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats, type ProviderInteractions, type Notification } from "@/lib/api";

export default function DashboardOverview() {
  const { isProvider, isUser, providerId } = useRole();
  const { user, loading: authLoading, refetch } = useAuth();

  const [hydrateAttempts, setHydrateAttempts] = useState(0);

  useEffect(() => {
    if (!authLoading && isProvider && user?.providerId == null) {
      void refetch();
    }
  }, [authLoading, isProvider, user?.providerId, refetch]);

  useEffect(() => {
    if (authLoading || !isProvider || user?.providerId != null) return;
    if (hydrateAttempts >= 12) return;
    const t = window.setTimeout(() => {
      void refetch().finally(() => setHydrateAttempts((a) => a + 1));
    }, 200);
    return () => window.clearTimeout(t);
  }, [authLoading, isProvider, user?.providerId, hydrateAttempts, refetch]);

  // ── Provider queries ───────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
  } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    retry: 2,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _interactions } = useQuery<ProviderInteractions>({
    queryKey: ["providerInteractions", providerId],
    queryFn: () => api.providers.getInteractions(providerId!),
    enabled: isProvider && !!providerId,
  });

  // ── User queries ───────────────────────────────────────────────────────────
  const { data: myProperties = [] } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: isUser && !!user,
    staleTime: 30_000,
  });
  const { data: favorites = [] } = useQuery({
    queryKey: ["property-favorites"],
    queryFn: () => api.propertyFavorites.list(),
    enabled: isUser && !!user,
    staleTime: 30_000,
  });
  const { data: savedSearches = [] } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => api.savedSearches.list(),
    enabled: isUser && !!user,
    staleTime: 60_000,
  });

  // ── Shared: recent notifications ──────────────────────────────────────────
  const { data: notificationsRaw } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications.list,
    enabled: !!user,
    staleTime: 30_000,
  });
  const recentNotifications: Notification[] = Array.isArray(notificationsRaw)
    ? (notificationsRaw as Notification[]).slice(0, 5)
    : ((notificationsRaw as any)?.rows ?? []).slice(0, 5);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center" dir="rtl">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <p className="text-lg font-medium">يرجى تسجيل الدخول للوصول إلى لوحة التحكم.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ── Role-specific stat CONFIGS (data only — card UI is always DashboardStatCard) ──

  const userStatCards: StatCardConfig[] = [
    {
      label:  "عقاراتي المعلنة",
      value:  (myProperties as any[]).length,
      icon:   Building2,
      color:  "text-teal-600",
      bg:     "bg-teal-500/10",
      border: "border-teal-200/50 dark:border-teal-800/40",
      accent: "from-teal-500/5",
      href:   "/dashboard/properties",
      suffix: "عقار",
    },
    {
      label:  "المفضلة",
      value:  (favorites as any[]).length,
      icon:   Heart,
      color:  "text-rose-500",
      bg:     "bg-rose-500/10",
      border: "border-rose-200/50 dark:border-rose-800/40",
      accent: "from-rose-500/5",
      href:   "/dashboard/favorites",
      suffix: "عقار",
    },
    {
      label:  "تنبيهات البحث",
      value:  (savedSearches as any[]).length,
      icon:   BellRing,
      color:  "text-blue-500",
      bg:     "bg-blue-500/10",
      border: "border-blue-200/50 dark:border-blue-800/40",
      accent: "from-blue-500/5",
      href:   "/dashboard/saved-searches",
      suffix: "تنبيه",
    },
    {
      label:  "المشاهدات",
      value:  (myProperties as any[]).reduce((s: number, p: any) => s + (p.viewCount ?? 0), 0),
      icon:   Eye,
      color:  "text-indigo-500",
      bg:     "bg-indigo-500/10",
      border: "border-indigo-200/50 dark:border-indigo-800/40",
      accent: "from-indigo-500/5",
      href:   "/dashboard/properties",
      suffix: "مشاهدة",
    },
  ];

  const providerStatCards: StatCardConfig[] = [
    {
      label:  "عدد عقاراتي",
      value:  stats?.totalProperties ?? 0,
      icon:   Building2,
      color:  "text-blue-600",
      bg:     "bg-blue-500/10",
      border: "border-blue-200/60 dark:border-blue-800/40",
      accent: "from-blue-500/5",
      href:   "/dashboard/properties",
      suffix: "عقار",
    },
    {
      label:  "إجمالي المشاهدات",
      value:  stats?.totalViews ?? 0,
      icon:   Eye,
      color:  "text-violet-600",
      bg:     "bg-violet-500/10",
      border: "border-violet-200/60 dark:border-violet-800/40",
      accent: "from-violet-500/5",
      href:   "/dashboard/properties",
      suffix: "مشاهدة",
    },
    {
      label:  "ضغطات الهاتف",
      value:  stats?.totalPhoneClicks ?? 0,
      icon:   Phone,
      color:  "text-emerald-600",
      bg:     "bg-emerald-500/10",
      border: "border-emerald-200/60 dark:border-emerald-800/40",
      accent: "from-emerald-500/5",
      href:   "/dashboard/properties",
      suffix: "ضغطة",
    },
    {
      label:  "العقارات النشطة",
      value:  stats?.activeProperties ?? 0,
      icon:   CheckCircle2,
      color:  "text-teal-600",
      bg:     "bg-teal-500/10",
      border: "border-teal-200/60 dark:border-teal-800/40",
      accent: "from-teal-500/5",
      href:   "/dashboard/properties",
      suffix: "نشط",
    },
    {
      label:  "العقارات المميزة",
      value:  stats?.featuredProperties ?? 0,
      icon:   Sparkles,
      color:  "text-amber-600",
      bg:     "bg-amber-500/10",
      border: "border-amber-200/60 dark:border-amber-800/40",
      accent: "from-amber-500/5",
      href:   "/dashboard/properties",
      suffix: "مميز",
    },
  ];

  // Active cards depend on role — same card component either way
  const activeStatCards  = isProvider ? providerStatCards : userStatCards;
  const statsGridCols    = isProvider
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  // Subscription data (provider only)
  const sub = stats?.subscription ?? null;

  // User quick-links config
  const quickLinks = [
    { href: "/add-property",             icon: Plus,      iconCls: "bg-teal-600 text-white",                           cardCls: "bg-teal-500/10 border-teal-200/50 dark:border-teal-800/50",  label: "أضف عقارك مجاناً",    sub: "أعلن وابدأ في استقبال العروض" },
    { href: "/properties",               icon: Search,    iconCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",    cardCls: "hover:bg-secondary/50 border-border/50",                      label: "البحث عن عقار",        sub: "تصفح آلاف العقارات" },
    { href: "/dashboard/properties",     icon: Building2, iconCls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600", cardCls: "hover:bg-secondary/50 border-border/50",                  label: "عقاراتي المعلنة",       sub: "تابع حالة إعلاناتك" },
    { href: "/dashboard/favorites",      icon: Heart,     iconCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-600",    cardCls: "hover:bg-secondary/50 border-border/50",                      label: "المفضلة",               sub: "العقارات التي أعجبتك" },
    { href: "/dashboard/saved-searches", icon: BellRing,  iconCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-600", cardCls: "hover:bg-secondary/50 border-border/50",                     label: "تنبيهات البحث",         sub: "تنبيه عند وجود عقارات جديدة" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">

        {/* ── Error banner (provider only) ──────────────────────────────────── */}
        {isProvider && statsError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            تعذر تحميل إحصائيات الحساب: {(statsErrorObj as Error)?.message ?? "خطأ غير معروف"}
          </div>
        )}

        {/* ── Provider ID hydration spinner ─────────────────────────────────── */}
        {isProvider && providerId == null && (
          <div className="p-8 max-w-md mx-auto text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">جاري تحميل الملف التجاري…</p>
            <p className="text-sm text-muted-foreground">
              يتم مزامنة الجلسة مع الخادم. انتظر لحظات أو اضغط تحديثاً يدوياً.
            </p>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              تحديث
            </Button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            HERO BANNER
            ONE shared component — role-specific gradient & subtitle via props.
            Change DashboardHero.tsx once → affects both roles.
        ════════════════════════════════════════════════════════════════════ */}
        <DashboardHero
          isProvider={isProvider}
          name={user.name}
          avatar={user.avatar}
        />

        {/* ════════════════════════════════════════════════════════════════════
            STATS GRID
            ONE shared DashboardStatCard component for all roles.
            Role-specific DATA is in the arrays above — not in the UI component.
            Change DashboardStatCard.tsx once → affects both roles.
        ════════════════════════════════════════════════════════════════════ */}

        {/* Provider: section header (user doesn't need one) */}
        {isProvider && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                إحصائياتك الآن
              </h3>
              <p className="text-muted-foreground text-sm mt-0.5">تُحدَّث تلقائياً كل 30 ثانية</p>
            </div>
            <Link href="/dashboard/properties">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                إدارة العقارات
              </Button>
            </Link>
          </div>
        )}

        {/* Stat cards — same DashboardStatCard component, different data per role */}
        <div className={`grid ${statsGridCols} gap-4`}>
          {activeStatCards.map((card) => (
            <DashboardStatCard
              key={card.label}
              {...card}
              loading={isProvider ? statsLoading : false}
            />
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            PROVIDER-ONLY SECTIONS
            Interactions breakdown + Subscription card
        ════════════════════════════════════════════════════════════════════ */}
        {isProvider && (
          <>
            {/* Interactions breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon:  Phone,
                  label: "ضغطات الهاتف",
                  value: stats?.totalPhoneClicks ?? 0,
                  sub:   "عدد مرات النقر على رقمك",
                  cls:   "border-blue-200/60 dark:border-blue-800/40 from-blue-500/5",
                  iCls:  "bg-blue-500/10 text-blue-600",
                },
                {
                  icon:  MessageCircle,
                  label: "ضغطات واتساب",
                  value: stats?.totalWhatsappClicks ?? 0,
                  sub:   "عدد مرات النقر على واتساب",
                  cls:   "border-green-200/60 dark:border-green-800/40 from-green-500/5",
                  iCls:  "bg-green-500/10 text-green-600",
                },
                {
                  icon:  Star,
                  label: "إجمالي التفاعل",
                  value: (stats?.totalPhoneClicks ?? 0) + (stats?.totalWhatsappClicks ?? 0),
                  sub:   "مجموع كل الضغطات",
                  cls:   "border-violet-200/60 dark:border-violet-800/40 from-violet-500/5",
                  iCls:  "bg-violet-500/10 text-violet-600",
                },
              ].map(({ icon: Icon, label, value, sub: subLabel, cls, iCls }) => (
                <div
                  key={label}
                  className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cls} to-transparent bg-card p-5`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iCls}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                  </div>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-secondary/60 rounded-lg animate-pulse" />
                  ) : (
                    <p className="text-3xl font-extrabold text-foreground">
                      {value.toLocaleString("ar-EG")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>
                </div>
              ))}
            </div>

            {/* Subscription mini-card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 border-primary/20 shadow-md bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>حالة الاشتراك</span>
                    {sub ? (
                      <Badge
                        variant="outline"
                        className={
                          sub.isActive
                            ? "bg-green-500/10 text-green-700 border-green-200"
                            : "bg-red-500/10 text-red-700 border-red-200"
                        }
                      >
                        {sub.packageNameAr ?? "اشتراك"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                        {statsLoading ? "…" : "لا توجد باقة"}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                      <div className="h-2 bg-secondary/50 rounded animate-pulse" />
                    </div>
                  ) : sub ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> الأيام المتبقية
                        </span>
                        <span className={`font-bold ${sub.isActive ? "text-primary" : "text-red-600"}`}>
                          {sub.daysLeft !== null ? `${sub.daysLeft} يوم` : "—"}
                        </span>
                      </div>
                      {sub.durationDays && sub.daysLeft !== null && (
                        <Progress
                          value={Math.round((sub.daysLeft / sub.durationDays) * 100)}
                          className="h-2 [&>div]:bg-primary"
                        />
                      )}
                      {!sub.isActive && (
                        <div className="bg-red-500/10 text-red-700 p-3 rounded-lg text-sm font-medium flex items-start gap-2">
                          <span className="text-lg leading-none mt-0.5">⚠️</span>
                          <span>انتهى اشتراكك. جدد الآن للاستمرار.</span>
                        </div>
                      )}
                      {sub.isActive && sub.daysLeft !== null && sub.daysLeft <= 7 && (
                        <div className="bg-amber-500/10 text-amber-700 p-3 rounded-lg text-sm font-medium flex items-start gap-2">
                          <span className="text-lg leading-none mt-0.5">⚠️</span>
                          <span>اشتراكك على وشك الانتهاء. جدد الآن.</span>
                        </div>
                      )}
                      <Link href="/dashboard/packages">
                        <Button className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                          إدارة الاشتراك
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">لم يتم العثور على باقة نشطة.</p>
                      <Link href="/dashboard/packages">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                          صفحة الاشتراكات
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            USER-ONLY SECTIONS
            Quick links + Recent notifications
        ════════════════════════════════════════════════════════════════════ */}
        {isUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Quick links */}
            <div className="lg:col-span-1">
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">روابط سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {quickLinks.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors border cursor-pointer ${item.cardCls}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconCls}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{item.label}</h4>
                          <p className="text-xs text-muted-foreground">{item.sub}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent notifications */}
            <Card className="lg:col-span-2 border-border/50 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">الإشعارات الأخيرة</CardTitle>
                <Link href="/dashboard/notifications">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    عرض الكل
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {recentNotifications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا توجد إشعارات حتى الآن</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentNotifications.map((n, index) => (
                      <div key={n.id} className="relative flex gap-4">
                        {index !== recentNotifications.length - 1 && (
                          <div className="absolute top-10 right-5 w-[2px] h-full bg-border -z-10" />
                        )}
                        <div
                          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10 border-4 border-background ${
                            !n.read ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.message}
                          </p>
                          {n.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(n.createdAt).toLocaleString("ar-EG", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
