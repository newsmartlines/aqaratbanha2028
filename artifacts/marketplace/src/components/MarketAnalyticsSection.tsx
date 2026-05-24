import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, BarChart2, Activity,
  Info, RefreshCw, ChevronDown, ChevronUp, MapPin, Home,
  Zap, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface PricePoint { month: string; avgPpm2: number; count: number; }

interface MarketData {
  enabled: boolean;
  hasEnoughData: boolean;
  minSamplesRequired: number;
  sampleCount: number;
  avgPricePerM2: number | null;
  medianPricePerM2: number | null;
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
  regionNameAr?: string;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-EG");
}

function formatMonth(key: string): string {
  try {
    const [y, m] = key.split("-");
    const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return `${months[parseInt(m) - 1] ?? m} ${y?.slice(2)}`;
  } catch { return key; }
}

type Period = "1m" | "3m" | "6m" | "12m";
const PERIOD_OPTS: { key: Period; label: string; months: number; trendKey: keyof MarketData }[] = [
  { key: "1m",  label: "شهر",     months: 1,  trendKey: "trend1m"  },
  { key: "3m",  label: "3 شهور",  months: 3,  trendKey: "trend3m"  },
  { key: "6m",  label: "6 شهور",  months: 6,  trendKey: "trend6m"  },
  { key: "12m", label: "12 شهر",  months: 12, trendKey: "trend12m" },
];

