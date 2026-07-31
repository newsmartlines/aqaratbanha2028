import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Search, Eye, Users, Building2, Hash, MapPin,
  Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LISTING_TYPE_MAP: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const CATEGORY_MAP: Record<string, string> = { residential: "سكني", commercial: "تجاري", land: "أراضي" };
const CHART_COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

interface Analytics {
  totalSearches: number;
  totalViews: number;
  uniqueSessions: number;
  topKeywords: { keyword: string; count: number }[];
  topCities: { city: string; count: number }[];
  typeBreakdown: { listingType: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  topProperties: {
    id: number; title: string; viewCount: number;
    listingType: string; mainCategory: string; district: string; price: string;
  }[];
}

export default function AdminAnalytics() {
  const { data, isFetching, refetch } = useQuery<Analytics>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });

  const StatCard = ({
    icon: Icon, label, value, color,
  }: { icon: any; label: string; value: number | string; color: string }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</p>
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              تحليلات الذكاء الاصطناعي
            </h1>
            <p className="text-slate-500 text-sm mt-1">سلوك المستخدمين والبحث والتوصيات</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2 rounded-xl">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {isFetching && !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-400">لا توجد بيانات بعد — ابدأ باستخدام الموقع لتوليد بيانات التحليل</div>
        ) : (
          <>
            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatCard icon={Search} label="إجمالي عمليات البحث" value={data.totalSearches} color="bg-primary" />
              <StatCard icon={Eye} label="إجمالي مشاهدات العقارات" value={data.totalViews} color="bg-indigo-500" />
              <StatCard icon={Users} label="جلسات فريدة" value={data.uniqueSessions} color="bg-amber-500" />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Listing Type Pie */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> توزيع نوع الإعلان
                </h3>
                {data.typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.typeBreakdown.map(d => ({
                          name: LISTING_TYPE_MAP[d.listingType ?? ""] ?? d.listingType ?? "غير محدد",
                          value: d.count,
                        }))}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.typeBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} بحث`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-400 py-16 text-sm">لا توجد بيانات بعد</p>
                )}
              </div>

              {/* Category Pie */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" /> توزيع نوع العقار
                </h3>
                {data.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown.map(d => ({
                          name: CATEGORY_MAP[d.category ?? ""] ?? d.category ?? "غير محدد",
                          value: d.count,
                        }))}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} بحث`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-400 py-16 text-sm">لا توجد بيانات بعد</p>
                )}
              </div>
            </div>

            {/* ── Top Keywords Bar Chart ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> أكثر الكلمات المستخدمة في البحث
              </h3>
              {data.topKeywords.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topKeywords.slice(0, 10).map(k => ({ name: k.keyword, عمليات: k.count }))}
                    layout="vertical" margin={{ right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fontFamily: "Tajawal" }} />
                    <Tooltip />
                    <Bar dataKey="عمليات" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-400 py-10 text-sm">لا توجد بيانات بعد — ابدأ البحث في الموقع لتوليد البيانات</p>
              )}
            </div>

            {/* ── Top Cities ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> أكثر المدن بحثاً
              </h3>
              {data.topCities.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {data.topCities.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                      <span className="font-bold text-slate-700 text-sm">{c.city}</span>
                      <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                        {c.count.toLocaleString("ar-EG")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات بعد</p>
              )}
            </div>

            {/* ── Top Viewed Properties Table ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> العقارات الأكثر مشاهدة
                </h3>
              </div>
              {data.topProperties.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs">
                      <tr>
                        <th className="text-right px-5 py-3 font-semibold">#</th>
                        <th className="text-right px-5 py-3 font-semibold">العقار</th>
                        <th className="text-right px-5 py-3 font-semibold">النوع</th>
                        <th className="text-right px-5 py-3 font-semibold">الفئة</th>
                        <th className="text-right px-5 py-3 font-semibold">المنطقة</th>
                        <th className="text-right px-5 py-3 font-semibold">المشاهدات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.topProperties.map((p, i) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                          <td className="px-5 py-3">
                            <a href={`/property/${p.id}`} target="_blank" rel="noreferrer"
                              className="text-slate-800 font-medium hover:text-primary transition-colors line-clamp-1">
                              {p.title}
                            </a>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${p.listingType === "sale" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                              {LISTING_TYPE_MAP[p.listingType] ?? p.listingType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{CATEGORY_MAP[p.mainCategory] ?? p.mainCategory}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{p.district ?? "—"}</td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              {(p.viewCount ?? 0).toLocaleString("ar-EG")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-400 py-10 text-sm">لا توجد مشاهدات مسجلة بعد</p>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
