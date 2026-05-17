import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Building2, Heart,
  Star, ChevronDown, ArrowLeft, Phone, Briefcase, Home, TrendingUp,
  CheckCircle2, Users, Award, LayoutGrid,
} from "lucide-react";
import { PROPERTIES } from "./home";

const FALLBACK = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80";

const KINDS_OPTS = [
  { value: "", label: "نوع العقار" },
  { value: "فيلا", label: "فيلا" },
  { value: "شقة", label: "شقة" },
  { value: "مكتب", label: "مكتب" },
  { value: "دوبلكس", label: "دوبلكس" },
  { value: "أرض", label: "أرض" },
];

const REGIONS_OPTS = [
  { value: "", label: "المنطقة" },
  { value: "القاهرة", label: "القاهرة" },
  { value: "الإسكندرية", label: "الإسكندرية" },
  { value: "الدمام", label: "الدمام" },
  { value: "مكة المكرمة", label: "مكة المكرمة" },
  { value: "المدينة المنورة", label: "المدينة المنورة" },
  { value: "الخبر", label: "الخبر" },
];

const PRICE_OPTS = [
  { value: "", label: "السعر" },
  { value: "0-500000", label: "أقل من 500,000 ج.م" },
  { value: "500000-1000000", label: "500,000 – 1,000,000 ج.م" },
  { value: "1000000-2000000", label: "1,000,000 – 2,000,000 ج.م" },
  { value: "2000000-5000000", label: "2,000,000 – 5,000,000 ج.م" },
  { value: "5000000-999999999", label: "أكثر من 5,000,000 ج.م" },
];

