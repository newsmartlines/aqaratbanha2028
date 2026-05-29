import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Bell, Building2, Loader2, AlertCircle, Plus, Eye, Phone,
  MessageCircle, Star, Clock, Home, Package,
  BellRing, AlertTriangle, Heart,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { SubscriptionWidget } from "@/components/dashboard/SubscriptionWidget";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type Notification, mediaUrl } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

/* ── Custom chart tooltip ─────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border/60 rounded-xl px-3 py-2 shadow-xl text-xs" dir="rtl">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill ?? p.color }} className="font-medium">
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Hero welcome card ────────────────────────────────────────────────────── */
function HeroCard({ name, avatar, isProvider }: { name: string; avatar?: string | null; isProvider: boolean }) {
  const avatarSrc = avatar
    ? mediaUrl(avatar)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d3a6e 55%, #0e8fa8 100%)" }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-12 -left-12 w-52 h-52 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 right-16 w-36 h-36 bg-white/5 rounded-full" />
        <div className="absolute top-4 left-8 w-28 h-28 rounded-full border-4 border-white/10" />
      </div>

      <div className="relative z-10 p-6 sm:p-7 flex items-center justify-between gap-4">
        {/* Right (start in RTL): Avatar + greeting text */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
            <img src={avatarSrc} alt={name} className="w-full h-full object-cover bg-white/10" />
          </div>
          <div>
            <p className="text-sm text-white/70 font-medium">مرحباً بعودتك 🤝</p>
            <p className="text-2xl font-extrabold text-white leading-tight mt-0.5">{name}</p>
            <p className="text-sm text-white/60 mt-0.5">
              {isProvider ? "لوحة تحكم المعلن العقاري" : "لوحة تحكم المستخدم"}
            </p>
          </div>
        </div>

        {/* Left (end in RTL): CTA button */}
        <Link href={isProvider ? "/add-property" : "/properties"}>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-white/40 text-white hover:bg-white/15 bg-white/10 gap-2 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
            {isProvider ? "أضف عقارك" : "تصفح العقارات"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, iconBg, iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold text-foreground leading-none">
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </p>
          <p className="text-sm font-semibold text-foreground mt-1.5">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/* ── Fixed bottom bar ─────────────────────────────────────────────────────── */
function BottomBar({ isProvider }: { isProvider: boolean }) {
  return (
    <div className="fixed bottom-0 right-0 left-0 z-30 bg-white dark:bg-card border-t border-border/60 px-3 py-2.5 flex items-center gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
      <Link href="/add-property" className="flex-1">
        <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          إضافة عقار
        </Button>
      </Link>
      <Link href="/dashboard/properties" className="flex-1">
        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          إدارة العقارات
        </Button>
      </Link>
      <Link href="/dashboard/messages" className="flex-1">
        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
          <Bell className="w-3.5 h-3.5" />
          الرسائل
        </Button>
      </Link>
      <Link href="/dashboard/packages" className="flex-1">
        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
          <Package className="w-3.5 h-3.5" />
          الباقات
        </Button>
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardOverview() {
  const { isProvider, isUser, providerId } = useRole();
  const { user, loading: authLoading, refetch } = useAuth();
  const [hydrateAttempts, setHydrateAttempts] = useState(0);

  useEffect(() => {
    if (!authLoading && isProvider && user?.providerId == null) void refetch();
  }, [authLoading, isProvider, user?.providerId, refetch]);

  useEffect(() => {
    if (authLoading || !isProvider || user?.providerId != null) return;
    if (hydrateAttempts >= 12) return;
    const t = window.setTimeout(() => {
      void refetch().finally(() => setHydrateAttempts((a) => a + 1));
    }, 200);
    return () => window.clearTimeout(t);
  }, [authLoading, isProvider, user?.providerId, hydrateAttempts, refetch]);

  /* ── Data queries ─────────────────────────────────────────────────────────── */
  const { data: myPropertiesRaw = [] } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const myProperties: any[] = useMemo(
    () => (Array.isArray(myPropertiesRaw) ? myPropertiesRaw : ((myPropertiesRaw as any)?.data ?? [])),
    [myPropertiesRaw],
  );

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

  const { data: providerStats } = useQuery({
    queryKey: ["provider-stats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
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

  /* ── Derived values ───────────────────────────────────────────────────────── */
  const userStats = useMemo(() => {
    const props = myProperties as any[];
    const totalViews = props.reduce((a, p) => a + (p.viewCount ?? 0), 0);
    const active = props.filter((p) => ["approved", "active"].includes(p.status ?? "")).length;
    return { total: props.length, active, totalViews };
  }, [myProperties]);

  const providerContactData = useMemo(() => [
    { name: "مشاهدات", value: providerStats?.totalViews ?? 0,           fill: "#3b82f6" },
    { name: "اتصالات", value: providerStats?.totalPhoneClicks ?? 0,     fill: "#10b981" },
    { name: "واتساب",  value: providerStats?.totalWhatsappClicks ?? 0,  fill: "#22c55e" },
  ], [providerStats]);

  const callRate = useMemo(() =>
    providerStats?.totalViews
      ? Math.round(((providerStats.totalPhoneClicks ?? 0) / providerStats.totalViews) * 100)
      : 0,
  [providerStats]);

  const waRate = useMemo(() =>
    providerStats?.totalViews
      ? Math.round(((providerStats.totalWhatsappClicks ?? 0) / providerStats.totalViews) * 100)
      : 0,
  [providerStats]);

  const providerApproved = (user as any)?.providerApproved;

  /* ── Guards ───────────────────────────────────────────────────────────────── */
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
  if (isProvider && providerId == null) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
          <p className="text-lg font-medium">جاري تحميل ملف الشركة العقارية…</p>
          <Button variant="outline" onClick={() => void refetch()}>تحديث</Button>
        </div>
      </DashboardLayout>
    );
  }

  const displayName = user.name ?? (isProvider ? "الشركة العقارية" : "المستخدم");

  /* ══════════════════════════════════════════════════════════════════════════
     PROVIDER DASHBOARD
  ══════════════════════════════════════════════════════════════════════════ */
  if (isProvider) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-24 animate-in fade-in duration-500" dir="rtl">

          {/* Pending approval banner */}
          {providerApproved === false && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <p className="text-sm font-medium leading-snug">
                حسابك قيد المراجعة — سيتم تفعيله بعد موافقة فريق الإدارة.
                قد يستغرق ذلك حتى 24 ساعة.
              </p>
            </div>
          )}

          {/* Hero */}
          <HeroCard name={displayName} avatar={user.avatar} isProvider />

          {/* Current package */}
          <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">الباقة الحالية</h2>
                <p className="text-xs text-muted-foreground mt-0.5">حالة اشتراكك ومميزاتك</p>
              </div>
              <Link href="/dashboard/packages">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  إدارة الباقات
                </Button>
              </Link>
            </div>
            <div className="px-5 pb-5">
              <SubscriptionWidget />
            </div>
          </div>

          {/* 4 KPI stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Eye}
              label="المشاهدات"
              value={providerStats?.totalViews ?? 0}
              sub="إجمالي مشاهدات الإعلانات"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={Building2}
              label="الإعلانات"
              value={providerStats?.totalProperties ?? userStats.active}
              sub="عقار منشور"
              iconBg="bg-teal-100"
              iconColor="text-teal-600"
            />
            <StatCard
              icon={Phone}
              label="الاتصالات"
              value={providerStats?.totalPhoneClicks ?? 0}
              sub="زائر طلب رقمك"
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <StatCard
              icon={MessageCircle}
              label="واتساب"
              value={providerStats?.totalWhatsappClicks ?? 0}
              sub="زائر فتح واتساب"
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Contact stats bar chart */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-foreground">إحصائيات التواصل</h3>
                <p className="text-xs text-muted-foreground mt-0.5">عدد مرات تواصل الزوار مع إعلاناتك</p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={providerContactData} margin={{ top: 4, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="العدد" radius={[6, 6, 0, 0]}>
                    {providerContactData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance summary */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col">
              <div className="mb-5">
                <h3 className="font-bold text-sm text-foreground">ملخص الأداء</h3>
                <p className="text-xs text-muted-foreground mt-0.5">نسبة التفاعل مع إعلاناتك</p>
              </div>

              <div className="flex-1 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Phone className="w-3.5 h-3.5" />
                      معدل الاتصال
                    </span>
                    <span className="font-bold text-foreground">{callRate}%</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-amber-400"
                      style={{ width: `${Math.min(100, callRate)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <MessageCircle className="w-3.5 h-3.5" />
                      معدل الواتساب
                    </span>
                    <span className="font-bold text-foreground">{waRate}%</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-green-500"
                      style={{ width: `${Math.min(100, waRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  يتحدث تلقائياً
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  معدل جيد {">"} 5%
                </span>
              </div>
            </div>
          </div>

          <BottomBar isProvider />
        </div>
      </DashboardLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     REGULAR USER DASHBOARD
  ══════════════════════════════════════════════════════════════════════════ */
  const favCount   = Array.isArray(favorites)     ? favorites.length     : 0;
  const alertCount = Array.isArray(savedSearches) ? savedSearches.length : 0;

  const userActivityData = [
    { name: "عقاراتي",   value: userStats.total,   fill: "#3b82f6" },
    { name: "المفضلة",   value: favCount,           fill: "#f43f5e" },
    { name: "التنبيهات", value: alertCount,         fill: "#f59e0b" },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 pb-24 animate-in fade-in duration-500" dir="rtl">

        {/* Hero */}
        <HeroCard name={displayName} avatar={user.avatar} isProvider={false} />

        {/* 4 KPI stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Building2}
            label="عقاراتي"
            value={userStats.total}
            sub="إعلان مُضاف"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            icon={Eye}
            label="المشاهدات"
            value={userStats.totalViews}
            sub="إجمالي المشاهدات"
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
          />
          <StatCard
            icon={Heart}
            label="المفضلة"
            value={favCount}
            sub="عقار محفوظ"
            iconBg="bg-rose-100"
            iconColor="text-rose-500"
          />
          <StatCard
            icon={BellRing}
            label="تنبيهات البحث"
            value={alertCount}
            sub="تنبيه نشط"
            iconBg="bg-amber-100"
            iconColor="text-amber-500"
          />
        </div>

        {/* Package section */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">الباقة الحالية</h2>
              <p className="text-xs text-muted-foreground mt-0.5">حالة اشتراكك ومميزاتك</p>
            </div>
            <Link href="/dashboard/packages">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                إدارة الباقات
              </Button>
            </Link>
          </div>
          <div className="px-5 pb-5">
            <SubscriptionWidget />
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Activity chart */}
          <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-foreground">إحصائيات النشاط</h3>
              <p className="text-xs text-muted-foreground mt-0.5">ملخص نشاطك على المنصة</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={userActivityData} margin={{ top: 4, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="العدد" radius={[6, 6, 0, 0]}>
                  {userActivityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent notifications */}
          <div className="bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">الإشعارات الأخيرة</h3>
                <p className="text-xs text-muted-foreground mt-0.5">آخر التحديثات والتنبيهات</p>
              </div>
              <Link href="/dashboard/notifications">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">عرض الكل</Button>
              </Link>
            </div>
            {recentNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">لا توجد إشعارات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${!n.read ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.message}</p>
                      {n.createdAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(n.createdAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/add-property",             icon: Plus,      label: "أضف إعلاناً",    cls: "bg-teal-500/10 border-teal-200/60 text-teal-700" },
            { href: "/dashboard/properties",     icon: Building2, label: "عقاراتي",         cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
            { href: "/dashboard/favorites",      icon: Heart,     label: "المفضلة",         cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
            { href: "/dashboard/saved-searches", icon: BellRing,  label: "تنبيهات البحث",  cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${item.cls}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <BottomBar isProvider={false} />
      </div>
    </DashboardLayout>
  );
}
