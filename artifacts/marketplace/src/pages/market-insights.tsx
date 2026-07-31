import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, Building2, MapPin, BarChart2, Home,
  Layers, TreePine, Factory, ArrowUpDown, Info,
  Search, ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type CatKey = "residential" | "commercial" | "land" | "industrial";

interface CatStats {
  avgPpm2: number | null;
  medianPpm2: number | null;
  minPpm2: number | null;
  maxPpm2: number | null;
  sampleCount: number;
}

interface CityRow {
  cityId: number;
  cityNameAr: string;
  regionNameAr: string;
  regionId: number;
  totalCount: number;
  totalViews: number;
  categories: Record<CatKey, CatStats>;
  overallAvgPpm2: number | null;
}

interface OverviewData {
  cities: CityRow[];
  overall: Record<CatKey, { avgPpm2: number | null; cityCount: number }>;
  totalProperties: number;
  totalCities: number;
  lastUpdated: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES: { key: CatKey; labelAr: string; icon: typeof Home }[] = [
  { key: "residential", labelAr: "سكني",   icon: Home },
  { key: "commercial",  labelAr: "تجاري",  icon: Building2 },
  { key: "land",        labelAr: "أراضي",  icon: TreePine },
  { key: "industrial",  labelAr: "صناعي",  icon: Factory },
];

const CAT_COLORS: Record<CatKey, string> = {
  residential: "#0ea5e9",
  commercial:  "#8b5cf6",
  land:        "#10b981",
  industrial:  "#f59e0b",
};

type SortField = "cityNameAr" | "totalCount" | "overallAvgPpm2" | CatKey;
type SortDir = "asc" | "desc";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtK(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("en-US");
}

function fmtFull(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US") + " ج.م/م²";
}

/** Map a ppm2 value to a heatmap color between cool and hot */
function heatColor(val: number | null, min: number, max: number): string {
  if (val == null || max === min) return "#f1f5f9";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  // cool → warm: #bfdbfe (blue-200) → #fca5a5 (red-300)
  const r = Math.round(191 + (252 - 191) * t);
  const g = Math.round(219 + (165 - 219) * t);
  const b = Math.round(254 + (165 - 254) * t);
  return `rgb(${r},${g},${b})`;
}

function heatText(val: number | null, min: number, max: number): string {
  if (val == null || max === min) return "#64748b";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return t > 0.6 ? "#7f1d1d" : t > 0.3 ? "#78350f" : "#1e3a5f";
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skel key={i} className="h-28" />)}
      </div>
      <Skel className="h-72" />
      <Skel className="h-96" />
    </div>
  );
}

