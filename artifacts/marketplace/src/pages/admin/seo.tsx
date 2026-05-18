import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Globe, FileText, BarChart2, AlertTriangle, CheckCircle2,
  RefreshCw, Download, Plus, Trash2, Edit2, ExternalLink, Zap,
  TrendingUp, Link2, Image, Settings, Shield, Activity,
  ChevronRight, Info, Star, Eye, ArrowUpRight, ArrowDownRight,
  Code2, Bot, Sparkles, Target, Hash, Share2, Map, X, Save,
  Clock, Gauge,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─── Mock Data ─── */
const SEO_SCORE_DATA = [
  { month: "يناير", score: 54 }, { month: "فبراير", score: 61 },
  { month: "مارس",  score: 67 }, { month: "أبريل",  score: 70 },
  { month: "مايو",  score: 76 }, { month: "يونيو",  score: 82 },
];
const TRAFFIC_DATA = [
  { day: "السبت",   visits: 1240 }, { day: "الأحد",   visits: 1820 },
  { day: "الاثنين", visits: 2100 }, { day: "الثلاثاء",visits: 1750 },
  { day: "الأربعاء",visits: 2400 }, { day: "الخميس",  visits: 2800 },
  { day: "الجمعة",  visits: 2100 },
];
const KEYWORDS_DATA = [
  { kw: "عقارات القاهرة",     pos: 3,  vol: 12400, change: "up" },
  { kw: "شقق للإيجار الإسكندرية",  pos: 7,  vol: 8900,  change: "up" },
  { kw: "فيلا للبيع الدمام", pos: 12, vol: 5300,  change: "down" },
  { kw: "أراضي مكة",        pos: 18, vol: 3200,  change: "same" },
  { kw: "مكاتب تجارية",     pos: 5,  vol: 4100,  change: "up" },
];
const PROPERTIES_SEO = [
  { id: 1, title: "فيلا فاخرة — حي النرجس",  score: 92, city: "القاهرة",  issues: 0,  indexed: true  },
  { id: 2, title: "شقة 3 غرف — حي الزهراء",  score: 71, city: "الإسكندرية",     issues: 2,  indexed: true  },
  { id: 3, title: "مكتب للإيجار — العليا",   score: 45, city: "القاهرة",  issues: 4,  indexed: false },
  { id: 4, title: "أرض 500م — طريق الملك",   score: 38, city: "الدمام",  issues: 5,  indexed: true  },
  { id: 5, title: "دوبلكس — حي السلام",      score: 88, city: "الإسكندرية",     issues: 1,  indexed: true  },
  { id: 6, title: "شقة استوديو — وسط البلد", score: 29, city: "مكة",     issues: 6,  indexed: false },
];
const BROKEN_LINKS = [
  { url: "/property/old-123", status: 404, found: "قبل يومين",   source: "صفحة البحث" },
  { url: "/api/image/thumb-78", status: 500, found: "قبل ساعة",  source: "صفحة العقار" },
  { url: "/provider/deleted-5", status: 404, found: "قبل أسبوع", source: "الخريطة" },
];
const REDIRECTS_INIT = [
  { from: "/old-properties", to: "/properties", type: "301" },
  { from: "/realestate",     to: "/home2",       type: "301" },
];

const TOP_PAGES = [
  { page: "/properties",      views: 12400, change: 18 },
  { page: "/home2",           views: 8200,  change: 34 },
  { page: "/property/1",      views: 5100,  change: -8 },
  { page: "/search",          views: 4300,  change: 12 },
  { page: "/categories",      views: 2800,  change: 5  },
];

const ROBOTS_DEFAULT = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /user/

Sitemap: https://daleel.sa/sitemap.xml`;

const SCHEMA_TYPES = [
  { value: "property",      label: "عقار (RealEstateListing)" },
  { value: "organization",  label: "مؤسسة (Organization)" },
  { value: "breadcrumb",    label: "مسار التنقل (Breadcrumb)" },
  { value: "faq",           label: "أسئلة شائعة (FAQ)" },
  { value: "localBusiness",label: "نشاط محلي (LocalBusiness)" },
];