const DEMAND_CONFIG = [
  { label: "ضعيف",      min: 0,  max: 25,  color: "#94a3b8", bg: "#f1f5f9", text: "#64748b" },
  { label: "متوسط",     min: 25, max: 50,  color: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  { label: "مرتفع",     min: 50, max: 75,  color: "#10b981", bg: "#f0fdf4", text: "#065f46" },
  { label: "مرتفع جدًا",min: 75, max: 100, color: "#8b5cf6", bg: "#faf5ff", text: "#5b21b6" },
];

function getDemandConfig(score: number) {
  return DEMAND_CONFIG.find(c => score >= c.min && score < c.max) ?? DEMAND_CONFIG[DEMAND_CONFIG.length - 1];
}

function getTrendConfig(value: number | null) {
  if (value == null) return { color: "#94a3b8", bg: "#f1f5f9", icon: Minus, prefix: "" };
  if (Math.abs(value) < 0.5) return { color: "#64748b", bg: "#f1f5f9", icon: Minus, prefix: "" };
  if (value > 0) return { color: "#10b981", bg: "#f0fdf4", icon: TrendingUp, prefix: "+" };
  return { color: "#ef4444", bg: "#fef2f2", icon: TrendingDown, prefix: "" };
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 900;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display.toLocaleString("ar-EG")}{suffix}</>;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-2xl p-3 text-right min-w-[180px]">
      <p className="text-xs font-semibold text-gray-400 mb-2">{formatMonth(label)}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500">متوسط المتر</span>
          <span className="text-sm font-extrabold" style={{ color: p.color }}>
            {p.value?.toLocaleString("ar-EG")} <span className="text-xs font-normal text-gray-400">ج.م</span>
          </span>
        </div>
      ))}
      {payload[0]?.payload?.count > 0 && (
        <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 text-center">
          {payload[0].payload.count} عقار في هذا الشهر
        </p>
      )}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function SkeletonLayout() {
  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

// ── Price Position Bar ────────────────────────────────────────────────────────
function PricePositionBar({
  min, max, avg, current, compColor,
}: { min: number; max: number; avg: number; current: number | null; compColor: string }) {
  const range = max - min || 1;
  const avgPos = Math.min(100, Math.max(0, ((avg - min) / range) * 100));
  const curPos = current != null ? Math.min(100, Math.max(0, ((current - min) / range) * 100)) : null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] text-gray-400 font-medium">
        <span>{fmtNum(min)} ج.م</span>
        <span className="text-gray-500 font-semibold">نطاق أسعار المتر في المنطقة</span>
        <span>{fmtNum(max)} ج.م</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-l from-red-100 via-amber-50 to-emerald-100">
        {/* Average marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-md z-10"
          style={{ left: `${avgPos}%`, transform: "translate(-50%, -50%)" }}
          title="متوسط المنطقة"
        />
        {/* Current property marker */}
        {curPos != null && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg z-20 flex items-center justify-center"
            style={{ left: `${curPos}%`, transform: "translate(-50%, -50%)", background: compColor }}
            title="هذا العقار"
          >
            <Home className="w-2 h-2 text-white" />
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary border border-white shadow-sm" />
          <span className="text-gray-500">متوسط المنطقة: <span className="font-bold text-gray-700">{fmtNum(avg)} ج.م/م²</span></span>
        </div>
        {curPos != null && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: compColor }} />
            <span className="text-gray-500">هذا العقار: <span className="font-bold text-gray-700">{fmtNum(current)} ج.م/م²</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// Fallback scope labels
const FALLBACK_LABELS = ["المدينة · النوع", "المدينة", "المحافظة", "الفئة"];

export function MarketAnalyticsSection({
  cityId, regionId, district, mainCategory, subCategory, listingType,
  priceNum, area, cityNameAr, regionNameAr,
}: Props) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<Period>("12m");
  const [collapsed, setCollapsed] = useState(false);
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);

  const scopeLabel = [district, cityNameAr ?? regionNameAr].filter(Boolean).join(" — ");
  const typeLabel = [subCategory ?? mainCategory, listingType].filter(Boolean).join(" · ");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const base: Record<string, string> = { mainCategory };
      if (priceNum && priceNum > 0) base.priceNum = String(priceNum);
      if (area && area > 0) base.area = String(area);

      // Progressive fallback scopes: most specific → broadest
      const levels: Record<string, string>[] = [
        // 0: city + subCat + listingType
        { ...base, ...(cityId ? { cityId: String(cityId) } : regionId ? { regionId: String(regionId) } : {}), ...(subCategory ? { subCategory } : {}), ...(listingType ? { listingType } : {}) },
        // 1: city only (drop type + subCat)
        { ...base, ...(cityId ? { cityId: String(cityId) } : regionId ? { regionId: String(regionId) } : {}) },
      ];
      // 2: region fallback (only if we had a cityId)
      if (cityId && regionId) levels.push({ ...base, regionId: String(regionId) });
      // 3: mainCategory only (broadest)
      levels.push({ ...base });

      let result: MarketData | null = null;
      let usedLevel = 0;
      for (let i = 0; i < levels.length; i++) {
        const qs = new URLSearchParams(levels[i]).toString();
        const res = await (api as any).fetchJson(`/market/analytics?${qs}`) as MarketData;
        if (res.hasEnoughData) {
          result = res;
          usedLevel = i;
          break;
        }
        // Keep the last result even if not enough data
        result = res;
        usedLevel = i;
      }
      setFallbackLevel(usedLevel);
      setData(result);
    } catch (e: any) {
      setError(e?.message || "خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainCategory) load();
  }, [cityId, regionId, district, mainCategory, subCategory, listingType]);

  if (!mainCategory) return null;
  if (!loading && data && !data.enabled) return null;

  const selectedPeriod = PERIOD_OPTS.find(p => p.key === chartPeriod)!;
  const trendValue = data ? (data[selectedPeriod.trendKey] as number | null) : null;
  const trendCfg = getTrendConfig(trendValue);
  const TrendIcon = trendCfg.icon;

  const chartData = data?.priceHistory
    ?.slice(-selectedPeriod.months)
    ?.map(p => ({ ...p, label: p.month })) ?? [];

  const priceDiff = data?.priceDiffPercent;
  const compColor = priceDiff == null
    ? "#6b7280"
    : priceDiff <= -10 ? "#10b981"
    : priceDiff >= 10 ? "#ef4444"
    : "#f59e0b";

  const demandCfg = data ? getDemandConfig(data.demandScore) : DEMAND_CONFIG[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="relative flex items-center justify-between px-6 py-5 border-b border-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/5 via-transparent to-violet-50/30 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">مؤشرات السوق العقاري</h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {scopeLabel && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {scopeLabel}
                </span>
              )}
              {typeLabel && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="text-gray-300">·</span> {typeLabel}
                </span>
              )}
              {!loading && data?.hasEnoughData && fallbackLevel > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                  بيانات على مستوى {fallbackLevel === 1 ? "المدينة" : fallbackLevel === 2 ? "المحافظة" : "الفئة"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-1.5">
          <motion.button
            whileTap={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            onClick={load}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* Loading skeleton */}
            {loading && <SkeletonLayout />}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-col items-center gap-4 py-14 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-red-300" />
                </div>
                <div>
                  <p className="font-bold text-gray-700 mb-1">تعذر تحميل البيانات</p>
                  <p className="text-sm text-gray-400">{error}</p>
                </div>
                <button
                  onClick={load}
                  className="text-xs text-primary font-semibold border border-primary/20 rounded-xl px-4 py-2 hover:bg-primary/5 transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Not enough data */}
            {!loading && !error && data && !data.hasEnoughData && (
              <div className="flex flex-col items-center gap-4 py-14 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <Info className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-gray-800 mb-1">بيانات غير كافية</p>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    لا توجد بيانات كافية لإظهار مؤشر دقيق لهذه المنطقة حالياً.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                    <span className="text-xs text-amber-700">
                      المطلوب <strong>{data.minSamplesRequired}</strong> عقار · المتاح <strong>{data.sampleCount}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main analytics */}
            {!loading && !error && data && data.hasEnoughData && (
              <div className="p-6 space-y-6">

                {/* ── Hero metric strip ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="relative rounded-2xl overflow-hidden p-5"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.07) 0%, hsl(var(--primary)/0.03) 100%)", border: "1px solid hsl(var(--primary)/0.12)" }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-primary/70 mb-1 tracking-wide uppercase">متوسط سعر المتر المربع</p>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-primary tabular-nums">
                          <AnimatedNumber value={data.avgPricePerM2 ?? 0} />
                        </span>
                        <span className="text-lg text-primary/60 font-semibold mb-1">ج.م / م²</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        من <span className="font-semibold text-gray-600">{fmtNum(data.minPricePerM2)}</span> إلى <span className="font-semibold text-gray-600">{fmtNum(data.maxPricePerM2)}</span> ج.م
                        {data.medianPricePerM2 != null && (
                          <> · الوسيط <span className="font-semibold text-gray-600">{fmtNum(data.medianPricePerM2)}</span> ج.م</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 mb-0.5">خلال {selectedPeriod.label}</p>
                        <div
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-sm"
                          style={{ background: trendCfg.bg, color: trendCfg.color }}
                        >
                          <TrendIcon className="w-3.5 h-3.5" />
                          {trendValue != null
                            ? `${trendCfg.prefix}${trendValue.toFixed(1)}%`
                            : "لا يوجد بيانات"}
                        </div>
                      </div>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: trendCfg.bg }}
                      >
                        <TrendIcon className="w-6 h-6" style={{ color: trendCfg.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Sample count badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/80 border border-gray-100 rounded-full px-2.5 py-1 text-[10px] text-gray-500 font-semibold shadow-sm">
                    <Home className="w-3 h-3" />
                    {data.sampleCount} عقار محلل
                  </div>
                </motion.div>

                {/* ── Price position bar ── */}
                {data.minPricePerM2 != null && data.maxPricePerM2 != null && data.avgPricePerM2 != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4"
                  >
                    <PricePositionBar
                      min={data.minPricePerM2}
                      max={data.maxPricePerM2}
                      avg={data.avgPricePerM2}
                      current={data.currentPropertyPpm2}
                      compColor={compColor}
                    />
                  </motion.div>
                )}

                {/* ── KPI row ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  {PERIOD_OPTS.map((p) => {
                    const v = data[p.trendKey] as number | null;
                    const cfg = getTrendConfig(v);
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={p.key}
                        className="rounded-2xl border p-3.5 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          borderColor: chartPeriod === p.key ? cfg.color + "55" : "#f1f5f9",
                          background: chartPeriod === p.key ? cfg.bg : "white",
                          boxShadow: chartPeriod === p.key ? `0 0 0 1.5px ${cfg.color}30` : undefined,
                        }}
                        onClick={() => setChartPeriod(p.key)}
                      >
                        <p className="text-[11px] font-semibold text-gray-400 mb-1">{p.label}</p>
                        <div className="flex items-center gap-1" style={{ color: cfg.color }}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xl font-extrabold tabular-nums">
                            {v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {v == null ? "لا يوجد بيانات" : v > 0 ? "ارتفاع في الأسعار" : v < 0 ? "انخفاض في الأسعار" : "استقرار نسبي"}
                        </p>
                      </div>
                    );
                  })}
                </motion.div>

                {/* ── Price comparison for current property ── */}
                {data.currentPropertyPpm2 != null && data.priceComparison && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    style={{ background: compColor + "0f", borderColor: compColor + "30" }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: compColor + "20" }}
                    >
                      {(priceDiff ?? 0) < -10
                        ? <ArrowDownRight className="w-6 h-6" style={{ color: compColor }} />
                        : (priceDiff ?? 0) > 10
                        ? <ArrowUpRight className="w-6 h-6" style={{ color: compColor }} />
                        : <Minus className="w-6 h-6" style={{ color: compColor }} />}
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-base" style={{ color: compColor }}>
                        سعر هذا العقار {data.priceComparison}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        متوسط المنطقة <span className="font-bold text-gray-700">{fmtNum(data.avgPricePerM2)} ج.م/م²</span>
                        {" · "}
                        هذا العقار <span className="font-bold text-gray-700">{fmtNum(data.currentPropertyPpm2)} ج.م/م²</span>
                      </p>
                    </div>
                    {priceDiff != null && (
                      <div className="text-left shrink-0">
                        <div
                          className="text-3xl font-black tabular-nums"
                          style={{ color: compColor }}
                        >
                          {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(1)}%
                        </div>
                        <p className="text-[11px] text-gray-400 text-center">عن متوسط السوق</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Chart ── */}
                {chartData.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-900">اتجاه أسعار المتر المربع</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">آخر {selectedPeriod.label}</p>
                      </div>
                      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {PERIOD_OPTS.map(p => (
                          <button
                            key={p.key}
                            onClick={() => setChartPeriod(p.key)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                              chartPeriod === p.key
                                ? "bg-white shadow text-primary"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-60 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mktGradPrimary" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickFormatter={formatMonth}
                            tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "inherit" }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                            tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "inherit" }}
                            axisLine={false}
                            tickLine={false}
                            width={36}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          {data.avgPricePerM2 && (
                            <ReferenceLine
                              y={data.avgPricePerM2}
                              stroke="hsl(var(--primary))"
                              strokeDasharray="6 3"
                              strokeWidth={1.5}
                              strokeOpacity={0.5}
                              label={{
                                value: "المتوسط",
                                position: "insideTopRight",
                                fontSize: 9,
                                fill: "hsl(var(--primary))",
                                opacity: 0.8,
                              }}
                            />
                          )}
                          {data.currentPropertyPpm2 && (
                            <ReferenceLine
                              y={data.currentPropertyPpm2}
                              stroke={compColor}
                              strokeDasharray="5 3"
                              strokeWidth={1.5}
                              label={{
                                value: "هذا العقار",
                                position: "insideTopLeft",
                                fontSize: 9,
                                fill: compColor,
                              }}
                            />
                          )}
                          <Area
                            type="monotone"
                            dataKey="avgPpm2"
                            name="متوسط المتر"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            fill="url(#mktGradPrimary)"
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "white", fill: "hsl(var(--primary))" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {/* ── Demand meter ── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-gray-100 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-extrabold text-gray-900">مستوى الطلب في المنطقة</span>
                    </div>
                    <div
                      className="px-3 py-1 rounded-xl text-xs font-extrabold"
                      style={{ background: demandCfg.bg, color: demandCfg.text }}
                    >
                      {data.demandLevel}
                    </div>
                  </div>

                  {/* Segmented demand bar */}
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {DEMAND_CONFIG.map((seg, i) => {
                      const filled = data.demandScore >= seg.max;
                      const partial = data.demandScore > seg.min && data.demandScore < seg.max;
                      const fillPct = partial ? ((data.demandScore - seg.min) / (seg.max - seg.min)) * 100 : filled ? 100 : 0;
                      return (
                        <div key={i} className="relative flex-1 rounded-full overflow-hidden bg-gray-100">
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
                            style={{ background: seg.color }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400">
                    {DEMAND_CONFIG.map((s, i) => (
                      <span
                        key={i}
                        className="font-medium"
                        style={{ color: data.demandScore >= s.min ? s.color : "#9ca3af" }}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400">
                    مبني على المشاهدات · المفضلات · حجم العروض · اتجاه الأسعار
                  </p>
                </motion.div>

                {/* ── Footer ── */}
                <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-400">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    البيانات محسوبة تلقائيًا من <strong className="text-gray-600">{data.sampleCount} عقار معتمد</strong> في نفس المنطقة والتصنيف. تُحدَّث المؤشرات عند كل إضافة أو تعديل أو اعتماد.
                  </span>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
