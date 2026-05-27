/**
 * Dashboard Overview — Unified for "user" and "provider" roles.
 *
 * Architecture:
 * ─────────────────────────────────────────────────────────────
 * • ONE component tree, ONE DashboardLayout, ONE render path
 * • SubscriptionWidget is always the FIRST section — role-agnostic
 * • Role-specific SECTIONS use {isProvider && ...} / {isUser && ...}
 *
 * Adding a new card or section to this page automatically appears for
 * both roles unless explicitly wrapped in a role guard.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Heart, BellRing, Bell, Search, Building2,
  Loader2, AlertCircle, Plus, Eye, Phone, MessageCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { SubscriptionWidget } from "@/components/dashboard/SubscriptionWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type Notification } from "@/lib/api";

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

  // ── Provider stats (phone + whatsapp clicks) ──────────────────────────────
  const { data: providerStats } = useQuery({
    queryKey: ["provider-stats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    staleTime: 60_000,
  });
  const stats = providerStats;

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

  // suppress unused lint
  void myProperties; void favorites; void savedSearches;

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

  // User quick-links config
  const quickLinks = [
    { href: "/add-property",             icon: Plus,      iconCls: "bg-teal-600 text-white",                              cardCls: "bg-teal-500/10 border-teal-200/50 dark:border-teal-800/50",  label: "أضف عقارك مجاناً",    sub: "أعلن وابدأ في استقبال العروض" },
    { href: "/properties",               icon: Search,    iconCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",       cardCls: "hover:bg-secondary/50 border-border/50",                      label: "البحث عن عقار",        sub: "تصفح آلاف العقارات" },
    { href: "/dashboard/properties",     icon: Building2, iconCls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600", cardCls: "hover:bg-secondary/50 border-border/50",                      label: "عقاراتي المعلنة",       sub: "تابع حالة إعلاناتك" },
    { href: "/dashboard/favorites",      icon: Heart,     iconCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-600",       cardCls: "hover:bg-secondary/50 border-border/50",                      label: "المفضلة",               sub: "العقارات التي أعجبتك" },
    { href: "/dashboard/saved-searches", icon: BellRing,  iconCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",    cardCls: "hover:bg-secondary/50 border-border/50",                      label: "تنبيهات البحث",         sub: "تنبيه عند وجود عقارات جديدة" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">

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
        ════════════════════════════════════════════════════════════════════ */}
        <DashboardHero
          isProvider={isProvider}
          name={user.name}
          avatar={user.avatar}
        />

        {/* ════════════════════════════════════════════════════════════════════
            SUBSCRIPTION WIDGET — always first, shared for ALL roles.
            Edit SubscriptionWidget.tsx once → applies to user + provider.
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">الباقة الحالية</h2>
              <p className="text-sm text-muted-foreground mt-0.5">حالة اشتراكك ومميزاتك</p>
            </div>
            <Link href="/dashboard/packages">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1">
                إدارة الباقات
              </Button>
            </Link>
          </div>
          <SubscriptionWidget />
        </section>

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

        {/* ════════════════════════════════════════════════════════════════════
            PROVIDER-ONLY: Contact interaction stats
        ════════════════════════════════════════════════════════════════════ */}
        {isProvider && providerId != null && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">إحصائيات التواصل</h2>
                <p className="text-sm text-muted-foreground mt-0.5">كم زائر تواصل معك عبر إعلاناتك — مرئي لك فقط</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: Eye,
                  label: "إجمالي المشاهدات",
                  value: stats?.totalViews ?? 0,
                  sub: "مشاهدة لإعلاناتك",
                  bg: "bg-blue-50 dark:bg-blue-950/30",
                  border: "border-blue-200 dark:border-blue-800/50",
                  iconCls: "bg-blue-100 dark:bg-blue-900/40 text-blue-600",
                  valueCls: "text-blue-700 dark:text-blue-300",
                },
                {
                  icon: Building2,
                  label: "إجمالي الإعلانات",
                  value: stats?.totalProperties ?? 0,
                  sub: "عقار مُعلَن",
                  bg: "bg-teal-50 dark:bg-teal-950/30",
                  border: "border-teal-200 dark:border-teal-800/50",
                  iconCls: "bg-teal-100 dark:bg-teal-900/40 text-teal-600",
                  valueCls: "text-teal-700 dark:text-teal-300",
                },
                {
                  icon: Phone,
                  label: "ضغطات الاتصال",
                  value: stats?.totalPhoneClicks ?? 0,
                  sub: "زائر طلب رقمك",
                  bg: "bg-emerald-50 dark:bg-emerald-950/30",
                  border: "border-emerald-200 dark:border-emerald-800/50",
                  iconCls: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600",
                  valueCls: "text-emerald-700 dark:text-emerald-300",
                },
                {
                  icon: MessageCircle,
                  label: "ضغطات واتساب",
                  value: stats?.totalWhatsappClicks ?? 0,
                  sub: "زائر فتح واتساب",
                  bg: "bg-green-50 dark:bg-green-950/30",
                  border: "border-green-200 dark:border-green-800/50",
                  iconCls: "bg-green-100 dark:bg-green-900/40 text-green-600",
                  valueCls: "text-green-700 dark:text-green-300",
                },
              ].map((stat) => (
                <Card key={stat.label} className={`border ${stat.border} ${stat.bg} shadow-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.iconCls}`}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium leading-tight">{stat.label}</p>
                    </div>
                    <p className={`text-2xl font-extrabold ${stat.valueCls}`}>
                      {Number(stat.value).toLocaleString("ar-EG")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            PROVIDER-ONLY: Quick action strip
        ════════════════════════════════════════════════════════════════════ */}
        {isProvider && providerId != null && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/add-property",         icon: Plus,      label: "إضافة عقار",      cls: "bg-teal-500/10 border-teal-200/50 dark:border-teal-800/40 text-teal-700 dark:text-teal-300" },
              { href: "/dashboard/properties", icon: Building2, label: "إدارة العقارات",   cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
              { href: "/dashboard/messages",   icon: BellRing,  label: "الرسائل",           cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
              { href: "/dashboard/packages",   icon: Eye,       label: "الباقات",           cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${item.cls}`}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
