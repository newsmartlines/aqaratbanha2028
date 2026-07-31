import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users, Building2, CreditCard, Clock, Activity,
  CheckCircle2, XCircle, Eye, Clock3, AlertCircle,
  MapPin, Maximize2, ArrowLeft, TrendingUp, TrendingDown,
  Home, Key, BarChart2, Layers,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { useT, useLanguage, commonDict } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl } from "@/lib/api";
import { type ExtendedProperty } from "@/components/admin/PropertyDetailDrawer";
import toast from "react-hot-toast";

const dict = {
  pageTitle:          { ar: "لوحة تحكم عقارات بنها", en: "Aqarat Banha Dashboard" },
  totalProperties:    { ar: "إجمالي العقارات النشطة", en: "Active Listings" },
  forSale:            { ar: "للبيع", en: "For Sale" },
  forRent:            { ar: "للإيجار", en: "For Rent" },
  totalProviders:     { ar: "الوسطاء العقاريون", en: "Real Estate Agents" },
  activeProviders:    { ar: "الوسطاء النشطون", en: "Active Agents" },
  totalUsers:         { ar: "إجمالي المستخدمين", en: "Total Users" },
  totalRevenue:       { ar: "إجمالي الإيرادات", en: "Total Revenue" },
  pendingApprovals:   { ar: "بانتظار الموافقة", en: "Pending Approvals" },
  revenueOverTime:    { ar: "الإيرادات عبر الوقت", en: "Revenue Over Time" },
  revenueDesc:        { ar: "نمو الإيرادات الشهرية بالجنيه المصري", en: "Monthly revenue growth in EGP" },
  propertyTypes:      { ar: "توزيع أنواع العقارات", en: "Property Type Distribution" },
  propertyTypesDesc:  { ar: "تصنيف العقارات النشطة حسب النوع", en: "Active listings by property type" },
  newListingsMonth:   { ar: "إعلانات عقارية جديدة شهرياً", en: "New Listings per Month" },
  listingSplit:       { ar: "توزيع الإعلانات", en: "Listing Type Split" },
  recentActivity:     { ar: "آخر الأنشطة العقارية", en: "Recent Real Estate Activity" },
  sar:                { ar: "ج.م", en: "EGP" },
  marketPulse:        { ar: "نبض السوق العقاري", en: "Market Pulse" },
  avgSalePrice:       { ar: "متوسط سعر البيع", en: "Avg. Sale Price" },
  avgRentPrice:       { ar: "متوسط الإيجار السنوي", en: "Avg. Annual Rent" },
  listingActivity:    { ar: "معدل النشاط اليومي", en: "Daily Activity Rate" },
  occupancyRate:      { ar: "نسبة الإشغال", en: "Occupancy Rate" },
  act1: { ar: "انضم وسيط عقاري جديد: أحمد محمد",   en: "New agent joined: Ahmed Mohamed" },
  act2: { ar: "تمت الموافقة على شقة في بنها الجديدة", en: "Apartment in New Banha approved" },
  act3: { ar: "تمت معالجة دفعة اشتراك 500 ج.م",     en: "Subscription payment of 500 EGP" },
  act4: { ar: "فيلا للبيع تحتاج مراجعة — الحي الأول", en: "Villa for sale needs review — District 1" },
  act5: { ar: "انتهى صلاحية إعلان عقار #142",        en: "Property listing #142 expired" },
  hoursAgo:  { ar: "منذ ساعتين",  en: "2 hours ago" },
  hoursAgo4: { ar: "منذ 4 ساعات", en: "4 hours ago" },
  hoursAgo5: { ar: "منذ 5 ساعات", en: "5 hours ago" },
  yesterday: { ar: "أمس",         en: "Yesterday" },
  days2:     { ar: "منذ يومين",   en: "2 days ago" },
};

// Real estate property type categories (Arabic labels)
const PROPERTY_TYPES = [
  { key: "شقة",       label: { ar: "شقق",           en: "Apartments" } },
  { key: "فيلا",      label: { ar: "فيلل",           en: "Villas" } },
  { key: "أرض",       label: { ar: "أراضي",          en: "Land" } },
  { key: "محل",       label: { ar: "محلات تجارية",   en: "Commercial" } },
  { key: "مكتب",      label: { ar: "مكاتب",          en: "Offices" } },
  { key: "other",     label: { ar: "أخرى",           en: "Other" } },
];