// ── Custom Chart Tooltip ───────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-3 text-right min-w-[160px]">
      <p className="text-xs font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">{p.name}</span>
          <span className="text-sm font-extrabold" style={{ color: p.fill }}>
            {fmtFull(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Sort Header Cell ───────────────────────────────────────────────────────────
function SortCell({
  label, field, sortField, sortDir, onSort,
  className = "",
}: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir;
  onSort: (f: SortField) => void; className?: string;
}) {
  const active = sortField === field;
  return (
    <th
      className={`px-3 py-3 text-right text-xs font-bold cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-primary/5 ${active ? "text-primary" : "text-gray-500"} ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketInsightsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CatKey | "all">("all");
  const [sortField, setSortField] = useState<SortField>("totalCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [chartCat, setChartCat] = useState<CatKey>("residential");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await (api as any).fetchJson("/market/overview");
        setData(res as OverviewData);
      } catch (e: any) {
        setError(e?.message || "خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // Filtered + sorted cities
  const cities = (data?.cities ?? []).filter(c => {
    if (search && !c.cityNameAr.includes(search) && !c.regionNameAr.includes(search)) return false;
    if (activeCat !== "all" && !c.categories[activeCat]?.sampleCount) return false;
    return true;
  });

  const sorted = [...cities].sort((a, b) => {
    let av: number, bv: number;
    if (sortField === "cityNameAr") {
      return sortDir === "asc"
        ? a.cityNameAr.localeCompare(b.cityNameAr, "ar")
        : b.cityNameAr.localeCompare(a.cityNameAr, "ar");
    }
    if (sortField === "totalCount") { av = a.totalCount; bv = b.totalCount; }
    else if (sortField === "overallAvgPpm2") { av = a.overallAvgPpm2 ?? 0; bv = b.overallAvgPpm2 ?? 0; }
    else { av = a.categories[sortField as CatKey]?.avgPpm2 ?? 0; bv = b.categories[sortField as CatKey]?.avgPpm2 ?? 0; }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  // Compute heatmap ranges per category
  const ranges: Record<CatKey, { min: number; max: number }> = {} as any;
  for (const cat of CATEGORIES.map(c => c.key)) {
    const vals = (data?.cities ?? []).map(c => c.categories[cat]?.avgPpm2).filter((v): v is number => v != null);
    ranges[cat] = { min: Math.min(...vals, 0), max: Math.max(...vals, 1) };
  }

  // Top-5 bar chart data for selected category
  const top5 = [...(data?.cities ?? [])]
    .filter(c => (c.categories[chartCat]?.sampleCount ?? 0) > 0)
    .sort((a, b) => (b.categories[chartCat]?.avgPpm2 ?? 0) - (a.categories[chartCat]?.avgPpm2 ?? 0))
    .slice(0, 8);

  const barData = top5.map(c => ({
    name: c.cityNameAr,
    avgPpm2: c.categories[chartCat]?.avgPpm2 ?? 0,
    medianPpm2: c.categories[chartCat]?.medianPpm2 ?? 0,
  }));

  // Radar chart: compare top cities across categories
  const radarCities = [...(data?.cities ?? [])]
    .filter(c => c.totalCount >= 3)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5);

  const maxPpm2Overall = Math.max(...(data?.cities ?? []).map(c => c.overallAvgPpm2 ?? 0), 1);

  const radarData = CATEGORIES.map(cat => ({
    cat: cat.labelAr,
    ...Object.fromEntries(
      radarCities.map(c => [c.cityNameAr, Math.round(((c.categories[cat.key]?.avgPpm2 ?? 0) / maxPpm2Overall) * 100)])
    ),
  }));

  const RADAR_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      <Header />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
              <MapPin className="w-4 h-4" />
              <span>مصر — محافظة القليوبية والقاهرة والجيزة</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">مؤشرات السوق العقاري</h1>
            <p className="text-white/70 text-base max-w-lg">
              تحليل شامل لأسعار المتر المربع حسب المدينة والتصنيف — مستخرج تلقائيًا من بيانات العقارات المعتمدة.
            </p>
            {data && (
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                  <Home className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-bold">{data.totalProperties} عقار محلل</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                  <MapPin className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-bold">{data.totalCities} مدينة / منطقة</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                  <BarChart2 className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-bold">
                    آخر تحديث: {new Date(data.lastUpdated).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">

        {loading && <LoadingSkeleton />}

        {error && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Info className="w-8 h-8 text-red-300" />
            </div>
            <p className="font-bold text-gray-700">تعذر تحميل البيانات</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── Overall KPI cards ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {CATEGORIES.map((cat, i) => {
                const ov = data.overall[cat.key];
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    style={{ borderColor: chartCat === cat.key ? CAT_COLORS[cat.key] + "55" : undefined, boxShadow: chartCat === cat.key ? `0 0 0 2px ${CAT_COLORS[cat.key]}30` : undefined }}
                    onClick={() => setChartCat(cat.key)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: CAT_COLORS[cat.key] + "18" }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: CAT_COLORS[cat.key] }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-400">{ov?.cityCount ?? 0} مدينة</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{cat.labelAr} · متوسط المتر</p>
                    <div className="text-2xl font-black tabular-nums" style={{ color: CAT_COLORS[cat.key] }}>
                      {ov?.avgPpm2 ? fmtK(ov.avgPpm2) : "—"}
                      <span className="text-xs font-normal text-gray-400 mr-1">ج.م</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── Bar Chart ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">أعلى المدن حسب سعر المتر المربع</h2>
                  <p className="text-xs text-gray-400 mt-0.5">مقارنة المتوسط والوسيط لكل مدينة</p>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setChartCat(cat.key)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        chartCat === cat.key ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {cat.labelAr}
                    </button>
                  ))}
                </div>
              </div>

              {barData.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات كافية لهذا التصنيف</div>
              ) : (
                <div className="h-72" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                        tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "inherit" }}
                        axisLine={false} tickLine={false} width={36}
                      />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="avgPpm2" name="المتوسط" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[chartCat]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                      <Bar dataKey="medianPpm2" name="الوسيط" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[chartCat]} fillOpacity={0.35} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-400 justify-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: CAT_COLORS[chartCat], opacity: 0.85 }} />
                  المتوسط
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: CAT_COLORS[chartCat], opacity: 0.35 }} />
                  الوسيط
                </span>
              </div>
            </motion.div>

            {/* ── Radar Chart ── */}
            {radarCities.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-extrabold text-gray-900">مقارنة شاملة بين المدن</h2>
                  <p className="text-xs text-gray-400 mt-0.5">أداء أعلى المدن عبر جميع التصنيفات (مؤشر نسبي)</p>
                </div>
                <div className="h-72" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="cat" tick={{ fontSize: 11, fill: "#6b7280", fontFamily: "inherit" }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      {radarCities.map((city, i) => (
                        <Radar
                          key={city.cityId}
                          name={city.cityNameAr}
                          dataKey={city.cityNameAr}
                          stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                          fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                          fillOpacity={0.08}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-center mt-2">
                  {radarCities.map((city, i) => (
                    <div key={city.cityId} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: RADAR_COLORS[i % RADAR_COLORS.length] }} />
                      {city.cityNameAr}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Heatmap Table ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Table header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">جدول أسعار المتر حسب المدينة</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    الألوان تعكس الأسعار النسبية: <span style={{ color: "#1e3a5f", fontWeight: 700 }}>أقل ←</span> <span style={{ color: "#7f1d1d", fontWeight: 700 }}>→ أعلى</span>
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Category filter */}
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setActiveCat("all")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${activeCat === "all" ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      الكل
                    </button>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCat(cat.key)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${activeCat === cat.key ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        {cat.labelAr}
                      </button>
                    ))}
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute top-1/2 right-3 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="بحث عن مدينة..."
                      className="pr-8 pl-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 w-36"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <SortCell label="المدينة"      field="cityNameAr"     sortField={sortField} sortDir={sortDir} onSort={handleSort} className="min-w-[120px]" />
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 min-w-[100px]">المحافظة</th>
                      <SortCell label="عدد العقارات" field="totalCount"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortCell label="المتوسط العام" field="overallAvgPpm2" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      {CATEGORIES.map(cat => (
                        <SortCell
                          key={cat.key}
                          label={cat.labelAr}
                          field={cat.key}
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={handleSort}
                          className="min-w-[80px]"
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <AnimatePresence mode="popLayout">
                      {sorted.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-16 text-center text-gray-400 text-sm">
                            لا توجد نتائج مطابقة للبحث
                          </td>
                        </tr>
                      ) : sorted.map((city, idx) => (
                        <motion.tr
                          key={city.cityId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Rank + City */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-gray-800 text-sm">{city.cityNameAr}</span>
                            </div>
                          </td>
                          {/* Region */}
                          <td className="px-3 py-3">
                            <span className="text-xs text-gray-400">{city.regionNameAr}</span>
                          </td>
                          {/* Count */}
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                              <Home className="w-3 h-3" />
                              {city.totalCount}
                            </span>
                          </td>
                          {/* Overall avg */}
                          <td className="px-3 py-3 text-center">
                            <span className="font-extrabold text-sm text-gray-800">
                              {city.overallAvgPpm2 ? fmtK(city.overallAvgPpm2) : "—"}
                            </span>
                          </td>
                          {/* Per-category heatmap cells */}
                          {CATEGORIES.map(cat => {
                            const s = city.categories[cat.key];
                            const val = s?.avgPpm2 ?? null;
                            const bg = heatColor(val, ranges[cat.key].min, ranges[cat.key].max);
                            const fg = heatText(val, ranges[cat.key].min, ranges[cat.key].max);
                            return (
                              <td key={cat.key} className="px-2 py-2">
                                {val ? (
                                  <div
                                    className="rounded-xl px-2.5 py-1.5 text-center text-xs font-bold transition-all"
                                    style={{ background: bg, color: fg }}
                                    title={`${fmtFull(val)} · ${s?.sampleCount} عقارات · وسيط ${fmtFull(s?.medianPpm2 ?? null)}`}
                                  >
                                    {fmtK(val)}
                                    <span className="block text-[9px] font-medium opacity-70">{s?.sampleCount} عقار</span>
                                  </div>
                                ) : (
                                  <div className="text-center text-xs text-gray-300">—</div>
                                )}
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>القيم بالجنيه المصري لكل متر مربع · اضغط على رأس العمود للترتيب</span>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {sorted.length} من {data.cities.length} مدينة
                </span>
              </div>
            </motion.div>

            {/* ── Range Legend ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {CATEGORIES.map(cat => {
                const r = ranges[cat.key];
                const cities2 = (data?.cities ?? []).filter(c => (c.categories[cat.key]?.sampleCount ?? 0) > 0);
                if (!cities2.length) return null;
                const topCity = [...cities2].sort((a, b) => (b.categories[cat.key]?.avgPpm2 ?? 0) - (a.categories[cat.key]?.avgPpm2 ?? 0))[0];
                return (
                  <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: CAT_COLORS[cat.key] + "18" }}>
                        <cat.icon className="w-3.5 h-3.5" style={{ color: CAT_COLORS[cat.key] }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{cat.labelAr}</span>
                    </div>
                    <div className="h-2 rounded-full mb-2" style={{ background: `linear-gradient(to left, rgb(252,165,165), rgb(191,219,254))` }} />
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-3">
                      <span>أقل: {fmtK(r.min)} ج.م</span>
                      <span>أعلى: {fmtK(r.max)} ج.م</span>
                    </div>
                    {topCity && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span>الأعلى: <strong className="text-gray-700">{topCity.cityNameAr}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>

            {/* ── Disclaimer ── */}
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                البيانات محسوبة تلقائيًا من العقارات المعتمدة على المنصة. الأسعار تعكس متوسط سعر المتر المربع للعقارات المُدرجة وليست أسعار البيع الفعلي.
                تُحدَّث المؤشرات بشكل مستمر عند إضافة أو اعتماد عقارات جديدة.
              </span>
            </div>
          </>
        )}
      </div>

      <RealEstateFooter />
    </div>
  );
}
