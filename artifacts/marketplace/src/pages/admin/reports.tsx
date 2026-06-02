import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { Building2, Users, DollarSign, Package, TrendingUp, Crown, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xl text-xs" dir="rtl">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toLocaleString("ar-EG") : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const TIER_COLORS = ["#64748b", "#cd7f32", "#0d9488"];
const TIER_LABELS: Record<string, string> = { free: "مجاني", bronze: "برونزي", premium: "مميز" };

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminReports() {
  const { data: statsRaw, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.fetchJson<any>("/admin/stats"),
    staleTime: 60_000,
  });

  const { data: subsRaw, isLoading: subsLoading } = useQuery({
    queryKey: ["admin-subscriptions-report"],
    queryFn: () => api.admin.subscriptions.list(),
    staleTime: 60_000,
  });

  const stats = statsRaw?.data ?? statsRaw ?? {};
  const subsData: any = subsRaw ?? {};
  const subRows: any[] = subsData?.rows ?? [];
  const subTotals = subsData?.totals ?? {};

  // ── Derived charts ────────────────────────────────────────────────────────

  // Subscription tier breakdown
  const tierData = useMemo(() => [
    { name: "مجاني",   value: subTotals.freeActive   ?? 0, fill: "#64748b" },
    { name: "برونزي",  value: subTotals.bronzeActive  ?? 0, fill: "#cd7f32" },
    { name: "مميز",    value: subTotals.premiumActive ?? 0, fill: "#0d9488" },
  ].filter(d => d.value > 0), [subTotals]);

  // Monthly subscriptions (last 4 months)
  const monthlyChartData = useMemo(() => {
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
      اشتراكات: subRows.filter((r) => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).length,
      إيرادات: subRows.filter((r) => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).reduce((sum, r) => sum + parseFloat(String(r.packagePrice ?? "0")), 0),
    }));
  }, [subRows]);

  // Top 5 subscribers by plan price
  const topSubscribers = useMemo(() =>
    [...subRows]
      .filter((r) => r.isActive)
      .sort((a, b) => parseFloat(String(b.packagePrice ?? "0")) - parseFloat(String(a.packagePrice ?? "0")))
      .slice(0, 5),
  [subRows]);

  const loading = statsLoading || subsLoading;

  return (
    <AdminLayout title="التقارير والتحليلات">
      <div className="space-y-6" dir="rtl">

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Building2}  label="عقارات نشطة"     value={(stats.activeProperties ?? 0).toLocaleString("ar-EG")}  color="bg-teal-50 text-teal-600" />
            <KpiCard icon={Users}      label="مستخدمون"         value={(stats.totalUsers ?? 0).toLocaleString("ar-EG")}         color="bg-sky-50 text-sky-600" />
            <KpiCard icon={DollarSign} label="إجمالي الإيرادات" value={`${(stats.totalRevenue ?? 0).toLocaleString("en-US")} ج.م`} color="bg-emerald-50 text-emerald-600" sub="من اشتراكات مدفوعة" />
            <KpiCard icon={Package}    label="اشتراكات نشطة"   value={(subTotals.totalActive ?? 0).toLocaleString("ar-EG")}    color="bg-violet-50 text-violet-600" sub={`${subTotals.monthlyRecurring ? parseFloat(String(subTotals.monthlyRecurring)).toLocaleString("en-US") : 0} ج.م/شهر`} />
          </div>
        )}

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Monthly bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-bold text-base text-slate-800">الاشتراكات الشهرية</h3>
              <p className="text-xs text-slate-500 mt-0.5">عدد الاشتراكات الجديدة آخر 4 أشهر</p>
            </div>
            {loading ? <Skeleton className="h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="اشتراكات" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tier donut */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-bold text-base text-slate-800">توزيع الباقات</h3>
              <p className="text-xs text-slate-500 mt-0.5">الاشتراكات النشطة حسب النوع</p>
            </div>
            {loading ? <Skeleton className="h-56 rounded-xl" /> : tierData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {tierData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#64748b" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">لا توجد اشتراكات نشطة</div>
            )}
          </div>
        </div>

        {/* ── Top Subscribers + Summary ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top active subscribers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-base text-slate-800">أعلى المشتركين (نشط)</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : topSubscribers.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">لا توجد اشتراكات نشطة</p>
            ) : (
              <div className="space-y-3">
                {topSubscribers.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 text-sm">
                        {(i + 1)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 truncate max-w-[140px]">{s.subscriberName}</p>
                        <p className="text-xs text-slate-400">{s.packageNameAr ?? "—"} • {s.daysLeft ?? 0} يوم</p>
                      </div>
                    </div>
                    <span className="font-bold text-teal-600 text-sm">
                      <span dir="ltr">{parseFloat(String(s.packagePrice ?? "0")).toLocaleString("en-US")} ج.م</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscription summary stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-violet-500" />
              <h3 className="font-bold text-base text-slate-800">ملخص الاشتراكات</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "اشتراكات المستخدمين", value: subTotals.userActive ?? 0, color: "bg-sky-500" },
                  { label: "اشتراكات الشركات", value: subTotals.companyActive ?? 0, color: "bg-teal-500" },
                  { label: "باقات مميزة (≥200 ج.م)", value: subTotals.premiumActive ?? 0, color: "bg-violet-500" },
                  { label: "باقات مجانية", value: subTotals.freeActive ?? 0, color: "bg-slate-400" },
                ].map((item) => {
                  const total = subTotals.totalActive || 1;
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className="font-bold text-slate-800">{item.value.toLocaleString("ar-EG")} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 mt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      إجمالي الإيراد الشهري المتكرر
                    </span>
                    <span className="font-extrabold text-emerald-600">
                      <span dir="ltr">{parseFloat(String(subTotals.monthlyRecurring ?? "0")).toLocaleString("en-US")} ج.م</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
