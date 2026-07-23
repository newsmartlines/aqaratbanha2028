import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users, Building2, List, CreditCard, Clock, Activity,
  CheckCircle2, XCircle, Eye, Clock3, ChevronLeft,
  AlertCircle, MapPin, Maximize2, ArrowLeft,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useT, useLanguage, commonDict } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl } from "@/lib/api";
import { type ExtendedProperty } from "@/components/admin/PropertyDetailDrawer";
import toast from "react-hot-toast";

const dict = {
  pageTitle: { ar: "نظرة عامة على لوحة التحكم", en: "Dashboard Overview" },
  totalProviders: { ar: "إجمالي الشركات العقارية", en: "Total Companies" },
  activeProviders: { ar: "الشركات العقارية النشطة", en: "Active Companies" },
  totalUsers: { ar: "إجمالي المستخدمين", en: "Total Users" },
  totalListings: { ar: "إجمالي الخدمات", en: "Total Listings" },
  totalRevenue: { ar: "إجمالي الإيرادات", en: "Total Revenue" },
  pendingApprovals: { ar: "بانتظار الموافقة", en: "Pending Approvals" },
  revenueOverTime: { ar: "الإيرادات عبر الوقت", en: "Revenue Over Time" },
  revenueDesc: { ar: "نمو الإيرادات الشهرية بالجنيه المصري", en: "Monthly revenue growth in EGP" },
  topCategories: { ar: "أبرز التصنيفات", en: "Top Categories" },
  topCategoriesDesc: { ar: "توزيع الخدمات النشطة", en: "Distribution of active listings" },
  newProvidersMonth: { ar: "مقدمو خدمة جدد شهرياً", en: "New Providers per Month" },
  recentActivity: { ar: "النشاط الأخير", en: "Recent Activity" },
  sar: { ar: "ج.م", en: "EGP" },
  catFood: { ar: "طعام", en: "Food" },
  catMaint: { ar: "صيانة", en: "Maintenance" },
  catEvents: { ar: "فعاليات", en: "Events" },
  catBeauty: { ar: "تجميل", en: "Beauty" },
  catHandmade: { ar: "حرف يدوية", en: "Handmade" },
  catDelivery: { ar: "توصيل", en: "Delivery" },
  act1: { ar: "سجّل أحمد كوسيط عقاري جديد", en: "Ahmed registered as a new provider" },
  act2: { ar: "تمت الموافقة على خدمة 'أعمال السباكة'", en: "New listing 'Plumbing Services' approved" },
  act3: { ar: "تمت معالجة دفعة بقيمة 500 ج.م", en: "Payment of 500 EGP processed" },
  act4: { ar: "حدّثت فاطمة اشتراكها إلى المميز", en: "Fatima updated subscription to Premium" },
  act5: { ar: "تم الإبلاغ عن تقييم على الخدمة #42", en: "Review reported on listing #42" },
  hoursAgo: { ar: "منذ ساعتين", en: "2 hours ago" },
  hoursAgo4: { ar: "منذ 4 ساعات", en: "4 hours ago" },
  hoursAgo5: { ar: "منذ 5 ساعات", en: "5 hours ago" },
  yesterday: { ar: "أمس", en: "Yesterday" },
};

const COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#e11d48', '#f59e0b', '#10b981'];

interface AdminStats {
  totalProviders: number;
  activeProviders: number;
  pendingProviders: number;
  totalUsers: number;
  totalServices: number;
  totalRequests: number;
  totalRevenue: number;
}

function getFirstImage(images: string | null | undefined): string | null {
  if (!images) return null;
  try { const p = JSON.parse(images); return Array.isArray(p) ? p[0] ?? null : null; }
  catch { return null; }
}

