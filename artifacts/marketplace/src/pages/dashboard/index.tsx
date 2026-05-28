import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Heart, BellRing, Bell, Search, Building2,
  Loader2, AlertCircle, Plus, Eye, Phone, MessageCircle,
  TrendingUp, Star, Clock, Home,
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  trend?: { value: number; positive?: boolean };
}) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border/60 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-foreground mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && (
          <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${trend.positive !== false ? "text-emerald-600" : "text-red-500"}`}>
            <TrendingUp className="w-3 h-3" />
            {trend.value > 0 ? `+${trend.value}` : trend.value}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Status labels for chart ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  approved: "#10b981",
  active:   "#10b981",
  pending:  "#f59e0b",
  rejected: "#ef4444",
  sold:     "#3b82f6",
  rented:   "#8b5cf6",
  draft:    "#94a3b8",
};
const STATUS_LABELS_AR: Record<string, string> = {
  approved: "موافق",
  active:   "نشط",
  pending:  "قيد المراجعة",
  rejected: "مرفوض",
  sold:     "مُباع",
  rented:   "مُؤجَّر",
  draft:    "مسودة",
};

// ── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-xl px-3 py-2 shadow-xl text-xs" dir="rtl">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

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

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: myPropertiesRaw = [] } = useQuery({
    queryKey: ["user-properties"],
    queryFn: () => api.userProperties.list(),
    enabled: isUser && !!user,
    staleTime: 30_000,
  });
  const myProperties: any[] = useMemo(() =>
    Array.isArray(myPropertiesRaw) ? myPropertiesRaw : ((myPropertiesRaw as any)?.data ?? []),
  [myPropertiesRaw]);

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

  // ── Derived stats ──────────────────────────────────────────────────────────

  const userStats = useMemo(() => {
    const props = myProperties as any[];
    const byStatus: Record<string, number> = {};
    props.forEach((p) => {
      const s = p.status ?? "pending";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    });
    const totalViews = props.reduce((a, p) => a + (p.viewCount ?? 0), 0);
    return { total: props.length, byStatus, totalViews };
  }, [myProperties]);

  const statusChartData = useMemo(() =>
    Object.entries(userStats.byStatus).map(([status, count]) => ({
      name: STATUS_LABELS_AR[status] ?? status,
      value: count,
      fill: STATUS_COLORS[status] ?? "#94a3b8",
    })),
  [userStats.byStatus]);

  // Monthly summary (last 4 months from properties createdAt)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { name: string; month: number; year: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleDateString("ar-EG", { month: "short" }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return months.map((m) => ({
      name: m.name,
      عقارات: (myProperties as any[]).filter((p) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).length,
    }));
  }, [myProperties]);

  // Provider contact chart
  const providerContactData = useMemo(() => [
    { name: "مشاهدات", value: providerStats?.totalViews ?? 0,         fill: "#3b82f6" },
    { name: "اتصالات", value: providerStats?.totalPhoneClicks ?? 0,   fill: "#10b981" },
    { name: "واتساب",  value: providerStats?.totalWhatsappClicks ?? 0, fill: "#22c55e" },
  ], [providerStats]);

  // ── Guards ─────────────────────────────────────────────────────────────────
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

  const quickLinks = [
    { href: "/add-property",             icon: Plus,      iconCls: "bg-teal-600 text-white",                              cardCls: "bg-teal-500/10 border-teal-200/50",  label: "أضف عقاراً",        sub: "أعلن وابدأ في استقبال العروض" },
    { href: "/properties",               icon: Search,    iconCls: "bg-blue-100 text-blue-600",                           cardCls: "hover:bg-secondary/50 border-border/50", label: "البحث عن عقار",    sub: "تصفح آلاف العقارات" },
    { href: "/dashboard/properties",     icon: Building2, iconCls: "bg-indigo-100 text-indigo-600",                       cardCls: "hover:bg-secondary/50 border-border/50", label: "عقاراتي",           sub: "تابع حالة إعلاناتك" },
    { href: "/dashboard/favorites",      icon: Heart,     iconCls: "bg-rose-100 text-rose-600",                           cardCls: "hover:bg-secondary/50 border-border/50", label: "المفضلة",           sub: "العقارات التي أعجبتك" },
    { href: "/dashboard/saved-searches", icon: BellRing,  iconCls: "bg-amber-100 text-amber-600",                         cardCls: "hover:bg-secondary/50 border-border/50", label: "تنبيهات البحث",     sub: "تنبيه عند عقارات جديدة" },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500" dir="rtl">

        {/* Provider ID hydration */}
        {isProvider && providerId == null && (
          <div className="p-8 max-w-md mx-auto text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">جاري تحميل الملف التجاري…</p>
            <Button type="button" variant="outline" onClick={() => void refetch()}>تحديث</Button>
          </div>
        )}

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <DashboardHero isProvider={isProvider} name={user.name} avatar={user.avatar} />

        {/* ═══════════════════════════════════════════════════════
            SUBSCRIPTION WIDGET
        ═══════════════════════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════════════════════
            USER KPI CARDS + CHARTS
        ═══════════════════════════════════════════════════════ */}
        {isUser && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={Building2}  label="إجمالي عقاراتي"  value={userStats.total}                           color="bg-primary/10 text-primary"        sub="عقار مُعلَن" />
              <KpiCard icon={Eye}        label="إجمالي المشاهدات" value={userStats.totalViews.toLocaleString("ar-EG")} color="bg-sky-50 text-sky-600"            sub="مشاهدة لإعلاناتك" />
              <KpiCard icon={Heart}      label="المفضلة"          value={Array.isArray(favorites) ? favorites.length : 0}  color="bg-rose-50 text-rose-500"          sub="عقار محفوظ" />
              <KpiCard icon={BellRing}   label="تنبيهات البحث"   value={Array.isArray(savedSearches) ? savedSearches.length : 0} color="bg-amber-50 text-amber-500" sub="تنبيه نشط" />
            </div>

            {/* Charts row */}
            {(myProperties as any[]).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Bar chart — Monthly listings */}
                <div className="lg:col-span-3 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5">
                  <div className="mb-5">
                    <h3 className="font-bold text-base text-foreground">نشاط الإعلانات</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">عدد العقارات المضافة في آخر 4 أشهر</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-props" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="عقارات"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#grad-props)"
                        dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut chart — Status distribution */}
                <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5">
                  <div className="mb-4">
                    <h3 className="font-bold text-base text-foreground">حالة العقارات</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">توزيع العقارات حسب الحالة</p>
                  </div>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="45%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد بيانات كافية
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick links + recent notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border-border/50 shadow-sm h-full bg-white dark:bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">روابط سريعة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    {quickLinks.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors border cursor-pointer ${item.cardCls}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconCls}`}>
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

              <Card className="lg:col-span-2 border-border/50 shadow-sm bg-white dark:bg-card">
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
                    <div className="space-y-3">
                      {recentNotifications.map((n, index) => (
                        <div key={n.id} className="relative flex gap-3">
                          {index !== recentNotifications.length - 1 && (
                            <div className="absolute top-10 right-5 w-px h-full bg-border -z-10" />
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            PROVIDER KPI + CHARTS
        ═══════════════════════════════════════════════════════ */}
        {isProvider && providerId != null && (
          <>
            {/* Provider KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={Eye}        label="المشاهدات"     value={(providerStats?.totalViews ?? 0).toLocaleString("ar-EG")}          color="bg-sky-50 text-sky-600"      sub="إجمالي مشاهدات الإعلانات" />
              <KpiCard icon={Building2}  label="الإعلانات"     value={providerStats?.totalProperties ?? 0}                               color="bg-teal-50 text-teal-600"    sub="عقار منشور" />
              <KpiCard icon={Phone}      label="اتصالات"       value={providerStats?.totalPhoneClicks ?? 0}                              color="bg-emerald-50 text-emerald-600" sub="زائر طلب رقمك" />
              <KpiCard icon={MessageCircle} label="واتساب"     value={providerStats?.totalWhatsappClicks ?? 0}                           color="bg-green-50 text-green-600"  sub="زائر فتح واتساب" />
            </div>

            {/* Provider charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Contact breakdown bar chart */}
              <div className="lg:col-span-3 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5">
                <div className="mb-5">
                  <h3 className="font-bold text-base text-foreground">إحصائيات التواصل</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">عدد مرات تواصل الزوار مع إعلاناتك</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={providerContactData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="العدد" radius={[6, 6, 0, 0]}>
                      {providerContactData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats card */}
              <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-4">
                <div>
                  <h3 className="font-bold text-base text-foreground">ملخص الأداء</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">نسبة التفاعل مع إعلاناتك</p>
                </div>
                {[
                  {
                    label: "معدل الاتصال",
                    value: providerStats?.totalViews
                      ? Math.round(((providerStats?.totalPhoneClicks ?? 0) / providerStats.totalViews) * 100)
                      : 0,
                    color: "bg-emerald-500",
                    icon: Phone,
                  },
                  {
                    label: "معدل الواتساب",
                    value: providerStats?.totalViews
                      ? Math.round(((providerStats?.totalWhatsappClicks ?? 0) / providerStats.totalViews) * 100)
                      : 0,
                    color: "bg-green-500",
                    icon: MessageCircle,
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </span>
                      <span className="font-bold text-foreground">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${item.color}`} style={{ width: `${Math.min(100, item.value)}%` }} />
                    </div>
                  </div>
                ))}

                <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> معدل جيد: {'>'} 5%</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> يتحدث تلقائياً</span>
                </div>
              </div>
            </div>

            {/* Provider quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/add-property",         icon: Plus,      label: "إضافة عقار",     cls: "bg-teal-500/10 border-teal-200/50 text-teal-700" },
                { href: "/dashboard/properties", icon: Building2, label: "إدارة العقارات",  cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
                { href: "/dashboard/messages",   icon: BellRing,  label: "الرسائل",          cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
                { href: "/dashboard/packages",   icon: Home,      label: "الباقات",          cls: "border-border/50 hover:bg-secondary/50 text-foreground" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${item.cls}`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