/* ─── Score color ─── */
function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600";
  if (s >= 50) return "text-amber-500";
  return "text-rose-500";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-emerald-500";
  if (s >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

/* ─── Gauge arc for score ─── */
function ScoreRing({ score }: { score: number }) {
  const r = 34; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="-rotate-90">
      <circle cx={40} cy={40} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={40} y={40} textAnchor="middle" dominantBaseline="central"
        className="rotate-90" transform="rotate(90,40,40)"
        fontSize={16} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

/* ─── Google SERP Preview ─── */
function SerpPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white max-w-lg">
      <p className="text-xs text-gray-500 mb-0.5">{url}</p>
      <p className="text-[#1a0dab] text-lg font-medium hover:underline cursor-pointer leading-snug">{title || "عنوان الصفحة يظهر هنا..."}</p>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{description || "وصف الصفحة الذي يظهر في نتائج البحث سيظهر هنا. تأكد أن يكون وصفًا واضحًا وجذابًا."}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function AdminSeo() {
  const { toast } = useToast();
  const [tab, setTab] = useState("dashboard");

  /* General SEO state */
  const [siteTitle,    setSiteTitle]    = useState("عقارات بنها العقارات | أفضل عقارات مصر");
  const [siteDesc,     setSiteDesc]     = useState("منصة عقارات بنها لبيع وشراء وإيجار العقارات في جميع مدن جمهورية مصر العربية.");
  const [canonical,    setCanonical]    = useState("https://daleel.sa");
  const [indexAll,     setIndexAll]     = useState(true);
  const [ogTitle,      setOgTitle]      = useState("عقارات بنها العقارات");
  const [ogDesc,       setOgDesc]       = useState("اعثر على عقارك المثالي مع عقارات بنها");
  const [twitterCard,  setTwitterCard]  = useState("summary_large_image");
  const [gaId,         setGaId]         = useState("G-XXXXXXXXXX");

  /* Robots.txt */
  const [robotsTxt,    setRobotsTxt]    = useState(ROBOTS_DEFAULT);

  /* Redirects */
  const [redirects,    setRedirects]    = useState(REDIRECTS_INIT);
  const [newFrom,      setNewFrom]      = useState("");
  const [newTo,        setNewTo]        = useState("");
  const [newType,      setNewType]      = useState("301");

  /* Schema */
  const [schemaType,   setSchemaType]   = useState("property");

  /* AI Generator */
  const [aiInput,      setAiInput]      = useState("");
  const [aiResult,     setAiResult]     = useState<null | { title: string; desc: string; keywords: string }>(null);
  const [aiLoading,    setAiLoading]    = useState(false);

  /* Property SEO edit modal */
  const [editProp,     setEditProp]     = useState<null | typeof PROPERTIES_SEO[0]>(null);
  const [editTitle,    setEditTitle]    = useState("");
  const [editDesc,     setEditDesc]     = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  const save = (msg = "تم الحفظ بنجاح ✓") =>
    toast({ title: "تم الحفظ", description: msg });

  /* Simulate AI generation */
  const runAI = () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiResult({
        title:    `${aiInput} | عقارات بنها العقارات`,
        desc:     `اكتشف أفضل ${aiInput} في جمهورية مصر العربية مع عقارات بنها. أسعار تنافسية، موقع متميز، ومزايا حصرية لا تفوّت. تواصل معنا الآن.`,
        keywords: `${aiInput}، عقارات مصر، عقارات بنها، بيع وشراء، إيجار`,
      });
      setAiLoading(false);
    }, 1800);
  };

  const addRedirect = () => {
    if (!newFrom || !newTo) return;
    setRedirects(p => [...p, { from: newFrom, to: newTo, type: newType }]);
    setNewFrom(""); setNewTo("");
    toast({ title: "تمت الإضافة", description: `إعادة توجيه ${newType} من ${newFrom}` });
  };

  const generateSchema = () => {
    const schemas: Record<string, object> = {
      property: {
        "@context": "https://schema.org", "@type": "RealEstateListing",
        name: "فيلا فاخرة — حي النرجس",
        description: "فيلا فاخرة 5 غرف واسعة مع مسبح",
        url: "https://daleel.sa/property/1",
        price: "2,500,000", priceCurrency: "EGP",
        address: { "@type": "PostalAddress", addressLocality: "القاهرة", addressCountry: "SA" },
        numberOfRooms: 5, floorSize: { "@type": "QuantitativeValue", value: 450, unitCode: "MTK" },
      },
      organization: {
        "@context": "https://schema.org", "@type": "Organization",
        name: "عقارات بنها", url: "https://daleel.sa",
        logo: "https://daleel.sa/logo.png",
        contactPoint: { "@type": "ContactPoint", telephone: "+20-xx-xxx-xxxx", contactType: "customer service" },
      },
      breadcrumb: {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://daleel.sa" },
          { "@type": "ListItem", position: 2, name: "العقارات", item: "https://daleel.sa/properties" },
        ],
      },
      faq: {
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "كيف أبحث عن عقار؟", acceptedAnswer: { "@type": "Answer", text: "استخدم خانة البحث في الصفحة الرئيسية..." } },
        ],
      },
      localBusiness: {
        "@context": "https://schema.org", "@type": "RealEstateAgent",
        name: "عقارات بنها", address: { "@type": "PostalAddress", addressCountry: "SA" },
        openingHours: "Mo-Sa 09:00-18:00",
      },
    };
    return JSON.stringify(schemas[schemaType] ?? schemas.property, null, 2);
  };

  const totalScore = Math.round(PROPERTIES_SEO.reduce((s, p) => s + p.score, 0) / PROPERTIES_SEO.length);

  return (
    <AdminLayout>
      <div dir="rtl" className="p-5 max-w-[1400px] mx-auto space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" /> إدارة السيو — SEO Management
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">تحكم شامل في تحسين محركات البحث لمنصة عقارات بنها</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border gap-1 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> SEO Score: {totalScore}/100
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> تحديث الفحص
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => save()}>
              <Save className="w-4 h-4" /> حفظ الكل
            </Button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { icon: Globe,         label: "صفحات مؤرشفة",    value: "1,248",  sub: "+12 هذا الأسبوع",  color: "text-blue-600",    bg: "bg-blue-50" },
            { icon: AlertTriangle, label: "بدون SEO",         value: "37",     sub: "عقار يحتاج تحسين", color: "text-amber-600",   bg: "bg-amber-50" },
            { icon: Activity,      label: "مشاكل SEO",        value: "18",     sub: "خطأ حرج: 3",       color: "text-rose-600",    bg: "bg-rose-50" },
            { icon: Gauge,         label: "سرعة الموقع",      value: "91",     sub: "من 100 — ممتاز",   color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: TrendingUp,    label: "زيارات هذا الشهر", value: "48,320", sub: "+23% عن الشهر",    color: "text-purple-600",  bg: "bg-purple-50" },
            { icon: Link2,         label: "روابط معطوبة",     value: "3",      sub: "تحتاج إصلاح",      color: "text-orange-600",  bg: "bg-orange-50" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Core Web Vitals ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "LCP",  value: "1.8s",   desc: "Largest Contentful Paint",  good: true  },
            { label: "FID",  value: "12ms",   desc: "First Input Delay",          good: true  },
            { label: "CLS",  value: "0.08",   desc: "Cumulative Layout Shift",    good: true  },
            { label: "TTFB", value: "320ms",  desc: "Time to First Byte",         good: false },
          ].map(v => (
            <Card key={v.label} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${v.good ? "bg-emerald-500" : "bg-amber-400"}`} />
                <div>
                  <p className="font-extrabold text-slate-800 text-sm">{v.label} — <span className={v.good ? "text-emerald-600" : "text-amber-600"}>{v.value}</span></p>
                  <p className="text-[10px] text-slate-400">{v.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main tabs ── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl mb-1">
            {[
              { value: "dashboard",  label: "لوحة البيانات",   icon: BarChart2  },
              { value: "general",    label: "SEO عام",          icon: Globe      },
              { value: "properties", label: "SEO العقارات",     icon: Building2  },
              { value: "sitemap",    label: "Sitemap",          icon: Map        },
              { value: "robots",     label: "Robots.txt",       icon: Shield     },
              { value: "schema",     label: "Schema Generator", icon: Code2      },
              { value: "redirects",  label: "إعادة التوجيه",   icon: Share2     },
              { value: "broken",     label: "روابط معطوبة",    icon: AlertTriangle },
              { value: "ai",         label: "AI Generator",     icon: Bot        },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="flex items-center gap-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-3 py-2">
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ════════════ TAB: DASHBOARD ════════════ */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* SEO score trend */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">تطور SEO Score</CardTitle>
                  <CardDescription>متوسط نقاط السيو لجميع العقارات</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={SEO_SCORE_DATA}>
                      <defs>
                        <linearGradient id="seoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#14b8a6" fill="url(#seoGrad)" strokeWidth={2.5} name="النقاط" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Overall score ring */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">النقاط الإجمالية</CardTitle>
                  <CardDescription>متوسط كل العقارات</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <ScoreRing score={totalScore} />
                  <div className="w-full space-y-2">
                    {[
                      { label: "Meta Tags",    v: 88 },
                      { label: "محتوى",        v: 72 },
                      { label: "سرعة",         v: 91 },
                      { label: "روابط داخلية", v: 65 },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-slate-500 shrink-0">{r.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${scoreBg(r.v)}`} style={{ width: `${r.v}%` }} />
                        </div>
                        <span className={`font-bold w-8 text-right ${scoreColor(r.v)}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Traffic chart */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">الزيارات الأسبوعية من البحث العضوي</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={TRAFFIC_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#14b8a6" radius={[4, 4, 0, 0]} name="الزيارات" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top pages */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">الصفحات الأكثر زيارة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {TOP_PAGES.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <span className="flex-1 truncate font-mono text-slate-600">{p.page}</span>
                      <span className="font-bold text-slate-800">{p.views.toLocaleString()}</span>
                      <span className={`flex items-center gap-0.5 font-bold ${p.change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {p.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(p.change)}%
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Keyword rankings */}
              <Card className="lg:col-span-3 border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Hash className="w-4 h-4 text-primary" />ترتيب الكلمات المفتاحية</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-right py-2 font-semibold text-slate-500 text-xs">الكلمة المفتاحية</th>
                        <th className="text-center py-2 font-semibold text-slate-500 text-xs">الترتيب</th>
                        <th className="text-center py-2 font-semibold text-slate-500 text-xs">الحجم الشهري</th>
                        <th className="text-center py-2 font-semibold text-slate-500 text-xs">التغيير</th>
                      </tr>
                    </thead>
                    <tbody>
                      {KEYWORDS_DATA.map((k, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 font-medium text-slate-800">{k.kw}</td>
                          <td className="py-2.5 text-center">
                            <Badge className={`text-xs ${k.pos <= 5 ? "bg-emerald-100 text-emerald-700" : k.pos <= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>#{k.pos}</Badge>
                          </td>
                          <td className="py-2.5 text-center text-slate-600 font-mono text-xs">{k.vol.toLocaleString()}</td>
                          <td className="py-2.5 text-center">
                            {k.change === "up"   && <span className="text-emerald-600 font-bold flex items-center justify-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" />ارتفع</span>}
                            {k.change === "down" && <span className="text-rose-600 font-bold flex items-center justify-center gap-0.5"><ArrowDownRight className="w-3.5 h-3.5" />انخفض</span>}
                            {k.change === "same" && <span className="text-slate-400 font-bold">ثابت</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════ TAB: GENERAL SEO ════════════ */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Meta settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />إعدادات Meta الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Site Title (العنوان الرئيسي)</Label>
                    <Input value={siteTitle} onChange={e => setSiteTitle(e.target.value)} />
                    <p className="text-xs text-slate-400 mt-1">{siteTitle.length}/60 حرف</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Meta Description (وصف الموقع)</Label>
                    <Textarea value={siteDesc} onChange={e => setSiteDesc(e.target.value)} rows={3} />
                    <p className="text-xs text-slate-400 mt-1">{siteDesc.length}/160 حرف</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Canonical URL</Label>
                    <Input value={canonical} onChange={e => setCanonical(e.target.value)} dir="ltr" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">فهرسة جميع الصفحات</p>
                      <p className="text-xs text-slate-500">Index all pages by default</p>
                    </div>
                    <Switch checked={indexAll} onCheckedChange={setIndexAll} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">Google Analytics ID</Label>
                    <Input value={gaId} onChange={e => setGaId(e.target.value)} dir="ltr" placeholder="G-XXXXXXXXXX" />
                  </div>
                  <Button onClick={() => save("تم حفظ إعدادات Meta")} className="w-full gap-1.5">
                    <Save className="w-4 h-4" /> حفظ الإعدادات
                  </Button>
                </CardContent>
              </Card>

              {/* Open Graph + Twitter */}
              <div className="space-y-5">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-blue-500" />Open Graph & Social</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">OG Title</Label>
                      <Input value={ogTitle} onChange={e => setOgTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">OG Description</Label>
                      <Textarea value={ogDesc} onChange={e => setOgDesc(e.target.value)} rows={2} />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Twitter Card Type</Label>
                      <select
                        value={twitterCard}
                        onChange={e => setTwitterCard(e.target.value)}
                        className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none"
                      >
                        <option value="summary">summary</option>
                        <option value="summary_large_image">summary_large_image</option>
                        <option value="app">app</option>
                      </select>
                    </div>
                    <Button variant="outline" onClick={() => save("تم حفظ إعدادات السوشيال")} className="w-full">حفظ</Button>
                  </CardContent>
                </Card>

                {/* SERP Preview */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-green-500" />معاينة Google SERP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SerpPreview title={siteTitle} description={siteDesc} url={canonical + "/properties"} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ════════════ TAB: PROPERTY SEO ════════════ */}
          <TabsContent value="properties">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">SEO كل عقار</CardTitle>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
                    {PROPERTIES_SEO.filter(p => p.score < 50).length} عقارات تحتاج تحسين
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">العقار</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">المدينة</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">SEO Score</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">الفهرسة</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">المشاكل</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROPERTIES_SEO.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-medium text-slate-800 max-w-[220px] truncate">{p.title}</td>
                        <td className="py-3 text-center text-slate-600 text-xs">{p.city}</td>
                        <td className="py-3 text-center">
                          <span className={`font-extrabold text-base ${scoreColor(p.score)}`}>{p.score}</span>
                          <div className="mx-auto mt-1 w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBg(p.score)}`} style={{ width: `${p.score}%` }} />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          {p.indexed
                            ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">مفهرس</Badge>
                            : <Badge className="bg-slate-100 text-slate-500 text-[10px]">NoIndex</Badge>}
                        </td>
                        <td className="py-3 text-center">
                          {p.issues > 0
                            ? <Badge className="bg-rose-100 text-rose-600 text-[10px]">{p.issues} مشاكل</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✓ بدون مشاكل</Badge>}
                        </td>
                        <td className="py-3 text-center">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { setEditProp(p); setEditTitle(p.title + " — عقارات بنها"); setEditDesc(""); setEditKeywords(""); }}>
                            <Edit2 className="w-3 h-3" /> تحرير
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Edit property SEO modal */}
            {editProp && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditProp(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="font-extrabold text-lg text-slate-800">تحرير SEO — {editProp.title}</h3>
                    <button onClick={() => setEditProp(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <ScoreRing score={editProp.score} />
                      <div>
                        <p className="font-bold text-slate-800">SEO Score: <span className={scoreColor(editProp.score)}>{editProp.score}/100</span></p>
                        <p className="text-xs text-slate-500">{editProp.issues} مشاكل محددة</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Meta Title</Label>
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                      <p className="text-xs text-slate-400 mt-1">{editTitle.length}/60 حرف</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Meta Description</Label>
                      <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="أدخل وصفًا محسّنًا لهذا العقار..." />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Focus Keywords</Label>
                      <Input value={editKeywords} onChange={e => setEditKeywords(e.target.value)} placeholder="مثال: فيلا القاهرة، عقار للبيع" />
                    </div>
                    {/* SERP Preview */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">معاينة Google:</p>
                      <SerpPreview title={editTitle} description={editDesc || "وصف العقار..."} url={`https://daleel.sa/property/${editProp.id}`} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button className="flex-1" onClick={() => { save(`تم حفظ SEO لـ ${editProp.title}`); setEditProp(null); }}>
                        <Save className="w-4 h-4 me-2" /> حفظ
                      </Button>
                      <Button variant="outline" onClick={() => setEditProp(null)}>إلغاء</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ════════════ TAB: SITEMAP ════════════ */}
          <TabsContent value="sitemap">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Map className="w-4 h-4 text-primary" />إعدادات Sitemap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "تضمين صفحات العقارات",    checked: true  },
                    { label: "تضمين صفحات الفئات",      checked: true  },
                    { label: "تضمين صفحات المزودين",    checked: true  },
                    { label: "تضمين صفحات البحث",       checked: false },
                    { label: "تحديث تلقائي عند إضافة عقار", checked: true },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <Label className="font-medium text-sm text-slate-700 cursor-pointer">{s.label}</Label>
                      <Switch defaultChecked={s.checked} />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => save("تم توليد الـ Sitemap بنجاح")} className="flex-1 gap-1.5">
                      <RefreshCw className="w-4 h-4" /> توليد الآن
                    </Button>
                    <Button variant="outline" className="gap-1.5">
                      <Download className="w-4 h-4" /> تحميل
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">معاينة sitemap.xml</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-auto max-h-72 leading-relaxed">
                    <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>https://daleel.sa/</loc>
    <lastmod>2026-05-17</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://daleel.sa/properties</loc>
    <lastmod>2026-05-17</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://daleel.sa/property/1</loc>
    <lastmod>2026-05-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- +1,245 عنوان آخر -->

</urlset>`}</pre>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" /> فتح الملف
                      </Button>
                    </a>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border self-center">
                      آخر تحديث: اليوم
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════ TAB: ROBOTS.TXT ════════════ */}
          <TabsContent value="robots">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />تحرير robots.txt</CardTitle>
                  <CardDescription>يتحكم في ما يسمح لمحركات البحث بفهرسته</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-900 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <span className="text-xs text-slate-400 font-mono">robots.txt</span>
                      <Badge className="bg-slate-700 text-slate-300 text-[10px]">قابل للتعديل</Badge>
                    </div>
                    <Textarea
                      value={robotsTxt}
                      onChange={e => setRobotsTxt(e.target.value)}
                      rows={14}
                      className="bg-slate-900 text-green-400 font-mono text-sm border-0 resize-none focus:ring-0 rounded-none"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => save("تم حفظ robots.txt")} className="gap-1.5">
                      <Save className="w-4 h-4" /> حفظ
                    </Button>
                    <Button variant="outline" onClick={() => setRobotsTxt(ROBOTS_DEFAULT)} className="gap-1.5">
                      <RotateCcw className="w-4 h-4" /> استعادة الافتراضي
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">نصائح سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  {[
                    { title: "User-agent: *",   desc: "ينطبق على جميع الروبوتات" },
                    { title: "Disallow: /admin",desc: "يمنع فهرسة لوحة التحكم" },
                    { title: "Allow: /",        desc: "يسمح بفهرسة جميع الصفحات العامة" },
                    { title: "Sitemap: URL",    desc: "يرشد محركات البحث للخريطة" },
                  ].map(t => (
                    <div key={t.title} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="font-mono font-bold text-primary text-xs">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════ TAB: SCHEMA ════════════ */}
          <TabsContent value="schema">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="border-0 shadow-sm h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Code2 className="w-4 h-4 text-primary" />نوع Schema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {SCHEMA_TYPES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSchemaType(s.value)}
                      className={`w-full text-right px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${schemaType === s.value ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-slate-600 hover:border-primary/30"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <Button onClick={() => save("تم نسخ الـ Schema")} className="w-full mt-3 gap-1.5" variant="outline">
                    <Download className="w-4 h-4" /> نسخ الكود
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">كود JSON-LD المولَّد</CardTitle>
                  <CardDescription>أضف هذا الكود في &lt;head&gt; صفحة العقار</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-blue-300 overflow-auto max-h-96 leading-relaxed">
                    <pre>{`<script type="application/ld+json">\n${generateSchema()}\n</script>`}</pre>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
                    <Info className="w-3.5 h-3.5 inline me-1" />
                    هذا الكود يُضاف تلقائيًا لكل صفحة عقار عند النشر. لا حاجة لإضافته يدويًا.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════ TAB: REDIRECTS ════════════ */}
          <TabsContent value="redirects">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" />إدارة إعادة التوجيه</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add redirect */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="sm:col-span-1">
                    <Label className="text-xs font-semibold mb-1 block text-slate-500">النوع</Label>
                    <select value={newType} onChange={e => setNewType(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none">
                      <option value="301">301 — دائم</option>
                      <option value="302">302 — مؤقت</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-500">من (المسار القديم)</Label>
                    <Input value={newFrom} onChange={e => setNewFrom(e.target.value)} placeholder="/old-page" dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-500">إلى (المسار الجديد)</Label>
                    <Input value={newTo} onChange={e => setNewTo(e.target.value)} placeholder="/new-page" dir="ltr" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addRedirect} className="w-full gap-1.5">
                      <Plus className="w-4 h-4" /> إضافة
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">النوع</th>
                      <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">المسار القديم</th>
                      <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">المسار الجديد</th>
                      <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redirects.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3">
                          <Badge className={r.type === "301" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                            {r.type}
                          </Badge>
                        </td>
                        <td className="py-3 font-mono text-slate-700 text-xs">{r.from}</td>
                        <td className="py-3 font-mono text-slate-700 text-xs">{r.to}</td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => setRedirects(p => p.filter((_, j) => j !== i))}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center mx-auto transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════ TAB: BROKEN LINKS ════════════ */}
          <TabsContent value="broken">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />الروابط المعطوبة
                  </CardTitle>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => save("جاري فحص الروابط...")}>
                    <RefreshCw className="w-4 h-4" /> فحص الآن
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {BROKEN_LINKS.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                    <p className="font-bold text-emerald-600">ممتاز! لا توجد روابط معطوبة</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">الرابط</th>
                        <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">الخطأ</th>
                        <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">المصدر</th>
                        <th className="text-right py-2.5 font-semibold text-slate-500 text-xs">الاكتشاف</th>
                        <th className="text-center py-2.5 font-semibold text-slate-500 text-xs">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BROKEN_LINKS.map((l, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-mono text-slate-700 text-xs max-w-[180px] truncate">{l.url}</td>
                          <td className="py-3 text-center">
                            <Badge className={l.status === 404 ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-600"}>
                              {l.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-600 text-xs">{l.source}</td>
                          <td className="py-3 text-slate-400 text-xs">{l.found}</td>
                          <td className="py-3 text-center">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                              <Link2 className="w-3 h-3" /> إصلاح
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════ TAB: AI GENERATOR ════════════ */}
          <TabsContent value="ai">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-500" />
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    مولّد SEO بالذكاء الاصطناعي
                  </CardTitle>
                  <CardDescription>أدخل معلومات العقار وسيولّد النظام SEO احترافي تلقائيًا</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">وصف العقار أو المحتوى</Label>
                    <Textarea
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      rows={5}
                      placeholder="مثال: فيلا 5 غرف بحي النرجس بالقاهرة للبيع بسعر 2.5 مليون، مسبح خاص، مصعد، حديقة واسعة..."
                    />
                  </div>
                  <Button
                    onClick={runAI}
                    disabled={aiLoading || !aiInput.trim()}
                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {aiLoading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> جاري التوليد...</>
                      : <><Sparkles className="w-4 h-4" /> توليد SEO احترافي</>}
                  </Button>

                  {aiResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 mb-1">Meta Title:</p>
                        <p className="text-sm text-slate-800 font-medium">{aiResult.title}</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                        <p className="text-xs font-bold text-indigo-600 mb-1">Meta Description:</p>
                        <p className="text-sm text-slate-700">{aiResult.desc}</p>
                      </div>
                      <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                        <p className="text-xs font-bold text-teal-600 mb-1">Keywords:</p>
                        <p className="text-sm text-slate-700 font-mono">{aiResult.keywords}</p>
                      </div>
                      <Button variant="outline" className="w-full gap-1.5" onClick={() => save("تم نسخ النتائج!")}>
                        <Download className="w-4 h-4" /> نسخ النتائج وتطبيقها
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* AI tips */}
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />نصائح SEO تلقائية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {[
                      { type: "error",   msg: "3 عقارات بدون Meta Description — يؤثر سلبًا على الظهور" },
                      { type: "warning", msg: "6 صور بدون ALT Text — أضف وصفًا لتحسين فهرسة الصور" },
                      { type: "warning", msg: "صفحة البحث بدون Canonical URL — قد تسبب محتوى مكرر" },
                      { type: "success", msg: "الـ Sitemap محدّث ويتضمن جميع العقارات المنشورة" },
                      { type: "success", msg: "Schema JSON-LD مفعّل على جميع صفحات العقارات" },
                      { type: "info",    msg: "يُنصح بإضافة Breadcrumb Schema لتحسين SERP Appearance" },
                    ].map((t, i) => (
                      <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-sm border ${
                        t.type === "error"   ? "bg-rose-50 border-rose-200 text-rose-800" :
                        t.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
                        t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                        "bg-blue-50 border-blue-200 text-blue-800"
                      }`}>
                        {t.type === "error"   && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                        {t.type === "warning" && <Info          className="w-4 h-4 shrink-0 mt-0.5" />}
                        {t.type === "success" && <CheckCircle2  className="w-4 h-4 shrink-0 mt-0.5" />}
                        {t.type === "info"    && <Zap           className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{t.msg}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                  <CardContent className="pt-5 pb-5">
                    <p className="font-extrabold text-lg mb-1 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />الإجراءات الموصى بها
                    </p>
                    <p className="text-white/70 text-sm mb-4">لتحقيق SEO Score فوق 90</p>
                    {[
                      "إضافة Meta Description لـ 3 عقارات",
                      "إصلاح 3 روابط معطوبة",
                      "إضافة ALT Text لـ 6 صور",
                      "إضافة Canonical URL لصفحة البحث",
                    ].map((action, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-2 border-b border-white/10 last:border-0">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm text-white/80">{action}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/30 me-auto rotate-180" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}

// re-export a named Building2 alias used inside
import { Building2 } from "lucide-react";
function RotateCcw(p: React.SVGProps<SVGSVGElement>) { return <RefreshCw {...p} />; }
