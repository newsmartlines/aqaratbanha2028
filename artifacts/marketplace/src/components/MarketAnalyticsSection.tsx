import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart2, Activity, Info, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

interface PricePoint { month: string; avgPpm2: number; count: number; }

interface MarketData {
  enabled: boolean;
  hasEnoughData: boolean;
  minSamplesRequired: number;
  sampleCount: number;
  avgPricePerM2: number | null;
  minPricePerM2: number | null;
  maxPricePerM2: number | null;
  trend1m: number | null;
  trend3m: number | null;
  trend6m: number | null;
  trend12m: number | null;
  demandScore: number;
  demandLevel: string;
  priceHistory: PricePoint[];
  currentPropertyPpm2: number | null;
  priceComparison: string | null;
  priceDiffPercent: number | null;
}

interface Props {
  cityId?: number | null;
  regionId?: number | null;
  district?: string | null;
  mainCategory: string;
  subCategory?: string | null;
  listingType?: string | null;
  priceNum?: number;
  area?: number;
  cityNameAr?: string;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG");
}

function TrendBadge({ value, label }: { value: number | null; label: string }) {
  if (value == null) return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-bold text-gray-400">—</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
  const isPos = value > 0;
  const isNeu = Math.abs(value) < 0.5;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-sm font-extrabold flex items-center gap-0.5 ${isNeu ? "text-gray-600" : isPos ? "text-emerald-600" : "text-red-500"}`}>
        {isNeu ? <Minus className="w-3 h-3" /> : isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPos && !isNeu ? "+" : ""}{value.toFixed(1)}%
      </span>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

function DemandMeter({ score, level }: { score: number; level: string }) {
  const segments = [
    { label: "ضعيف", min: 0, max: 25, color: "#94a3b8" },
    { label: "متوسط", min: 25, max: 50, color: "#f59e0b" },
    { label: "مرتفع", min: 50, max: 75, color: "#10b981" },
    { label: "مرتفع جدًا", min: 75, max: 100, color: "#8b5cf6" },
  ];
  const active = segments.find(s => score >= s.min && score < s.max) ?? segments[segments.length - 1];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">مستوى الطلب</span>
        <span className="text-sm font-extrabold" style={{ color: active.color }}>{level}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
        {segments.map((s, i) => (
          <div key={i} className="flex-1 rounded-full" style={{ background: score > s.min ? s.color : "transparent", opacity: score > s.min ? (score >= s.max ? 1 : 0.9) : 0.2 }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 font-medium mt-0.5">
        <span>ضعيف</span><span>متوسط</span><span>مرتفع</span><span>مرتفع جدًا</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-36 bg-gray-200 rounded mb-1" />
      <div className="h-8 w-24 bg-gray-200 rounded" />
    </div>
  );
}

function formatMonth(key: string): string {
  try {
    const [y, m] = key.split("-");
    const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return `${months[parseInt(m) - 1] ?? m} ${y}`;
  } catch { return key; }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-3 text-right min-w-[160px]">
      <p className="text-xs text-gray-500 mb-1">{formatMonth(label)}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 justify-between">
          <span className="text-xs font-bold" style={{ color: p.color }}>{p.value?.toLocaleString("ar-EG")} ج.م</span>
          <span className="text-xs text-gray-400">متوسط المتر</span>
        </div>
      ))}
      {payload[0]?.payload?.count && (
        <p className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-gray-100">{payload[0].payload.count} عقار</p>
      )}
    </div>
  );
};

export function MarketAnalyticsSection({ cityId, regionId, district, mainCategory, subCategory, listingType, priceNum, area, cityNameAr }: Props) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<6 | 12>(12);
  const [collapsed, setCollapsed] = useState(false);

  const scopeLabel = [district, cityNameAr].filter(Boolean).join(" — ");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { mainCategory };
      if (cityId) params.cityId = String(cityId);
      else if (regionId) params.regionId = String(regionId);
      if (district) params.district = district;
      if (subCategory) params.subCategory = subCategory;
      if (listingType) params.listingType = listingType;
      if (priceNum && priceNum > 0) params.priceNum = String(priceNum);
      if (area && area > 0) params.area = String(area);

      const qs = new URLSearchParams(params).toString();
      const res = await (api as any).fetchJson(`/market/analytics?${qs}`);
      setData(res as MarketData);
    } catch (e: any) {
      setError(e?.message || "خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (mainCategory) load(); }, [cityId, regionId, district, mainCategory, subCategory, listingType]);

  if (!mainCategory) return null;
  if (!loading && data && !data.enabled) return null;

  const chartData = data?.priceHistory
    ?.slice(-(chartPeriod))
    ?.map(p => ({ ...p, label: p.month })) ?? [];

  const priceDiff = data?.priceDiffPercent;
  const compColor = priceDiff == null ? "#6b7280" : priceDiff <= -10 ? "#10b981" : priceDiff >= 10 ? "#ef4444" : "#f59e0b";
  const compBg = priceDiff == null ? "#f9fafb" : priceDiff <= -10 ? "#f0fdf4" : priceDiff >= 10 ? "#fef2f2" : "#fffbeb";

  return (
    <div className="mt-10 rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-gradient-to-l from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">مؤشرات السوق العقاري</h2>
            {scopeLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {scopeLabel} · {mainCategory}{subCategory ? ` · ${subCategory}` : ""}{listingType ? ` · ${listingType}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-6 space-y-6">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 p-4 animate-pulse space-y-2">
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                    <div className="h-7 w-28 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Activity className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">{error}</p>
              <button onClick={load} className="text-xs text-primary font-semibold hover:underline">إعادة المحاولة</button>
            </div>
          )}

          {/* No enough data */}
          {!loading && !error && data && !data.hasEnoughData && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                <Info className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">بيانات غير كافية</p>
                <p className="text-sm text-gray-500">
                  لا توجد بيانات كافية لإظهار مؤشر دقيق لهذه المنطقة حالياً.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  المطلوب: {data.minSamplesRequired} عقارات على الأقل · المتاح: {data.sampleCount}
                </p>
              </div>
            </div>
          )}

          {/* Main analytics */}
          {!loading && !error && data && data.hasEnoughData && (
            <>
              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Avg price per m² */}
                <div className="col-span-2 md:col-span-1 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary/70 mb-1">متوسط سعر المتر</p>
                  <p className="text-2xl font-extrabold text-primary">{fmt(data.avgPricePerM2)} <span className="text-sm font-normal">ج.م</span></p>
                  <p className="text-[10px] text-gray-400 mt-1">من {fmt(data.minPricePerM2)} إلى {fmt(data.maxPricePerM2)} ج.م</p>
                </div>

                {/* Sample count */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">العينة</p>
                  <p className="text-2xl font-extrabold text-gray-800">{data.sampleCount}</p>
                  <p className="text-[10px] text-gray-400 mt-1">عقار محلل في المنطقة</p>
                </div>

                {/* Price trends */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">تغير الأسعار</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                    <TrendBadge value={data.trend1m} label="شهر" />
                    <TrendBadge value={data.trend3m} label="3 شهور" />
                    <TrendBadge value={data.trend6m} label="6 شهور" />
                    <TrendBadge value={data.trend12m} label="سنة" />
                  </div>
                </div>

                {/* Demand score */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col justify-between">
                  <DemandMeter score={data.demandScore} level={data.demandLevel} />
                  <div className="mt-2 text-[10px] text-gray-400">بناءً على المشاهدات والمفضلات</div>
                </div>
              </div>

              {/* ── Price Comparison for current property ── */}
              {data.currentPropertyPpm2 != null && data.priceComparison && (
                <div
                  className="rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  style={{ background: compBg, borderColor: compColor + "33" }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: compColor + "22" }}>
                      {(priceDiff ?? 0) < -10
                        ? <TrendingDown className="w-5 h-5" style={{ color: compColor }} />
                        : (priceDiff ?? 0) > 10
                        ? <TrendingUp className="w-5 h-5" style={{ color: compColor }} />
                        : <Minus className="w-5 h-5" style={{ color: compColor }} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: compColor }}>{data.priceComparison}</p>
                      <p className="text-xs text-gray-500">
                        سعر متر هذا العقار:{" "}
                        <span className="font-bold text-gray-800">{fmt(data.currentPropertyPpm2)} ج.م/م²</span>
                        {" "}مقارنةً بمتوسط المنطقة:{" "}
                        <span className="font-bold text-gray-800">{fmt(data.avgPricePerM2)} ج.م/م²</span>
                      </p>
                    </div>
                  </div>
                  {priceDiff != null && (
                    <div className="text-left shrink-0">
                      <span className="text-2xl font-extrabold" style={{ color: compColor }}>
                        {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}%
                      </span>
                      <p className="text-[10px] text-gray-400">عن متوسط السوق</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Price History Chart ── */}
              {chartData.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-gray-800">اتجاه أسعار المتر المربع</h3>
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                      {([6, 12] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setChartPeriod(p)}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${chartPeriod === p ? "bg-white shadow text-primary" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          {p === 6 ? "6 شهور" : "12 شهر"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-56 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickFormatter={formatMonth}
                          tick={{ fontSize: 9, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                          tick={{ fontSize: 9, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {data.currentPropertyPpm2 && (
                          <ReferenceLine
                            y={data.currentPropertyPpm2}
                            stroke={compColor}
                            strokeDasharray="5 3"
                            label={{ value: "هذا العقار", position: "insideTopRight", fontSize: 9, fill: compColor }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="avgPpm2"
                          name="متوسط المتر"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fill="url(#mktGrad)"
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">
                    متوسط سعر المتر المربع لعقارات مشابهة في نفس المنطقة خلال الأشهر الماضية
                  </p>
                </div>
              )}

              {/* Footer note */}
              <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                <span>
                  البيانات محسوبة تلقائيًا من عقارات مشابهة معتمدة في نفس المنطقة والتصنيف. تُحدَّث المؤشرات عند كل إضافة أو تعديل.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