const REGIONS = [
  { name: "القاهرة",         count: 312, img: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=70" },
  { name: "الإسكندرية",            count: 218, img: "https://images.unsplash.com/photo-1590183500001-3fee27e2d5f2?auto=format&fit=crop&w=600&q=70" },
  { name: "الدمام",         count: 134, img: "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=600&q=70" },
  { name: "مكة المكرمة",   count:  97, img: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=600&q=70" },
  { name: "المدينة المنورة",count:  76, img: "https://images.unsplash.com/photo-1575783970733-1aaedde1db74?auto=format&fit=crop&w=600&q=70" },
  { name: "الخبر",          count:  89, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=70" },
];

const CATEGORIES = [
  { icon: Home,       label: "فيلل فاخرة",    count: 148, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { icon: Building2,  label: "شقق سكنية",     count: 326, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { icon: Briefcase,  label: "مكاتب تجارية",  count:  94, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { icon: LayoutGrid, label: "دوبلكس",        count:  67, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { icon: MapPin,     label: "أراضي",         count: 213, color: "bg-rose-50 text-rose-700 border-rose-200" },
  { icon: TrendingUp, label: "استثمارية",     count:  55, color: "bg-teal-50 text-teal-700 border-teal-200" },
];

function pad6(src: typeof PROPERTIES): typeof PROPERTIES {
  if (src.length >= 6) return src.slice(0, 6);
  const out = [...src];
  let i = 0;
  while (out.length < 6) { out.push(PROPERTIES[i % PROPERTIES.length]); i++; }
  return out;
}

const featuredSec   = pad6(PROPERTIES.filter(p => p.featured));
const commercialSec = pad6(PROPERTIES.filter(p => p.kind === "مكتب" || p.kind === "دوبلكس"));
const landsSec      = pad6(PROPERTIES.filter(p => p.kind === "أرض"));

/* ─── Reusable property card ─── */
function PropCard({ p, liked, onLike, onClick }: {
  p: typeof PROPERTIES[0];
  liked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={p.img} alt={p.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={e => { e.currentTarget.src = FALLBACK; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 flex gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow ${p.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>{p.type}</span>
          {p.featured && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900">مميز</span>}
        </div>
        <span className="absolute bottom-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/20">{p.kind}</span>
        <button
          onClick={onLike}
          className={`absolute top-3 left-3 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${liked ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500/80"}`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-white" : ""}`} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <p className="text-primary font-extrabold text-lg leading-none">{p.price}</p>
            <p className="text-gray-400 text-xs mt-0.5">جنيه مصري</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-600">4.8</span>
          </div>
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-1">{p.title}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span className="truncate">{p.location}</span>
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          {p.beds > 0 && <span className="flex items-center gap-1 text-gray-400 text-xs"><BedDouble className="w-3.5 h-3.5" />{p.beds}</span>}
          {p.baths > 0 && <span className="flex items-center gap-1 text-gray-400 text-xs"><Bath className="w-3.5 h-3.5" />{p.baths}</span>}
          <span className="flex items-center gap-1 text-gray-400 text-xs"><Maximize2 className="w-3.5 h-3.5" />{p.area} م²</span>
          <div className="flex-1" />
          <span className="text-xs text-primary font-semibold">التفاصيل ←</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Section header ─── */
function SectionHead({ title, sub, href, linkLabel = "عرض الكل" }: {
  title: string; sub?: string; href: string; linkLabel?: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{title}</h2>
        {sub && <p className="text-gray-500 text-sm">{sub}</p>}
      </div>
      <button
        onClick={() => setLocation(href)}
        className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:gap-3 transition-all"
      >
        {linkLabel} <ArrowLeft className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function Home2() {
  const [, setLocation] = useLocation();
  const [tab,        setTab]        = useState<"sale" | "rent">("sale");
  const [searchText, setSearchText] = useState("");
  const [kind,       setKind]       = useState("");
  const [region,     setRegion]     = useState("");
  const [price,      setPrice]      = useState("");
  const [liked,      setLiked]      = useState<Set<number>>(new Set());

  const toggleLike = (uid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(prev => { const s = new Set(prev); s.has(uid) ? s.delete(uid) : s.add(uid); return s; });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchText) params.set("q", searchText);
    params.set("type", tab === "sale" ? "للبيع" : "للإيجار");
    if (kind)   params.set("kind", kind);
    if (region) params.set("city", region);
    setLocation(`/properties?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6]" dir="rtl">
      <Header />

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=85"
            alt="hero bg"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm">
              منصة العقارات الأولى في مصر
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 drop-shadow-lg">
              اعثر على عقارك المثالي
              <br className="hidden sm:block" />
              <span className="text-primary"> في كل مكان</span>
            </h1>
            <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              آلاف العقارات للبيع والإيجار في جميع مدن مصر — فيلل، شقق، مكاتب وأراضي.
            </p>
          </motion.div>

          {/* ── Search widget ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 max-w-3xl mx-auto shadow-2xl"
          >
            {/* Sale / Rent tabs */}
            <div className="flex bg-white/10 rounded-2xl p-1 mb-5 w-fit mx-auto">
              {(["sale", "rent"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-10 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-primary text-white shadow-md" : "text-white/70 hover:text-white"}`}
                >
                  {t === "sale" ? "للبيع" : "للإيجار"}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* Text */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="ابحث بالمدينة أو الحي..."
                  className="pr-10 h-12 rounded-xl bg-white text-gray-900 border-0 shadow text-sm"
                />
              </div>

              {/* Kind */}
              <div className="relative">
                <select
                  value={kind}
                  onChange={e => setKind(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white text-gray-700 border-0 shadow text-sm px-4 appearance-none cursor-pointer focus:outline-none"
                >
                  {KINDS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Region */}
              <div className="relative">
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white text-gray-700 border-0 shadow text-sm px-4 appearance-none cursor-pointer focus:outline-none"
                >
                  {REGIONS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Price */}
              <div className="relative">
                <select
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white text-gray-700 border-0 shadow text-sm px-4 appearance-none cursor-pointer focus:outline-none"
                >
                  {PRICE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 shadow-lg gap-2"
            >
              <Search className="w-4 h-4" /> ابحث الآن
            </Button>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center justify-center gap-6 mt-8 text-white/70 text-sm flex-wrap"
          >
            {["+1,200 عقار متاح", "18 مدينة", "+500 وكيل معتمد", "+5K عميل راضٍ"].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />{s}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          CATEGORY QUICK LINKS
      ══════════════════════════════ */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(c => (
              <button
                key={c.label}
                onClick={() => setLocation("/properties")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center hover:shadow-md transition-all ${c.color}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center opacity-80">
                  <c.icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs leading-tight">{c.label}</p>
                <p className="text-[10px] opacity-70">{c.count}+ عقار</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURED
      ══════════════════════════════ */}
      <section className="py-16 container mx-auto px-4">
        <SectionHead title="⭐ عقارات مميزة" sub="أفضل العقارات المختارة بعناية لك" href="/properties" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSec.map((p, i) => (
            <motion.div
              key={`feat-${p.id}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <PropCard p={p} liked={liked.has(p.id)} onLike={e => toggleLike(p.id, e)} onClick={() => setLocation(`/property/${p.id}`)} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          SEARCH BY REGION
      ══════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <SectionHead title="🗺️ ابحث بالمنطقة" sub="اختر المدينة المناسبة لك" href="/properties" linkLabel="كل المناطق" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {REGIONS.map((r, i) => (
              <motion.button
                key={r.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setLocation(`/properties`)}
                className="group relative rounded-2xl overflow-hidden aspect-square cursor-pointer border-2 border-transparent hover:border-primary/50 transition-all shadow-sm hover:shadow-lg"
              >
                <img
                  src={r.img} alt={r.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={e => { e.currentTarget.src = FALLBACK; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
                  <p className="text-white font-extrabold text-sm leading-none">{r.name}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{r.count}+ عقار</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          COMMERCIAL
      ══════════════════════════════ */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <SectionHead title="🏢 المحلات والمكاتب التجارية" sub="أفضل العقارات التجارية للإيجار والبيع" href="/properties" />

          {/* Banner */}
          <div className="relative rounded-3xl overflow-hidden mb-8 h-40">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=70"
              alt="commercial"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-primary/85 to-primary/40" />
            <div className="absolute inset-0 flex items-center justify-between px-8">
              <div className="text-white text-right">
                <p className="text-2xl font-extrabold mb-1">تجارتك تبدأ من هنا</p>
                <p className="text-white/80 text-sm">مئات المكاتب والمحلات في أفضل المواقع</p>
              </div>
              <Button
                onClick={() => setLocation("/properties")}
                className="bg-white text-primary hover:bg-gray-50 font-bold rounded-xl shadow-md shrink-0"
              >
                استعرض الكل
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {commercialSec.map((p, i) => (
              <motion.div
                key={`comm-${p.id}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <PropCard
                  p={p}
                  liked={liked.has(p.id + 1000)}
                  onLike={e => toggleLike(p.id + 1000, e)}
                  onClick={() => setLocation(`/property/${p.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          LANDS
      ══════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <SectionHead title="🌿 الأراضي والمخططات" sub="أراضٍ سكنية وتجارية في أفضل المواقع" href="/properties" />

          {/* Banner */}
          <div className="relative rounded-3xl overflow-hidden mb-8 h-40">
            <img
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=70"
              alt="lands"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-900/80 to-emerald-600/50" />
            <div className="absolute inset-0 flex items-center justify-between px-8">
              <div className="text-white text-right">
                <p className="text-2xl font-extrabold mb-1">استثمر في الأراضي</p>
                <p className="text-white/80 text-sm">فرص استثمارية لا تُعوَّض في مواقع نمو عالية</p>
              </div>
              <Button
                onClick={() => setLocation("/properties")}
                className="bg-white text-emerald-700 hover:bg-gray-50 font-bold rounded-xl shadow-md shrink-0"
              >
                استعرض الكل
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {landsSec.map((p, i) => (
              <motion.div
                key={`land-${p.id}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <PropCard
                  p={p}
                  liked={liked.has(p.id + 2000)}
                  onLike={e => toggleLike(p.id + 2000, e)}
                  onClick={() => setLocation(`/property/${p.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          WHY US
      ══════════════════════════════ */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold mb-2">لماذا دليل بلس العقارات؟</h2>
            <p className="text-white/70">المنصة الأكثر ثقةً لبيع وشراء وإيجار العقارات في مصر</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Building2,    value: "+1,200", label: "عقار متاح" },
              { icon: Users,        value: "+500",   label: "وكيل معتمد" },
              { icon: Award,        value: "8 سنوات", label: "من الخبرة" },
              { icon: CheckCircle2, value: "+5,000", label: "صفقة ناجحة" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-extrabold mb-1">{s.value}</p>
                <p className="text-white/70 text-sm">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA
      ══════════════════════════════ */}
      <section className="py-14 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold mb-3">هل أنت مالك عقار؟</h2>
          <p className="text-gray-400 mb-7 max-w-lg mx-auto">
            أضف عقارك الآن وتواصل مع آلاف المشترين والمستأجرين مجاناً
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              onClick={() => setLocation("/register")}
              className="h-12 px-8 rounded-xl text-base font-bold bg-primary hover:bg-primary/90"
            >
              أضف عقارك مجاناً
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/contact")}
              className="h-12 px-8 rounded-xl text-base font-bold border-white/30 text-white hover:bg-white/10"
            >
              <Phone className="w-4 h-4 me-2" /> تواصل معنا
            </Button>
          </div>
        </div>
      </section>

      <RealEstateFooter />
    </div>
  );
}
