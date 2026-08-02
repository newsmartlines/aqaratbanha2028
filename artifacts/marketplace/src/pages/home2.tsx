import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import {
  Search, MapPin, BedDouble, Bath, Maximize2,
  ArrowLeft, Phone, ChevronLeft, ChevronRight,
  Star, Waves, Building2, Trees, TrendingUp,
} from "lucide-react";

/* ─────────────────────────── helpers ──────────────────────────── */
const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80";

function parseImages(raw: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(raw ?? "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function fmtPrice(raw: string | number | null | undefined): string {
  const n = Number(raw);
  if (!n) return "السعر عند التواصل";
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + " مليون ج.م";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ألف ج.م";
  return n.toLocaleString("en-US") + " ج.م";
}

/* ─────────────────────────── types ────────────────────────────── */
interface Prop {
  id: number;
  title: string;
  price?: string | null;
  listingType?: string | null;
  mainCategory?: string | null;
  subCategory?: string | null;
  district?: string | null;
  address?: string | null;
  images?: string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  area?: string | null;
  featured?: boolean;
  agentName?: string | null;
  verified?: boolean;
}

/* ══════════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════════ */
function Hero() {
  const [, nav] = useLocation();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"sale" | "rent">("sale");

  function doSearch() {
    const q = new URLSearchParams();
    if (query.trim()) q.set("q", query.trim());
    q.set("listingType", type);
    nav(`/properties?${q}`);
  }

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=90"
          alt="الإسكندرية"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=90";
          }}
        />
        {/* Deep navy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/80 via-[#0a1628]/60 to-[#0a1628]/90" />
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Animated sea wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-full h-24 text-white"
          fill="currentColor"
        >
          <path d="M0,60 C150,100 350,0 600,60 C850,120 1050,20 1200,60 L1200,120 L0,120 Z" opacity="0.15" />
          <path d="M0,80 C200,40 400,100 600,80 C800,60 1000,100 1200,80 L1200,120 L0,120 Z" opacity="0.2" />
          <path d="M0,100 C300,70 600,110 900,90 C1050,80 1150,100 1200,100 L1200,120 L0,120 Z" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pt-24 pb-32">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[#c9a84c] text-sm font-semibold px-5 py-2 rounded-full backdrop-blur-sm">
            <Waves className="w-4 h-4" />
            منصة عقارات الإسكندرية البحرية
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center text-white font-extrabold text-5xl md:text-7xl leading-tight mb-4"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          اكتشف{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(135deg, #c9a84c 0%, #f5d68a 50%, #c9a84c 100%)",
            }}
          >
            عقارك المثالي
          </span>
          <br />
          في الإسكندرية
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-white/70 text-xl mb-12 max-w-xl mx-auto"
        >
          بحراً، ومدينةً، وتاريخاً — ابحث بين آلاف العقارات الإسكندرانية
        </motion.p>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          {/* Tabs */}
          <div className="flex justify-center gap-1 mb-4">
            {(["sale", "rent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                  type === t
                    ? "text-[#0a1628]"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
                style={
                  type === t
                    ? {
                        background:
                          "linear-gradient(135deg, #c9a84c 0%, #f5d68a 100%)",
                      }
                    : {}
                }
              >
                {t === "sale" ? "🏠 للبيع" : "🔑 للإيجار"}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
            <Search className="absolute right-5 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="ابحث بالمنطقة أو نوع العقار أو الحي..."
              className="flex-1 bg-transparent py-5 pr-14 pl-4 text-gray-800 placeholder:text-gray-400 text-base outline-none"
              dir="rtl"
            />
            <button
              onClick={doSearch}
              className="m-2 px-8 py-3 rounded-xl text-[#0a1628] font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #c9a84c 0%, #f5d68a 100%)",
              }}
            >
              بحث الآن
            </button>
          </div>

          {/* Quick area pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["سيدي بشر", "المنتزه", "سموحة", "ميامي", "الأنفوشي", "سيدي جابر"].map(
              (area) => (
                <button
                  key={area}
                  onClick={() => nav(`/properties?q=${area}`)}
                  className="bg-white/10 hover:bg-white/20 text-white/80 text-xs px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20 transition-all"
                >
                  {area}
                </button>
              )
            )}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 mt-16"
        >
          {[
            { icon: Building2, value: "+500", label: "عقار مدرج" },
            { icon: MapPin, value: "57", label: "حي إسكندراني" },
            { icon: Star, value: "+50", label: "وسيط معتمد" },
          ].map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="text-center px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm"
            >
              <Icon className="w-5 h-5 text-[#c9a84c] mx-auto mb-1" />
              <p className="text-white font-extrabold text-2xl">{value}</p>
              <p className="text-white/50 text-xs">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LATEST PROPERTIES
══════════════════════════════════════════════════════════════════ */
function LatestProperties() {
  const [, nav] = useLocation();
  const { data: props = [] } = useQuery({
    queryKey: ["home2-latest"],
    queryFn: () => api.properties.list({ limit: 8, sortBy: "newest" }),
    staleTime: 60_000,
  });

  return (
    <section className="py-20 bg-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[#c9a84c] text-sm font-bold uppercase tracking-widest mb-2 block">
              الوافدة حديثاً
            </span>
            <h2 className="text-4xl font-extrabold text-[#0a1628]">
              أحدث العقارات
            </h2>
            <p className="text-gray-500 mt-2">
              أضيفت للتو — كن أول المشترين والمستأجرين
            </p>
          </div>
          <button
            onClick={() => nav("/properties?sortBy=newest")}
            className="hidden md:flex items-center gap-2 text-sm font-semibold text-[#0a1628] border-b-2 border-[#c9a84c] pb-0.5 hover:text-[#c9a84c] transition-colors"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {props.slice(0, 8).map((p: Prop, i: number) => (
            <LatestCard key={p.id} p={p} delay={i * 0.06} />
          ))}
        </div>

        <div className="flex justify-center mt-8 md:hidden">
          <button
            onClick={() => nav("/properties?sortBy=newest")}
            className="flex items-center gap-2 bg-[#0a1628] text-white px-8 py-3 rounded-xl font-bold text-sm"
          >
            عرض كل العقارات <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function LatestCard({ p, delay }: { p: Prop; delay: number }) {
  const [, nav] = useLocation();
  const imgs = parseImages(p.images);
  const thumb = imgs[0] ?? DEFAULT_IMG;
  const isRent = p.listingType === "rent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      onClick={() => nav(`/property/${p.id}`)}
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#c9a84c]/30 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={thumb}
          alt={p.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span
          className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${
            isRent ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
          }`}
        >
          {isRent ? "للإيجار" : "للبيع"}
        </span>
        {p.featured && (
          <span className="absolute top-3 left-3 bg-[#c9a84c] text-[#0a1628] text-xs font-black px-3 py-1 rounded-full">
            مميز
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="font-bold text-[#0a1628] text-sm line-clamp-2 leading-snug mb-2 group-hover:text-[#c9a84c] transition-colors">
          {p.title}
        </p>

        {p.district && (
          <p className="flex items-center gap-1 text-gray-400 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {p.district}
          </p>
        )}

        <div className="flex items-center gap-3 text-gray-400 text-xs mb-3">
          {p.rooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" /> {p.rooms}
            </span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" /> {p.bathrooms}
            </span>
          )}
          {p.area && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" /> {Number(p.area).toLocaleString()} م²
            </span>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-[#0a1628] font-extrabold text-sm" dir="ltr">
            {fmtPrice(p.price)}
          </span>
          <span className="text-gray-400 text-xs">{p.subCategory ?? p.mainCategory ?? ""}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SEARCH BY AREA  — Visual tiles
══════════════════════════════════════════════════════════════════ */

const ALEX_AREAS = [
  {
    name: "المنتزه",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    desc: "حدائق وشواطئ فاخرة",
    count: null,
  },
  {
    name: "سيدي بشر",
    img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80",
    desc: "قريبة من البحر والخدمات",
    count: null,
  },
  {
    name: "سموحة",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80",
    desc: "رقي وهدوء في قلب الإسكندرية",
    count: null,
  },
  {
    name: "ميامي",
    img: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&q=80",
    desc: "على شاطئ المتوسط مباشرةً",
    count: null,
  },
  {
    name: "الأنفوشي",
    img: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80",
    desc: "تراث وتاريخ إسكندراني",
    count: null,
  },
  {
    name: "العجمي",
    img: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80",
    desc: "شاطئ هادئ وأسعار مناسبة",
    count: null,
  },
];

function SearchByArea() {
  const [, nav] = useLocation();

  return (
    <section
      className="py-20"
      dir="rtl"
      style={{ background: "linear-gradient(180deg, #f8f7f4 0%, #f0ede6 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-[#c9a84c] text-sm font-bold uppercase tracking-widest mb-2 block">
            استكشف الأحياء
          </span>
          <h2 className="text-4xl font-extrabold text-[#0a1628]">
            ابحث حسب المنطقة
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            من شواطئ المنتزه إلى كورنيش العجمي — اكتشف كل حي وما يميزه
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {ALEX_AREAS.map(({ name, img, desc }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              onClick={() => nav(`/properties?q=${name}`)}
              className="relative overflow-hidden rounded-2xl cursor-pointer group aspect-[4/3]"
            >
              <img
                src={img}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 via-[#0a1628]/20 to-transparent" />
              {/* Gold shimmer on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#c9a84c]/0 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

              <div className="absolute bottom-0 right-0 p-4">
                <p className="text-white font-extrabold text-lg leading-none mb-1">
                  {name}
                </p>
                <p className="text-white/70 text-xs">{desc}</p>
              </div>

              {/* Arrow */}
              <div className="absolute top-3 left-3 w-8 h-8 bg-white/0 group-hover:bg-[#c9a84c] rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                <ArrowLeft className="w-4 h-4 text-[#0a1628]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURED PROPERTIES — European magazine layout
══════════════════════════════════════════════════════════════════ */
function FeaturedProperties() {
  const [, nav] = useLocation();
  const [page, setPage] = useState(0);

  const { data: all = [] } = useQuery({
    queryKey: ["home2-featured"],
    queryFn: () => api.properties.list({ featured: true, limit: 9 }),
    staleTime: 60_000,
  });

  const perPage = 3;
  const pages = Math.ceil(all.length / perPage);
  const visible: Prop[] = all.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="py-20 bg-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-[#c9a84c] text-sm font-bold uppercase tracking-widest mb-2 block">
              المختارة بعناية
            </span>
            <h2 className="text-4xl font-extrabold text-[#0a1628]">
              العقارات المميزة
            </h2>
            <p className="text-gray-500 mt-2">
              فرص استثنائية اختارها خبراؤنا
            </p>
          </div>

          {pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#0a1628] hover:text-white hover:border-[#0a1628] disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#0a1628] hover:text-white hover:border-[#0a1628] disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First card — large */}
            {visible[0] && (
              <motion.div
                key={visible[0].id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                onClick={() => nav(`/property/${visible[0].id}`)}
                className="md:row-span-2 group cursor-pointer rounded-3xl overflow-hidden relative shadow-lg hover:shadow-2xl transition-shadow duration-300 min-h-[400px]"
              >
                <img
                  src={parseImages(visible[0].images)[0] ?? DEFAULT_IMG}
                  alt={visible[0].title}
                  className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/30 to-transparent" />

                <div className="absolute bottom-0 right-0 left-0 p-6">
                  <span className="inline-block bg-[#c9a84c] text-[#0a1628] text-xs font-black px-3 py-1 rounded-full mb-3">
                    ⭐ مميز
                  </span>
                  <h3 className="text-white font-extrabold text-xl leading-snug mb-2 line-clamp-2">
                    {visible[0].title}
                  </h3>
                  {visible[0].district && (
                    <p className="text-white/70 text-sm flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      {visible[0].district}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[#c9a84c] font-black text-lg"
                      dir="ltr"
                    >
                      {fmtPrice(visible[0].price)}
                    </span>
                    <div className="flex gap-3 text-white/60 text-xs">
                      {visible[0].rooms != null && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5" />
                          {visible[0].rooms}
                        </span>
                      )}
                      {visible[0].area && (
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          {Number(visible[0].area).toLocaleString()} م²
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Right cards — stacked */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {visible.slice(1).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: (i + 1) * 0.08 }}
                  onClick={() => nav(`/property/${p.id}`)}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#c9a84c]/40 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={parseImages(p.images)[0] ?? DEFAULT_IMG}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span
                      className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${
                        p.listingType === "rent"
                          ? "bg-blue-500 text-white"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {p.listingType === "rent" ? "للإيجار" : "للبيع"}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="font-bold text-[#0a1628] text-sm line-clamp-2 mb-2 group-hover:text-[#c9a84c] transition-colors">
                      {p.title}
                    </p>
                    {p.district && (
                      <p className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {p.district}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className="font-extrabold text-[#0a1628] text-sm"
                        dir="ltr"
                      >
                        {fmtPrice(p.price)}
                      </span>
                      {p.rooms != null && (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <BedDouble className="w-3.5 h-3.5" /> {p.rooms} غرف
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            جاري تحميل العقارات المميزة...
          </div>
        )}

        <div className="flex justify-center mt-10">
          <button
            onClick={() => nav("/properties?featured=true")}
            className="flex items-center gap-2 border-2 border-[#0a1628] text-[#0a1628] px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#0a1628] hover:text-white transition-all duration-200"
          >
            عرض كل المميزة
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CTA BAND
══════════════════════════════════════════════════════════════════ */
function CtaBand() {
  const [, nav] = useLocation();
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #132240 60%, #0a1628 100%)",
      }}
      dir="rtl"
    >
      {/* Gold wave */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 50%, #c9a84c 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <TrendingUp className="w-12 h-12 text-[#c9a84c] mx-auto mb-6" />
        <h2 className="text-4xl font-extrabold text-white mb-4">
          هل تريد إدراج عقارك؟
        </h2>
        <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
          انضم إلى آلاف البائعين والوسطاء على منصة عقارات الإسكندرية
          — أوسع انتشار، وأسرع بيع
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => nav("/add-property")}
            className="flex items-center gap-2 px-10 py-4 rounded-xl text-[#0a1628] font-extrabold text-base transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #c9a84c 0%, #f5d68a 100%)",
            }}
          >
            أضف عقارك الآن
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => nav("/pricing")}
            className="flex items-center gap-2 px-10 py-4 rounded-xl border-2 border-white/30 text-white font-bold text-base hover:bg-white/10 transition-all"
          >
            <Phone className="w-4 h-4" />
            الباقات والأسعار
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ALEXANDRIA FOOTER
══════════════════════════════════════════════════════════════════ */
function AlexFooter() {
  const [, nav] = useLocation();

  const links = [
    { label: "الرئيسية", path: "/" },
    { label: "الرئيسية 2", path: "/home2" },
    { label: "جميع العقارات", path: "/properties" },
    { label: "للبيع", path: "/properties?listingType=sale" },
    { label: "للإيجار", path: "/properties?listingType=rent" },
    { label: "الباقات", path: "/pricing" },
    { label: "من نحن", path: "/about" },
    { label: "تواصل معنا", path: "/contact" },
  ];

  return (
    <footer dir="rtl">
      {/* Sea panorama */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85"
          alt="شاطئ الإسكندرية"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=85";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1628]/30 to-[#0a1628]" />

        {/* Floating card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Waves className="w-10 h-10 text-[#c9a84c] mx-auto mb-3 opacity-90" />
            <p className="text-white font-extrabold text-2xl md:text-3xl drop-shadow-lg">
              عقارات الإسكندرية
            </p>
            <p className="text-white/70 text-sm mt-1">
              على شاطئ البحر المتوسط
            </p>
          </div>
        </div>
      </div>

      {/* Dark footer body */}
      <div className="bg-[#0a1628] pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #c9a84c 0%, #f5d68a 100%)",
                  }}
                >
                  <Building2 className="w-5 h-5 text-[#0a1628]" />
                </div>
                <div>
                  <p className="text-white font-extrabold text-lg leading-none">
                    عقارات الإسكندرية
                  </p>
                  <p className="text-[#c9a84c] text-xs">aqaralex.com</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                منصتك الموثوقة لعقارات الإسكندرية — بيعاً وإيجاراً
                واستثماراً على شاطئ البحر المتوسط.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p className="text-white font-bold mb-4 text-sm">روابط سريعة</p>
              <ul className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => nav(l.path)}
                      className="text-gray-400 hover:text-[#c9a84c] text-sm transition-colors"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Neighborhoods */}
            <div>
              <p className="text-white font-bold mb-4 text-sm">
                أحياء إسكندرية
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {[
                  "المنتزه",
                  "سيدي بشر",
                  "سموحة",
                  "ميامي",
                  "الأنفوشي",
                  "سيدي جابر",
                  "العجمي",
                  "بيتاش",
                ].map((a) => (
                  <li key={a}>
                    <button
                      onClick={() => nav(`/properties?q=${a}`)}
                      className="text-gray-400 hover:text-[#c9a84c] text-sm transition-colors"
                    >
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>
              © {new Date().getFullYear()} عقارات الإسكندرية. جميع الحقوق
              محفوظة.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => nav("/privacy")}
                className="hover:text-gray-300 transition-colors"
              >
                سياسة الخصوصية
              </button>
              <span>·</span>
              <button
                onClick={() => nav("/terms")}
                className="hover:text-gray-300 transition-colors"
              >
                الشروط والأحكام
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE ROOT
══════════════════════════════════════════════════════════════════ */
export default function Home2() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />
      <Hero />
      <LatestProperties />
      <SearchByArea />
      <FeaturedProperties />
      <CtaBand />
      <AlexFooter />
    </div>
  );
}
