import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Building2, List, CreditCard, Clock, Activity } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useT, useLanguage, commonDict } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

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
  act1: { ar: "سجّل أحمد كمقدم خدمة جديد", en: "Ahmed registered as a new provider" },
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

export default function AdminDashboard() {
  const t = useT(dict);
  const { formatNumber } = useLanguage();

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      return body.data ?? {};
    },
    staleTime: 60_000,
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const monthLabels = useT({
    Jan: { ar: "ينا", en: "Jan" }, Feb: { ar: "فبر", en: "Feb" }, Mar: { ar: "مار", en: "Mar" },
    Apr: { ar: "أبر", en: "Apr" }, May: { ar: "ماي", en: "May" }, Jun: { ar: "يون", en: "Jun" },
  });
  const revenueData = [4000, 5500, 4800, 7200, 6500, 8900].map((revenue, i) => ({ name: monthLabels(months[i] as any), revenue }));
  const providerData = [12, 18, 15, 24, 22, 30].map((providers, i) => ({ name: monthLabels(months[i] as any), providers }));
  const categoryData = [
    { name: t("catFood"), value: 35 },
    { name: t("catMaint"), value: 22 },
    { name: t("catEvents"), value: 18 },
    { name: t("catBeauty"), value: 15 },
    { name: t("catHandmade"), value: 7 },
    { name: t("catDelivery"), value: 3 },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { icon: Building2, label: t("totalProviders"), value: formatNumber(stats?.totalProviders ?? 0), color: "blue" },
          { icon: Activity, label: t("activeProviders"), value: formatNumber(stats?.activeProviders ?? 0), color: "teal" },
          { icon: Users, label: t("totalUsers"), value: formatNumber(stats?.totalUsers ?? 0), color: "indigo" },
          { icon: List, label: t("totalListings"), value: formatNumber(stats?.totalServices ?? 0), color: "purple" },
          { icon: CreditCard, label: t("totalRevenue"), value: formatNumber(Math.round(stats?.totalRevenue ?? 0)), suffix: t("sar"), color: "emerald" },
          { icon: Clock, label: t("pendingApprovals"), value: formatNumber(stats?.pendingProviders ?? 0), color: "amber" },
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
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
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
          <CardHeader>
            <CardTitle>{t("newProvidersMonth")}</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                    activity.type === 'user' ? 'bg-blue-500' :
                    activity.type === 'listing' ? 'bg-teal-500' :
                    activity.type === 'payment' ? 'bg-emerald-500' :
                    activity.type === 'sub' ? 'bg-purple-500' : 'bg-amber-500'
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
