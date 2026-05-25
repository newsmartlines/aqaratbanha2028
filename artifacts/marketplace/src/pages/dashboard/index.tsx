import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Users, Star, List, Heart, BellRing, Bell, Search, Building2,
  Loader2, AlertCircle, Plus, Eye, Phone,
  MessageCircle, Send, Clock, CheckCircle2, Sparkles, TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats, type ProviderInteractions, type Notification, mediaUrl } from "@/lib/api";

export default function DashboardOverview() {
  const { user, loading: authLoading, refetch } = useAuth();
  const isProvider = user?.role === "provider";
  const providerId = user?.providerId;
  const [hydrateAttempts, setHydrateAttempts] = useState(0);

  useEffect(() => {
    if (!authLoading && user?.role === "provider" && user.providerId == null) {
      void refetch();
    }
  }, [authLoading, user?.role, user?.providerId, refetch]);

  useEffect(() => {
    if (authLoading || user?.role !== "provider" || user?.providerId != null) return;
    if (hydrateAttempts >= 12) return;
    const t = window.setTimeout(() => {
      void refetch().finally(() => setHydrateAttempts((a) => a + 1));
    }, 200);
    return () => window.clearTimeout(t);
  }, [authLoading, user?.role, user?.providerId, hydrateAttempts, refetch]);

  // Provider queries
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    retry: 2,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const { data: interactions, isLoading: interactionsLoading } = useQuery<ProviderInteractions>({
    queryKey: ["providerInteractions", providerId],
    queryFn: () => api.providers.getInteractions(providerId!),
    enabled: isProvider && !!providerId,
  });

  // User queries
  const { data: myProperties = [] } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: !isProvider && !!user,
    staleTime: 30_000,
  });
  const { data: favorites = [] } = useQuery({
    queryKey: ["property-favorites"],
    queryFn: () => api.propertyFavorites.list(),
    enabled: !isProvider && !!user,
    staleTime: 30_000,
  });
  const { data: savedSearches = [] } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => api.savedSearches.list(),
    enabled: !isProvider && !!user,
    staleTime: 60_000,
  });

  // Shared: recent notifications
  const { data: notificationsRaw } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications.list,
    enabled: !!user,
    staleTime: 30_000,
  });
  const recentNotifications: Notification[] = Array.isArray(notificationsRaw)
    ? (notificationsRaw as Notification[]).slice(0, 5)
    : ((notificationsRaw as any)?.rows ?? []).slice(0, 5);

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

  // ── USER DASHBOARD ──────────────────────────────────────────────────────────
  if (user.role === "user") {
    const avatarSrc = user.avatar
      ? user.avatar
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name ?? "user")}`;

    const userStats = [
      { name: "عقاراتي المعلنة", value: String(myProperties.length), icon: Building2, color: "text-teal-600", bg: "bg-teal-500/10", href: "/dashboard/properties" },
      { name: "المفضلة", value: String(favorites.length), icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10", href: "/dashboard/favorites" },
      { name: "تنبيهات البحث", value: String(savedSearches.length), icon: BellRing, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/saved-searches" },
      { name: "المشاهدات", value: String((myProperties as any[]).reduce((s: number, p: any) => s + (p.viewCount ?? 0), 0)), icon: Eye, color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/dashboard/properties" },
    ];

    const quickLinks = [
      { href: "/add-property", icon: Plus, iconCls: "bg-teal-600 text-white", cardCls: "bg-teal-500/10 border-teal-200/50 dark:border-teal-800/50", label: "أضف عقارك مجاناً", sub: "أعلن وابدأ في استقبال العروض" },
      { href: "/properties", icon: Search, iconCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", cardCls: "hover:bg-secondary/50 border-border/50", label: "البحث عن عقار", sub: "تصفح آلاف العقارات" },
      { href: "/dashboard/properties", icon: Building2, iconCls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", cardCls: "hover:bg-secondary/50 border-border/50", label: "عقاراتي المعلنة", sub: "تابع حالة إعلاناتك" },
      { href: "/dashboard/favorites", icon: Heart, iconCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400", cardCls: "hover:bg-secondary/50 border-border/50", label: "المفضلة", sub: "العقارات التي أعجبتك" },
      { href: "/dashboard/saved-searches", icon: BellRing, iconCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", cardCls: "hover:bg-secondary/50 border-border/50", label: "تنبيهات البحث", sub: "تنبيه عند وجود عقارات جديدة" },
    ];

    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
          {/* Welcome hero */}
          <div className="relative overflow-hidden bg-gradient-to-l from-teal-700 to-[#0a1628] rounded-2xl p-6 text-white shadow-lg">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-8 w-32 h-32 rounded-full border-4 border-white/30" />
              <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full border-2 border-white/20" />
            </div>
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">مرحباً، {user.name ?? "المستخدم"}</h2>
                  <p className="text-white/70 mt-0.5 text-sm">ابحث عن عقار أحلامك أو أعلن عن عقارك بسهولة</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/properties">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-xl gap-2 text-sm">
                    <Search className="w-4 h-4" />
                    تصفح العقارات
                  </Button>
                </Link>
                <Link href="/add-property">
                  <Button className="bg-white text-teal-700 hover:bg-white/90 rounded-xl gap-2 text-sm font-bold">
                    <Plus className="w-4 h-4" />
                    أضف عقارك
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.map((stat) => (
              <Link key={stat.name} href={stat.href}>
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{stat.name}</p>
                        <p className="text-3xl font-bold text-foreground mt-1.5">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick links + Recent notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <Card className="lg:col-span-2 border-border/50 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">الإشعارات الأخيرة</CardTitle>
                <Link href="/dashboard/notifications">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">عرض الكل</Button>
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
                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10 border-4 border-background ${!n.read ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.message}</p>
                          {n.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(n.createdAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
        </div>
      </DashboardLayout>
    );
  }

  // ── PROVIDER DASHBOARD ─────────────────────────────────────────────────────

  if (providerId == null) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
          <p className="text-lg font-medium">جاري تحميل الملف التجاري…</p>
          <p className="text-sm text-muted-foreground">يتم مزامنة الجلسة مع الخادم. انتظر لحظات أو اضغط تحديثاً يدوياً.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>تحديث</Button>
        </div>
      </DashboardLayout>
    );
  }

  const kpiCards = [
    {
      label: "عدد عقاراتي",
      value: stats?.totalProperties ?? 0,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      border: "border-blue-200/60 dark:border-blue-800/40",
      accent: "from-blue-500/5",
      href: "/dashboard/properties",
      suffix: "عقار",
    },
    {
      label: "إجمالي المشاهدات",
      value: stats?.totalViews ?? 0,
      icon: Eye,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      border: "border-violet-200/60 dark:border-violet-800/40",
      accent: "from-violet-500/5",
      href: "/dashboard/properties",
      suffix: "مشاهدة",
    },
    {
      label: "ضغطات الهاتف",
      value: stats?.totalPhoneClicks ?? 0,
      icon: Phone,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-200/60 dark:border-emerald-800/40",
      accent: "from-emerald-500/5",
      href: "/dashboard/properties",
      suffix: "ضغطة",
    },
    {
      label: "العقارات النشطة",
      value: stats?.activeProperties ?? 0,
      icon: CheckCircle2,
      color: "text-teal-600",
      bg: "bg-teal-500/10",
      border: "border-teal-200/60 dark:border-teal-800/40",
      accent: "from-teal-500/5",
      href: "/dashboard/properties",
      suffix: "نشط",
    },
    {
      label: "العقارات المميزة",
      value: stats?.featuredProperties ?? 0,
      icon: Sparkles,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-200/60 dark:border-amber-800/40",
      accent: "from-amber-500/5",
      href: "/dashboard/properties",
      suffix: "مميز",
    },
  ];
  const sub = stats?.subscription ?? null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
        {statsError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            تعذر تحميل إحصائيات الحساب: {(statsErrorObj as Error)?.message ?? "خطأ غير معروف"}
          </div>
        )}

        {/* Hero CTA */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white" style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 60%, #12B5D0 100%)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 right-10 w-32 h-32 bg-white/5 rounded-full" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                {user.avatar ? (
                  <img src={mediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name ?? "provider")}`} alt={user.name} className="w-10 h-10 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">مرحباً بعودتك 👋</p>
                <h2 className="text-xl sm:text-2xl font-extrabold">{user.name}</h2>
                <p className="text-white/60 text-xs mt-0.5">لوحة تحكم المعلن العقاري</p>
              </div>
            </div>
            <Link href="/add-property">
              <Button size="lg" className="shrink-0 bg-white hover:bg-white/95 text-primary font-extrabold text-base rounded-2xl px-8 shadow-2xl shadow-black/20 transition-all hover:scale-105 active:scale-100 group">
                <span className="text-xl ml-2 group-hover:animate-bounce inline-block">+</span>
                أضف عقارك
              </Button>
            </Link>
          </div>
        </div>

        {/* ── KPI Stats Header ─────────────────────────────────────────── */}
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

        {/* ── KPI Cards Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${card.accent} to-transparent p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-80 ${card.border} bg-card`}>
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center ${card.color} transition-transform group-hover:scale-110`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${card.color}`} />
                </div>

                {/* Value */}
                {statsLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 w-20 bg-secondary/60 rounded-lg animate-pulse" />
                    <div className="h-3 w-16 bg-secondary/40 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {card.value.toLocaleString("ar-EG")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{card.suffix}</p>
                  </>
                )}

                {/* Label */}
                <p className={`text-sm font-semibold mt-3 ${card.color}`}>{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Interactions breakdown ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Phone, label: "ضغطات الهاتف", value: stats?.totalPhoneClicks ?? 0, sub: "عدد مرات النقر على رقمك", cls: "border-blue-200/60 dark:border-blue-800/40 from-blue-500/5", iCls: "bg-blue-500/10 text-blue-600" },
            { icon: MessageCircle, label: "ضغطات واتساب", value: stats?.totalWhatsappClicks ?? 0, sub: "عدد مرات النقر على واتساب", cls: "border-green-200/60 dark:border-green-800/40 from-green-500/5", iCls: "bg-green-500/10 text-green-600" },
            { icon: Users, label: "إجمالي التفاعل", value: (stats?.totalPhoneClicks ?? 0) + (stats?.totalWhatsappClicks ?? 0), sub: "مجموع كل الضغطات", cls: "border-violet-200/60 dark:border-violet-800/40 from-violet-500/5", iCls: "bg-violet-500/10 text-violet-600" },
          ].map(({ icon: Icon, label, value, sub, cls, iCls }) => (
            <div key={label} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cls} to-transparent bg-card p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iCls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 bg-secondary/60 rounded-lg animate-pulse" />
              ) : (
                <p className="text-3xl font-extrabold text-foreground">{value.toLocaleString("ar-EG")}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
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
                  <Badge variant="outline" className={sub.isActive ? "bg-green-500/10 text-green-700 border-green-200" : "bg-red-500/10 text-red-700 border-red-200"}>
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
                    <Progress value={Math.round((sub.daysLeft / sub.durationDays) * 100)} className="h-2 [&>div]:bg-primary" />
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
                    <Button className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">إدارة الاشتراك</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">لم يتم العثور على باقة نشطة.</p>
                  <Link href="/dashboard/packages">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">صفحة الاشتراكات</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