const PIE_COLORS = ["#0d9488", "#0284c7", "#8b5cf6", "#f59e0b", "#e11d48", "#64748b"];

interface AdminStats {
  totalProviders:   number;
  activeProviders:  number;
  pendingProviders: number;
  totalUsers:       number;
  activeProperties: number;
  propertiesForSale: number;
  propertiesForRent: number;
  pendingProperties: number;
  totalRevenue:     number;
  topCategories:    { category: string; count: number }[];
  monthlyListings:  { month: string; count: number }[];
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
  return `${n.toLocaleString("ar-EG")} ج.م`;
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `منذ ${days} يوم`;
  if (hrs > 0)  return `منذ ${hrs} ساعة`;
  if (mins > 0) return `منذ ${mins} دقيقة`;
  return "الآن";
}

// Arabic month abbreviations
const AR_MONTHS: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو",  "06": "يونيو",  "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر","10": "أكتوبر","11": "نوفمبر","12": "ديسمبر",
};
function fmtMonth(ym: string): string {
  const [, m] = ym.split("-");
  return AR_MONTHS[m] ?? ym;
}

// Stat Card sub-component
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  sub,
  subIcon: SubIcon,
  subColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  sub?: string;
  subIcon?: React.ElementType;
  subColor?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    teal:    { bg: "bg-teal-50",    text: "text-teal-600",    ring: "ring-teal-200" },
    blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-200" },
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-200" },
    purple:  { bg: "bg-purple-50",  text: "text-purple-600",  ring: "ring-purple-200" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-200" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     ring: "ring-sky-200" },
  };
  const c = colorMap[color] ?? colorMap.teal;
  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200 overflow-hidden relative">
      <div className={`absolute top-0 start-0 end-0 h-0.5 ${c.text.replace("text-", "bg-")}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.ring} ring-1 flex items-center justify-center ${c.text} shrink-0`}>
            <Icon size={18} />
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 mb-1 leading-tight">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 leading-none">
          {value}
          {suffix && <span className="text-sm font-normal text-slate-400 ms-1">{suffix}</span>}
        </h3>
        {sub && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${subColor ?? "text-slate-500"}`}>
            {SubIcon && <SubIcon size={11} />}
            <span>{sub}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Market pulse metric
function PulseMetric({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium leading-tight truncate">{label}</p>
        <p className="text-base font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm" dir="rtl">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-600">
          <span className="font-medium" style={{ color: p.color }}>{p.value?.toLocaleString("ar-EG")}</span>
          {p.name === "revenue" ? " ج.م" : " إعلان"}
        </p>
      ))}
    </div>
  );
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

  // Revenue chart data (demo enriched)
  const revenueData = [
    { name: "يناير",  revenue: 4200 },
    { name: "فبراير", revenue: 5800 },
    { name: "مارس",   revenue: 4600 },
    { name: "أبريل",  revenue: 7400 },
    { name: "مايو",   revenue: 6800 },
    { name: "يونيو",  revenue: 9200 },
  ];

  // Monthly listings from API or fallback
  const monthlyData: { name: string; listings: number }[] = (stats?.monthlyListings ?? []).length > 0
    ? (stats!.monthlyListings).map(r => ({ name: fmtMonth(r.month), listings: r.count }))
    : [
        { name: "يناير",  listings: 8 },
        { name: "فبراير", listings: 14 },
        { name: "مارس",   listings: 11 },
        { name: "أبريل",  listings: 19 },
        { name: "مايو",   listings: 17 },
        { name: "يونيو",  listings: 24 },
      ];

  // Property type distribution from API or fallback
  const typeData = (stats?.topCategories ?? []).length > 0
    ? stats!.topCategories.slice(0, 6).map((r, i) => ({
        name: PROPERTY_TYPES.find(p => r.category?.includes(p.key))?.label.ar ?? r.category,
        value: r.count,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [
        { name: "شقق",         value: 42, color: PIE_COLORS[0] },
        { name: "فيلل",        value: 18, color: PIE_COLORS[1] },
        { name: "أراضي",       value: 14, color: PIE_COLORS[2] },
        { name: "تجاري",       value: 10, color: PIE_COLORS[3] },
        { name: "مكاتب",       value: 8,  color: PIE_COLORS[4] },
        { name: "أخرى",        value: 8,  color: PIE_COLORS[5] },
      ];

  const activities = [
    { title: t("act1"), time: t("hoursAgo"),  type: "user" },
    { title: t("act2"), time: t("hoursAgo4"), type: "listing" },
    { title: t("act3"), time: t("hoursAgo5"), type: "payment" },
    { title: t("act4"), time: t("yesterday"), type: "alert" },
    { title: t("act5"), time: t("days2"),     type: "sub" },
  ];

  const totalActive = stats?.activeProperties ?? 0;
  const forSale     = stats?.propertiesForSale ?? 0;
  const forRent     = stats?.propertiesForRent ?? 0;

  const pendingCount =
    (stats?.pendingProviders ?? 0) + (stats?.pendingProperties ?? 0) + pendingProperties.length;

  return (
    <AdminLayout title={t("pageTitle")}>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard
          icon={Home}
          label={t("totalProperties")}
          value={formatNumber(totalActive)}
          color="teal"
          sub={`${formatNumber(forSale)} للبيع · ${formatNumber(forRent)} للإيجار`}
          subIcon={BarChart2}
          subColor="text-teal-600"
        />
        <StatCard
          icon={Clock}
          label={t("pendingApprovals")}
          value={formatNumber(pendingCount)}
          color="amber"
          sub={pendingProperties.length > 0 ? `${pendingProperties.length} إعلان ينتظر` : "لا توجد إعلانات معلقة"}
          subIcon={pendingProperties.length > 0 ? TrendingUp : undefined}
          subColor={pendingProperties.length > 0 ? "text-amber-600" : "text-slate-400"}
        />
        <StatCard
          icon={Building2}
          label={t("totalProviders")}
          value={formatNumber(stats?.totalProviders ?? 0)}
          color="blue"
          sub={`${formatNumber(stats?.activeProviders ?? 0)} نشط`}
          subIcon={Activity}
          subColor="text-blue-600"
        />
        <StatCard
          icon={Users}
          label={t("totalUsers")}
          value={formatNumber(stats?.totalUsers ?? 0)}
          color="indigo"
          sub="مستخدم مسجّل"
          subColor="text-slate-500"
        />
        <StatCard
          icon={CreditCard}
          label={t("totalRevenue")}
          value={formatNumber(Math.round(stats?.totalRevenue ?? 0))}
          suffix={t("sar")}
          color="emerald"
          sub="إجمالي مدفوعات الاشتراكات"
          subIcon={TrendingUp}
          subColor="text-emerald-600"
        />
        <StatCard
          icon={Key}
          label={t("forRent")}
          value={formatNumber(forRent)}
          color="purple"
          sub={`${formatNumber(forSale)} للبيع`}
          subIcon={Home}
          subColor="text-purple-600"
        />
      </div>

      {/* ── Market Pulse Strip ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 rounded-2xl mb-6 overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{t("marketPulse")}</p>
          </div>
        </div>
        <div className="flex flex-wrap divide-x divide-x-reverse divide-white/10">
          <PulseMetric icon={TrendingUp}   color="bg-teal-600"   label={t("avgSalePrice")}   value="850 ألف ج.م" />
          <PulseMetric icon={Home}         color="bg-blue-600"   label={t("avgRentPrice")}    value="24 ألف ج.م" />
          <PulseMetric icon={Activity}     color="bg-emerald-600" label={t("listingActivity")} value={`${formatNumber(totalActive)} إعلان نشط`} />
          <PulseMetric icon={Layers}       color="bg-purple-600"  label={t("occupancyRate")}   value={totalActive > 0 ? `${Math.round((forRent / (totalActive || 1)) * 100)}% إيجار` : "—"} />
        </div>
      </div>

      {/* ── Pending Properties ── */}
      {(pendingLoading || pendingProperties.length > 0) && (
        <div className="mb-8" dir="rtl">
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
                  {pendingLoading ? "جارٍ التحميل..." : `${pendingProperties.length} إعلان عقاري ينتظر المراجعة`}
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
                const imgSrc  = getFirstImage(prop.images);
                const price   = fmtPrice(prop.price);
                const location = [prop.district, prop.city].filter(Boolean).join("، ");
                return (
                  <div
                    key={prop.id}
                    onClick={() => navigate(`/property/${prop.id}?admin=1`)}
                    className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group overflow-hidden flex flex-col"
                  >
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
                      {prop.listingType && (
                        <span className="absolute top-2 right-2 text-[11px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                          {prop.listingType === "sale" ? "للبيع" : prop.listingType === "rent" ? "للإيجار" : prop.listingType}
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        قيد المراجعة
                      </span>
                    </div>
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

      {/* ── Charts Row 1: Revenue + Property Type ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Revenue Area Chart */}
        <Card className="border-slate-200 lg:col-span-2 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("revenueOverTime")}</CardTitle>
            <CardDescription className="text-xs">{t("revenueDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-4} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Property Type Donut */}
        <Card className="border-slate-200 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("propertyTypes")}</CardTitle>
            <CardDescription className="text-xs">{t("propertyTypesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} عقار`, name]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={48}
                    formatter={(value) => <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Monthly Listings + Sale/Rent Split + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* New Listings Bar Chart */}
        <Card className="border-slate-200 hover:shadow-sm transition-shadow lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("newListingsMonth")}</CardTitle>
            <CardDescription className="text-xs">عدد العقارات المُضافة خلال الأشهر الستة الماضية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(v: number) => [`${v} إعلان`, "الإعلانات"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="listings" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? "#0d9488" : "#e2e8f0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Listing Type Split */}
        <Card className="border-slate-200 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("listingSplit")}</CardTitle>
            <CardDescription className="text-xs">بيع مقابل إيجار</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Big numbers */}
            <div className="grid grid-cols-2 gap-3 mb-5 mt-2">
              <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
                <Home className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-teal-700">{formatNumber(forSale)}</p>
                <p className="text-[11px] text-teal-600 font-medium mt-0.5">للبيع</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                <Key className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{formatNumber(forRent)}</p>
                <p className="text-[11px] text-blue-600 font-medium mt-0.5">للإيجار</p>
              </div>
            </div>
            {/* Progress bars */}
            {totalActive > 0 && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>للبيع</span>
                    <span>{Math.round((forSale / totalActive) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-700" style={{ width: `${(forSale / totalActive) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>للإيجار</span>
                    <span>{Math.round((forRent / totalActive) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${(forRent / totalActive) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Agent Growth + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agent Growth Chart */}
        <Card className="border-slate-200 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">نمو الوسطاء العقاريين شهرياً</CardTitle>
            <CardDescription className="text-xs">وسطاء جدد انضموا للمنصة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: "يناير", agents: 4 },
                    { name: "فبراير", agents: 7 },
                    { name: "مارس", agents: 5 },
                    { name: "أبريل", agents: 10 },
                    { name: "مايو", agents: 8 },
                    { name: "يونيو", agents: 13 },
                  ]}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} وسيط`, "وسطاء جدد"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="agents" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, i) => (
                <div key={i} className="flex gap-3.5 items-start">
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                    activity.type === "user"    ? "bg-blue-500" :
                    activity.type === "listing" ? "bg-teal-500" :
                    activity.type === "payment" ? "bg-emerald-500" :
                    activity.type === "alert"   ? "bg-amber-500" : "bg-purple-500"
                  }`}>
                    {activity.type === "user"    ? <Users size={12} /> :
                     activity.type === "listing" ? <Home size={12} /> :
                     activity.type === "payment" ? <CreditCard size={12} /> :
                     activity.type === "alert"   ? <AlertCircle size={12} /> : <Activity size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{activity.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
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