function fmtPrice(price: string | null | undefined): string | null {
  if (!price) return null;
  const n = parseFloat(price);
  if (isNaN(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("en-US")} ج.م`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `منذ ${days} يوم${days > 1 ? "" : ""}`;
  if (hrs > 0)  return `منذ ${hrs} ساعة`;
  if (mins > 0) return `منذ ${mins} دقيقة`;
  return "الآن";
}

export default function AdminDashboard() {
  const t = useT(dict);
  const { formatNumber } = useLanguage();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      return body.data ?? {};
    },
    staleTime: 60_000,
  });

  const { data: pendingProperties = [], isLoading: pendingLoading } = useQuery<ExtendedProperty[]>({
    queryKey: ["admin-pending-properties"],
    queryFn: async () => {
      const data = await api.properties.list({ status: "pending" });
      return Array.isArray(data) ? data as unknown as ExtendedProperty[] : [];
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.properties.patchStatus(id, "approved"),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ExtendedProperty[]>(["admin-pending-properties"], prev =>
        (prev ?? []).filter(p => p.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("✅ تمت الموافقة على الإعلان وإشعار المعلن");
    },
    onError: () => toast.error("فشل اعتماد الإعلان"),
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const monthLabels = useT({
    Jan: { ar: "ينا", en: "Jan" }, Feb: { ar: "فبر", en: "Feb" }, Mar: { ar: "مار", en: "Mar" },
    Apr: { ar: "أبر", en: "Apr" }, May: { ar: "ماي", en: "May" }, Jun: { ar: "يون", en: "Jun" },
  });
  const revenueData  = [4000, 5500, 4800, 7200, 6500, 8900].map((revenue, i) => ({ name: monthLabels(months[i] as any), revenue }));
  const providerData = [12, 18, 15, 24, 22, 30].map((providers, i) => ({ name: monthLabels(months[i] as any), providers }));
  const categoryData = [
    { name: t("catFood"), value: 35 }, { name: t("catMaint"), value: 22 },
    { name: t("catEvents"), value: 18 }, { name: t("catBeauty"), value: 15 },
    { name: t("catHandmade"), value: 7 }, { name: t("catDelivery"), value: 3 },
  ];
  const activities = [
    { title: t("act1"), time: t("hoursAgo"), type: "user" },
    { title: t("act2"), time: t("hoursAgo4"), type: "listing" },
    { title: t("act3"), time: t("hoursAgo5"), type: "payment" },
    { title: t("act4"), time: t("yesterday"), type: "sub" },
    { title: t("act5"), time: t("yesterday"), type: "alert" },
  ];

  return (
    <AdminLayout title={t("pageTitle")}>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { icon: Building2, label: t("totalProviders"),   value: formatNumber(stats?.totalProviders ?? 0),  color: "blue" },
          { icon: Activity,  label: t("activeProviders"),  value: formatNumber(stats?.activeProviders ?? 0), color: "teal" },
          { icon: Users,     label: t("totalUsers"),        value: formatNumber(stats?.totalUsers ?? 0),      color: "indigo" },
          { icon: List,      label: t("totalListings"),     value: formatNumber(stats?.totalServices ?? 0),   color: "purple" },
          { icon: CreditCard,label: t("totalRevenue"),      value: formatNumber(Math.round(stats?.totalRevenue ?? 0)), suffix: t("sar"), color: "emerald" },
          { icon: Clock,     label: t("pendingApprovals"),  value: formatNumber(stats?.pendingProviders ?? 0) + (pendingProperties.length > 0 ? ` + ${pendingProperties.length}` : ""), color: "amber" },
        ].map(({ icon: Icon, label, value, suffix, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {value}
                {suffix && <span className="text-sm font-normal text-slate-500 ms-1">{suffix}</span>}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pending Properties Section ── */}
      {(pendingLoading || pendingProperties.length > 0) && (
        <div className="mb-8" dir="rtl">
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                {pendingProperties.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                    {pendingProperties.length}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">إعلانات تحتاج موافقة</h2>
                <p className="text-xs text-slate-500">
                  {pendingLoading ? "جارٍ التحميل..." : `${pendingProperties.length} إعلان ينتظر المراجعة`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/properties")}
              className="flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 hover:border-teal-400 bg-teal-50 hover:bg-teal-100 rounded-xl px-4 py-2 transition-colors"
            >
              إدارة الكل
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Cards grid */}
          {pendingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="aspect-[16/9] bg-slate-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pendingProperties.map((prop) => {
                const imgSrc = getFirstImage(prop.images);
                const price  = fmtPrice(prop.price);
                const location = [prop.district, prop.city].filter(Boolean).join("، ");
                return (
                  <div
                    key={prop.id}
                    onClick={() => navigate(`/property/${prop.id}?admin=1`)}
                    className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group overflow-hidden flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden shrink-0">
                      {imgSrc ? (
                        <img
                          src={mediaUrl(imgSrc)}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { e.currentTarget.style.opacity = "0"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Building2 className="w-10 h-10" />
                        </div>
                      )}
                      {/* Type badge */}
                      {prop.listingType && (
                        <span className="absolute top-2 right-2 text-[11px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                          {prop.listingType === "sale" ? "للبيع" : prop.listingType === "rent" ? "للإيجار" : prop.listingType}
                        </span>
                      )}
                      {/* Pending badge */}
                      <span className="absolute bottom-2 right-2 text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        قيد المراجعة
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{prop.title}</h3>
                      {location && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3 text-teal-500" />
                          <span className="truncate">{location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {price && <span className="text-xs font-bold text-teal-700">{price}</span>}
                        {prop.area && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-500">
                            <Maximize2 className="w-3 h-3" />{prop.area} م²
                          </span>
                        )}
                      </div>
                      {prop.createdAt && (
                        <p className="text-[11px] text-slate-400">{timeAgo(prop.createdAt)}</p>
                      )}
                    </div>

                    {/* Action bar */}
                    <div className="flex gap-1.5 px-3.5 pb-3.5">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/property/${prop.id}?admin=1`); }}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 rounded-xl py-2 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); approveMutation.mutate(prop.id); }}
                        disabled={approveMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl py-2 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/property/${prop.id}?admin=1`); }}
                        className="flex items-center justify-center text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl py-2 px-2.5 transition-colors"
                        title="رفض"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("revenueOverTime")}</CardTitle>
            <CardDescription>{t("revenueDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>{t("topCategories")}</CardTitle>
            <CardDescription>{t("topCategoriesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader><CardTitle>{t("newProvidersMonth")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="providers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader><CardTitle>{t("recentActivity")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                    activity.type === 'user'    ? 'bg-blue-500' :
                    activity.type === 'listing' ? 'bg-teal-500' :
                    activity.type === 'payment' ? 'bg-emerald-500' :
                    activity.type === 'sub'     ? 'bg-purple-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </AdminLayout>
  );
}

void commonDict;
