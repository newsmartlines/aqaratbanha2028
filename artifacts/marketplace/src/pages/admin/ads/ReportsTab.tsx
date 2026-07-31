/**
 * ReportsTab — Statistics, CTR, Revenue, RPM, Charts, Export
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye, MousePointerClick, TrendingUp, DollarSign,
  Download, RefreshCw, Calendar, BarChart2, Loader2
} from "lucide-react";

interface OverviewData {
  totalImpressions: number;
  totalClicks: number;
  ctr: string;
  totalRevenue: string;
  rpm: string;
  activeAds: number;
  totalAds: number;
  byDay: { date: string; impressions: number; clicks: number }[];
  topAds: {
    id: number; name: string; impressions: number; clicks: number;
    ctr: string; lastImpression?: string; lastClick?: string;
  }[];
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-black">{value}</p>
          <p className="text-xs font-medium opacity-75 mt-1">{label}</p>
        </div>
        <Icon className="w-6 h-6 opacity-60" />
      </div>
    </div>
  );
}

function MiniChart({ data, field }: {
  data: { date: string; impressions: number; clicks: number }[];
  field: "impressions" | "clicks";
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d[field]), 1);
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative">
          <div
            className={`w-full rounded-t transition-all ${field === "impressions" ? "bg-primary/60" : "bg-indigo-400/60"} group-hover:opacity-100 opacity-80`}
            style={{ height: `${Math.max(4, (d[field] / max) * 100)}%` }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
            {d.date}: {d[field].toLocaleString("ar-EG")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const { data: overview, isFetching, refetch } = useQuery<OverviewData>({
    queryKey: ["ads-reports-overview", from, to],
    queryFn: async () => {
      const r = await fetch(`/api/admin/ads/reports/overview?from=${from}&to=${to}`, { credentials: "include" });
      return (await r.json()).data;
    },
  });

  const handleExport = () => {
    const url = `/api/admin/ads/reports/export?from=${from}&to=${to}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-2xl">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />من</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="w-40 text-sm" dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />إلى</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="w-40 text-sm" dir="ltr" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
          className="gap-2 rounded-xl h-9">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
        <Button size="sm" onClick={handleExport} className="gap-2 rounded-xl h-9 mr-auto">
          <Download className="w-3.5 h-3.5" /> تصدير CSV
        </Button>
      </div>

      {isFetching && !overview ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : overview ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={Eye} label="إجمالي المشاهدات" value={overview.totalImpressions.toLocaleString("ar-EG")} color="bg-primary/10 text-primary" />
            <StatCard icon={MousePointerClick} label="إجمالي النقرات" value={overview.totalClicks.toLocaleString("ar-EG")} color="bg-indigo-100 text-indigo-700" />
            <StatCard icon={TrendingUp} label="CTR" value={`${overview.ctr}%`} color="bg-emerald-100 text-emerald-700" />
            <StatCard icon={DollarSign} label="الإيراد" value={`${parseFloat(overview.totalRevenue).toFixed(2)} ج.م`} color="bg-amber-100 text-amber-700" />
            <StatCard icon={BarChart2} label="RPM" value={`${parseFloat(overview.rpm).toFixed(2)} ج.م`} color="bg-purple-100 text-purple-700" />
          </div>

          {/* Charts */}
          {overview.byDay.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> المشاهدات اليومية
                </p>
                <MiniChart data={overview.byDay} field="impressions" />
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>{overview.byDay[0]?.date}</span>
                  <span>{overview.byDay[overview.byDay.length - 1]?.date}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-indigo-500" /> النقرات اليومية
                </p>
                <MiniChart data={overview.byDay} field="clicks" />
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>{overview.byDay[0]?.date}</span>
                  <span>{overview.byDay[overview.byDay.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Ads Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> أفضل الإعلانات أداءً
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs">
                    {["الإعلان","المشاهدات","النقرات","CTR","آخر مشاهدة","آخر نقرة"].map(h => (
                      <th key={h} className="px-4 py-3 text-right font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.topAds.map((ad, i) => (
                    <tr key={ad.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-yellow-500">🥇</span>}
                          {i === 1 && <span className="text-slate-400">🥈</span>}
                          {i === 2 && <span className="text-amber-600">🥉</span>}
                          <span className="font-medium text-slate-800 whitespace-nowrap">{ad.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{(ad.impressions || 0).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3 text-slate-600">{(ad.clicks || 0).toLocaleString("ar-EG")}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${parseFloat(ad.ctr) > 2 ? "text-emerald-600" : parseFloat(ad.ctr) > 0.5 ? "text-primary" : "text-slate-400"}`}>
                          {ad.ctr}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap" dir="ltr">
                        {ad.lastImpression ? new Date(ad.lastImpression).toLocaleString("ar-EG") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap" dir="ltr">
                        {ad.lastClick ? new Date(ad.lastClick).toLocaleString("ar-EG") : "—"}
                      </td>
                    </tr>
                  ))}
                  {overview.topAds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">لا توجد بيانات في الفترة المحددة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
