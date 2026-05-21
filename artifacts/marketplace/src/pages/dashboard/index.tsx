import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Users, ShoppingBag, Star, List,
  ArrowUpRight, Clock, Loader2, AlertCircle,
  Phone, MessageCircle, Send,
} from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats, type ProviderInteractions, mediaUrl } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: "جديد",          color: "bg-blue-500/10 text-blue-600" },
  pending:   { label: "قيد التنفيذ",   color: "bg-amber-500/10 text-amber-600" },
  completed: { label: "مكتمل",         color: "bg-green-500/10 text-green-600" },
  cancelled: { label: "ملغي",          color: "bg-red-500/10 text-red-600" },
  rejected:  { label: "مرفوض",         color: "bg-red-500/10 text-red-600" },
  accepted:  { label: "مقبول",         color: "bg-teal-500/10 text-teal-600" },
};

export default function ProviderDashboard() {
  const { user, loading: authLoading, refetch } = useAuth();
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
    enabled: !!providerId,
    retry: 2,
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["providerRequests", providerId],
    queryFn: () => api.requests.listByProvider(providerId!) as Promise<any[]>,
    enabled: !!providerId,
    select: (data) => data.slice(0, 5),
  });

  const { data: interactions, isLoading: interactionsLoading } = useQuery<ProviderInteractions>({
    queryKey: ["providerInteractions", providerId],
    queryFn: () => api.providers.getInteractions(providerId!),
    enabled: !!providerId,
  });

  if (authLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProviderLayout>
    );
  }

  if (!user) {
    return (
      <ProviderLayout>
        <div className="p-8 text-center" dir="rtl">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <p className="text-lg font-medium">يرجى تسجيل الدخول للوصول إلى لوحة التحكم.</p>
        </div>
      </ProviderLayout>
    );
  }

  if (user.role === "provider" && providerId == null) {
    return (
      <ProviderLayout>
        <div className="p-8 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
          <p className="text-lg font-medium">جاري تحميل ملف مقدم الخدمة…</p>
          <p className="text-sm text-muted-foreground">يتم مزامنة الجلسة مع الخادم. انتظر لحظات أو اضغط تحديثاً يدوياً.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            تحديث
          </Button>
        </div>
      </ProviderLayout>
    );
  }

  if (user.role !== "provider") {
    return (
      <ProviderLayout>
        <div className="p-8 text-center" dir="rtl">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <p className="text-lg font-medium">هذه اللوحة مخصصة لمقدمي الخدمة فقط.</p>
        </div>
      </ProviderLayout>
    );
  }

  const statsData = [
    {
      name: "الطلبات",
      value: statsLoading ? "—" : String(stats?.totalOrders ?? 0),
      icon: ShoppingBag,
      sub: statsLoading ? "" : `${stats?.completedOrders ?? 0} مكتملة`,
    },
    {
      name: "التقييم",
      value: statsLoading ? "—" : (stats?.avgRating ?? "0.0"),
      icon: Star,
      sub: statsLoading ? "" : `${stats?.reviewsCount ?? 0} تقييم`,
    },
    {
      name: "الخدمات",
      value: statsLoading ? "—" : String(stats?.servicesCount ?? 0),
      icon: List,
      sub: statsLoading ? "" : "خدمة نشطة",
    },
    {
      name: "طلبات معلقة",
      value: statsLoading ? "—" : String(stats?.pendingOrders ?? 0),
      icon: Clock,
      sub: statsLoading ? "" : "تنتظر ردك",
    },
  ];

  const sub = stats?.subscription ?? null;

  return (
    <ProviderLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
        {statsError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            تعذر تحميل إحصائيات الحساب: {(statsErrorObj as Error)?.message ?? "خطأ غير معروف"}
          </div>
        )}

        {/* ── Add Property CTA Banner ── */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white"
          style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 60%, #12B5D0 100%)" }}
        >
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
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`} alt={user.name} className="w-10 h-10 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">مرحباً بعودتك 👋</p>
                <h2 className="text-xl sm:text-2xl font-extrabold">{user.name}</h2>
                <p className="text-white/60 text-xs mt-0.5">لوحة تحكم المعلن العقاري</p>
              </div>
            </div>
            <Link href="/real-estate-onboarding">
              <Button
                size="lg"
                className="shrink-0 bg-white hover:bg-white/95 text-primary font-extrabold text-base rounded-2xl px-8 h-13 shadow-2xl shadow-black/20 transition-all hover:scale-105 active:scale-100 group"
              >
                <span className="text-xl ml-2 group-hover:animate-bounce inline-block">+</span>
                أضف عقارك
              </Button>
            </Link>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">نظرة عامة على نشاطك</h3>
            <p className="text-muted-foreground text-sm mt-0.5">إحصائيات حسابك اليوم</p>
          </div>
          <Link href="/dashboard/services">
            <Button variant="outline" className="shrink-0 rounded-xl text-sm">
              إدارة الخدمات
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat) => (
            <Card key={stat.name} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {statsLoading ? (
                        <span className="inline-block w-12 h-8 bg-secondary/50 rounded animate-pulse" />
                      ) : stat.value}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interaction Stats Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              إحصائيات التواصل
              <Badge variant="outline" className="text-[10px] mr-auto">إجمالي الضغطات</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Phone */}
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {interactionsLoading ? (
                    <span className="inline-block w-8 h-6 bg-secondary/50 rounded animate-pulse" />
                  ) : (interactions?.phone ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground text-center">ضغطة على الهاتف</p>
              </div>

              {/* WhatsApp */}
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {interactionsLoading ? (
                    <span className="inline-block w-8 h-6 bg-secondary/50 rounded animate-pulse" />
                  ) : (interactions?.whatsapp ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground text-center">ضغطة على واتساب</p>
              </div>

              {/* Message */}
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {interactionsLoading ? (
                    <span className="inline-block w-8 h-6 bg-secondary/50 rounded animate-pulse" />
                  ) : (interactions?.message ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground text-center">رسالة خاصة أُرسلت</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Mini-Card */}
          <Card className="lg:col-span-1 border-primary/20 shadow-md bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>حالة الاشتراك</span>
                {sub ? (
                  <Badge
                    variant="outline"
                    className={sub.isActive
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
                      <span>انتهى اشتراكك. جدد الآن للاستمرار في استقبال الطلبات.</span>
                    </div>
                  )}
                  {sub.isActive && sub.daysLeft !== null && sub.daysLeft <= 7 && (
                    <div className="bg-amber-500/10 text-amber-700 p-3 rounded-lg text-sm font-medium flex items-start gap-2">
                      <span className="text-lg leading-none mt-0.5">⚠️</span>
                      <span>اشتراكك على وشك الانتهاء. جدد الآن للاستمرار.</span>
                    </div>
                  )}
                  <Link href="/dashboard/subscription">
                    <Button className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                      إدارة الاشتراك
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    لم يتم العثور على باقة (حتى المجانية). أضف باقة بسعر 0 من لوحة الإدارة أو تواصل مع الدعم.
                  </p>
                  <Link href="/dashboard/subscription">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                      صفحة الاشتراكات
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">أحدث الطلبات</CardTitle>
              <Link href="/dashboard/orders">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">عرض الكل</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-secondary/40 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-base">لا توجد طلبات بعد</p>
                  <p className="text-sm mt-1">ستظهر طلبات العملاء هنا</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">رقم الطلب</th>
                        <th className="px-4 py-3 font-medium">العميل</th>
                        <th className="px-4 py-3 font-medium">الخدمة</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order: any) => {
                        const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
                        return (
                          <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3 font-medium">#{order.id}</td>
                            <td className="px-4 py-3">{order.userName ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.serviceTitle ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProviderLayout>
  );
}
