import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Bell, Building2, Eye, Phone, MessageCircle, Users,
  CheckCircle2, Sparkles, Heart, BellRing, Search, Plus,
  Loader2, AlertCircle, Clock, ChevronLeft,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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

  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    retry: 2,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const { data: interactions } = useQuery<ProviderInteractions>({
    queryKey: ["providerInteractions", providerId],
    queryFn: () => api.providers.getInteractions(providerId!),
    enabled: isProvider && !!providerId,
  });

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
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center" dir="rtl">
          <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-3" />
          <p className="text-base font-medium text-gray-700">يرجى تسجيل الدخول للوصول إلى لوحة التحكم.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ── USER DASHBOARD ──────────────────────────────────────────────────────────
  if (user.role === "user") {
    const userStats = [
      { name: "عقاراتي المعلنة", value: myProperties.length, icon: Building2, href: "/dashboard/properties" },
      { name: "المفضلة",          value: favorites.length,    icon: Heart,     href: "/dashboard/favorites" },
      { name: "تنبيهات البحث",   value: savedSearches.length, icon: BellRing, href: "/dashboard/saved-searches" },
      { name: "إجمالي المشاهدات", value: (myProperties as any[]).reduce((s: number, p: any) => s + (p.viewCount ?? 0), 0), icon: Eye, href: "/dashboard/properties" },
    ];

    const quickLinks = [
      { href: "/add-property",          icon: Plus,      label: "أضف عقارك مجاناً",   sub: "أعلن وابدأ في استقبال العروض", primary: true },
      { href: "/properties",            icon: Search,    label: "البحث عن عقار",      sub: "تصفح آلاف العقارات",           primary: false },
      { href: "/dashboard/properties",  icon: Building2, label: "عقاراتي المعلنة",    sub: "تابع حالة إعلاناتك",           primary: false },
      { href: "/dashboard/favorites",   icon: Heart,     label: "المفضلة",            sub: "العقارات التي أعجبتك",          primary: false },
      { href: "/dashboard/saved-searches", icon: BellRing, label: "تنبيهات البحث",   sub: "تنبيه عند وجود عقارات جديدة",  primary: false },
    ];

    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8" dir="rtl">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">مرحباً، {user.name ?? "المستخدم"}</h1>
              <p className="text-sm text-gray-500 mt-1">إليك ملخص نشاطك على المنصة</p>
            </div>
            <Link href="/add-property">
              <Button className="gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold">
                <Plus className="w-4 h-4" />
                أضف عقارك
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.map((stat) => (
              <Link key={stat.name} href={stat.href}>
                <div className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{stat.name}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">روابط سريعة</h3>
              <div className="space-y-1">
                {quickLinks.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${item.primary ? "bg-gray-900 text-white hover:bg-gray-800" : "hover:bg-gray-50"}`}>
                      <item.icon className={`w-4 h-4 shrink-0 ${item.primary ? "text-white" : "text-gray-400"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${item.primary ? "text-white" : "text-gray-800"}`}>{item.label}</p>
                        <p className={`text-xs truncate ${item.primary ? "text-white/70" : "text-gray-400"}`}>{item.sub}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent notifications */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">الإشعارات الأخيرة</h3>
                <Link href="/dashboard/notifications">
                  <span className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer">عرض الكل</span>
                </Link>
              </div>
              {recentNotifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">لا توجد إشعارات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-gray-900" : "bg-gray-200"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!n.read ? "text-gray-900 font-medium" : "text-gray-500"}`}>{n.message}</p>
                        {n.createdAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── PROVIDER DASHBOARD ──────────────────────────────────────────────────────

  if (providerId == null) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="text-base font-medium text-gray-700">جاري تحميل الملف التجاري…</p>
          <p className="text-sm text-gray-400">يتم مزامنة الجلسة مع الخادم.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>تحديث</Button>
        </div>
      </DashboardLayout>
    );
  }

  const kpiCards = [
    { label: "عقاراتي",          value: stats?.totalProperties ?? 0,  icon: Building2,    suffix: "عقار",    href: "/dashboard/properties" },
    { label: "المشاهدات",         value: stats?.totalViews ?? 0,        icon: Eye,          suffix: "مشاهدة",  href: "/dashboard/properties" },
    { label: "ضغطات الهاتف",      value: stats?.totalPhoneClicks ?? 0,  icon: Phone,        suffix: "ضغطة",    href: "/dashboard/properties" },
    { label: "نشطة",             value: stats?.activeProperties ?? 0,  icon: CheckCircle2, suffix: "عقار",    href: "/dashboard/properties" },
    { label: "مميزة",            value: stats?.featuredProperties ?? 0, icon: Sparkles,    suffix: "عقار",    href: "/dashboard/properties" },
  ];
  const sub = stats?.subscription ?? null;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8" dir="rtl">

        {statsError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            تعذر تحميل إحصائيات الحساب: {(statsErrorObj as Error)?.message ?? "خطأ غير معروف"}
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500 mt-1">لوحة تحكم المعلن العقاري · تُحدَّث كل 30 ثانية</p>
          </div>
          <Link href="/add-property">
            <Button className="gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" />
              أضف عقاراً جديداً
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <div className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <card.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400" />
                </div>
                {statsLoading ? (
                  <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString("ar-EG")}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 font-medium">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Engagement + Subscription row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Engagement */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">تفاعل الزوار</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Phone,          label: "ضغطات الهاتف",  value: stats?.totalPhoneClicks ?? 0 },
                { icon: MessageCircle,  label: "ضغطات واتساب", value: stats?.totalWhatsappClicks ?? 0 },
                { icon: Users,          label: "إجمالي التفاعل", value: (stats?.totalPhoneClicks ?? 0) + (stats?.totalWhatsappClicks ?? 0) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center py-4 rounded-lg bg-gray-50 border border-gray-100">
                  <Icon className="w-4 h-4 text-gray-400 mx-auto mb-2" />
                  {statsLoading ? (
                    <div className="h-6 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
                  ) : (
                    <p className="text-xl font-bold text-gray-900">{value.toLocaleString("ar-EG")}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">الاشتراك</h3>
              {sub && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {sub.isActive ? "نشط" : "منتهي"}
                </span>
              )}
            </div>

            {statsLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-2 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : sub ? (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-bold text-gray-900">{sub.packageNameAr ?? "باقة"}</p>
                  <div className="flex items-center justify-between mt-2 mb-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> الأيام المتبقية
                    </span>
                    <span className={`text-xs font-semibold ${sub.isActive ? "text-gray-900" : "text-red-600"}`}>
                      {sub.daysLeft !== null ? `${sub.daysLeft} يوم` : "—"}
                    </span>
                  </div>
                  {sub.durationDays && sub.daysLeft !== null && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
                        style={{ width: `${Math.round((sub.daysLeft / sub.durationDays) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                {!sub.isActive && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">انتهى اشتراكك. جدد الآن للاستمرار.</p>
                )}
                {sub.isActive && sub.daysLeft !== null && sub.daysLeft <= 7 && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">اشتراكك ينتهي قريباً.</p>
                )}
                <Link href="/dashboard/packages">
                  <Button variant="outline" size="sm" className="w-full text-xs rounded-lg border-gray-200 hover:bg-gray-50">إدارة الاشتراك</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">لم يتم العثور على باقة نشطة.</p>
                <Link href="/dashboard/packages">
                  <Button size="sm" className="w-full text-xs rounded-lg bg-gray-900 hover:bg-gray-800 text-white">استعرض الباقات</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent notifications */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">الإشعارات الأخيرة</h3>
            <Link href="/dashboard/notifications">
              <span className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer">عرض الكل</span>
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-7 h-7 mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">لا توجد إشعارات حتى الآن</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentNotifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${!n.read ? "bg-gray-900" : "bg-gray-200"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.read ? "text-gray-900 font-medium" : "text-gray-500"}`}>{n.message}</p>
                    {n.createdAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.createdAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
