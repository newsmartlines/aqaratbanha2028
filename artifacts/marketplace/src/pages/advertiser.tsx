import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Phone, MessageCircle, BedDouble, Bath, Maximize2,
  Star, Eye, ArrowRight, Loader2, CheckCircle, Shield, Award,
  Building2, Calendar, ChevronLeft, ChevronRight, Send,
  User, Mail, MessageSquare, X, ThumbsUp, Clock, TrendingUp,
} from "lucide-react";
import { mediaUrl } from "@/lib/api";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80";

type Review = {
  id: number;
  rating: number;
  text: string;
  reply: string | null;
  createdAt: string;
  userName: string;
};

type PropItem = {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  address: string;
  mainCategory: string;
  listingType: string;   // Arabic label: "للبيع" | "للإيجار"
  rawListingType: string; // raw API value: "sale" | "rent"
  rooms: number;
  bathrooms: number;
  area: string;
  images: string[];
  featured: boolean;
  status: string;
};

type ProviderInfo = {
  id: number;
  name: string;
  bio: string;
  avatar: string;
  banner: string;
  city: string;
  district: string;
  phone: string;
  whatsapp: string;
  rating: string;
  reviewsCount: number;
  verified: boolean;
  featured: boolean;
  createdAt: string | null;
  reviews: Review[];
  subscription: { packageName: string; packagePrice: string; endDate: string } | null;
};

function mapProp(p: Record<string, unknown>): PropItem {
  const imgs = (() => {
    try { return JSON.parse((p.images as string) ?? "[]") as string[]; } catch { return []; }
  })();
  const raw = (p.listingType as string) ?? "sale";
  return {
    id: p.id as number,
    title: (p.title as string) ?? "",
    price: parseFloat((p.price as string) ?? "0") > 0
      ? Number(p.price).toLocaleString("ar-EG") + " ج.م"
      : "السعر عند الطلب",
    priceNum: parseFloat((p.price as string) ?? "0") || 0,
    address: (p.address as string) ?? "",
    mainCategory: (p.mainCategory as string) ?? "",
    rawListingType: raw,
    listingType: raw === "rent" ? "للإيجار" : "للبيع",
    rooms: (p.rooms as number) ?? 0,
    bathrooms: (p.bathrooms as number) ?? 0,
    area: (p.area as string) ?? "0",
    images: imgs.length > 0 ? imgs : [DEFAULT_IMG],
    featured: (p.featured as boolean) ?? false,
    status: (p.status as string) ?? "",
  };
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const s = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${Math.floor(months / 12)} سنة`;
}

/* ─── Property Card ─────────────────────────────────────────────── */
function PropertyCard({ p, idx, onClick }: { p: PropItem; idx: number; onClick: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-primary/20 transition-all duration-300 cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <img
          src={p.images[imgIdx] || DEFAULT_IMG}
          alt={p.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG; }}
        />
        {/* Image nav */}
        {p.images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + p.images.length) % p.images.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            ><ChevronRight className="w-4 h-4" /></button>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % p.images.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            ><ChevronLeft className="w-4 h-4" /></button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {p.images.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white w-3" : "bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
        {/* Badges */}
        <div className="absolute top-3 right-3 flex gap-1.5 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow ${p.listingType === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
            {p.listingType}
          </span>
          {p.featured && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow bg-amber-400 text-amber-900 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-800" /> مميز
            </span>
          )}
        </div>
        {p.mainCategory && (
          <span className="absolute bottom-3 right-3 text-xs bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">
            {p.mainCategory}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {p.title}
        </h3>
        {p.address && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{p.address}</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 border-t border-gray-50 pt-3">
          {p.rooms > 0 && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-primary/70" /> <span>{p.rooms} غرف</span>
            </span>
          )}
          {p.bathrooms > 0 && (
            <span className="flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-primary/70" /> <span>{p.bathrooms}</span>
            </span>
          )}
          {parseFloat(p.area) > 0 && (
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-primary/70" /> <span>{parseFloat(p.area)} م²</span>
            </span>
          )}
        </div>
        <p className="text-primary font-extrabold text-lg">{p.price}</p>
      </div>
    </motion.div>
  );
}

/* ─── Contact Sidebar ───────────────────────────────────────────── */
function ContactSidebar({ provider }: { provider: ProviderInfo }) {
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setMsgSent(true);
  };

  return (
    <div className="space-y-4">
      {/* Contact Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="bg-gradient-to-l from-primary to-teal-600 px-5 py-4">
          <h3 className="text-white font-bold text-base">تواصل مع المعلن</h3>
          <p className="text-white/75 text-xs mt-0.5">رد عادةً خلال ساعات</p>
        </div>
        <div className="p-5 space-y-3">
          {provider.whatsapp && (
            <a
              href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، رأيت إعلانك على عقارات بنها وأريد الاستفسار")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm shadow-[#25D366]/30"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل عبر واتساب
            </a>
          )}
          {provider.phone && (
            <button
              onClick={() => setPhoneRevealed(true)}
              className="flex items-center justify-center gap-2.5 w-full bg-primary/5 hover:bg-primary/10 text-primary border-2 border-primary/20 hover:border-primary/40 font-bold py-3 rounded-xl transition-all text-sm"
            >
              <Phone className="w-5 h-5" />
              {phoneRevealed
                ? <span dir="ltr" className="tracking-wide">{provider.phone}</span>
                : "اظهر رقم الهاتف"}
            </button>
          )}
          {!provider.phone && !provider.whatsapp && (
            <p className="text-center text-gray-400 text-sm py-2">لا توجد بيانات اتصال مضافة</p>
          )}
        </div>
      </div>

      {/* Message Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            أرسل رسالة
          </h3>
        </div>
        <div className="p-5">
          <AnimatePresence mode="wait">
            {msgSent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-6 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-bold text-gray-800">تم إرسال رسالتك بنجاح!</p>
                <p className="text-gray-500 text-xs">سيتواصل معك المعلن قريباً</p>
                <button
                  onClick={() => { setMsgSent(false); setForm({ name: "", phone: "", message: "" }); }}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  إرسال رسالة أخرى
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSend} className="space-y-3">
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="اسمك الكريم"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="رقم هاتفك"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                    dir="ltr"
                    className="w-full border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400 text-right"
                  />
                </div>
                <textarea
                  placeholder="اكتب رسالتك هنا..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm shadow-primary/20"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Safety tip */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>نصيحة الأمان:</strong> لا تحوّل أي مبالغ قبل معاينة العقار شخصياً والتحقق من هوية البائع.
        </p>
      </div>
    </div>
  );
}

/* ─── Reviews Section ───────────────────────────────────────────── */
function ReviewsSection({ reviews, rating, reviewsCount }: { reviews: Review[]; rating: string; reviewsCount: number }) {
  const r = parseFloat(rating) || 0;
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(rv => rv.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(rv => rv.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
        <h2 className="font-extrabold text-gray-900 text-lg">التقييمات والمراجعات</h2>
        <span className="text-gray-400 text-sm font-normal">({reviewsCount})</span>
      </div>
      <div className="p-6">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Star className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400 font-medium">لا توجد تقييمات بعد</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[200px_1fr] gap-8">
            {/* Summary */}
            <div className="flex flex-col items-center justify-center gap-3 py-4 md:border-l md:border-gray-100">
              <span className="text-6xl font-black text-gray-900">{r.toFixed(1)}</span>
              <StarRating rating={r} size="md" />
              <span className="text-sm text-gray-500">{reviewsCount} تقييم</span>
              <div className="w-full mt-2 space-y-1.5">
                {dist.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2">{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-4 text-left">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Reviews list */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reviews.map((rv) => (
                <div key={rv.id} className="border border-gray-50 rounded-xl p-4 hover:border-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-teal-200 flex items-center justify-center text-primary font-bold text-sm">
                        {rv.userName?.[0] ?? "م"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{rv.userName}</p>
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={rv.rating} />
                          <span className="text-xs text-gray-400">{timeAgo(rv.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {rv.text && <p className="text-gray-600 text-sm leading-relaxed">{rv.text}</p>}
                  {rv.reply && (
                    <div className="mt-3 bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-2">
                      <div className="w-1 bg-primary rounded-full shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-primary mb-1">رد المعلن</p>
                        <p className="text-xs text-gray-600">{rv.reply}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function AdvertiserPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const providerId = parseInt(params.id ?? "0");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [properties, setProperties] = useState<PropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "rent" | "sale">("all");

  useEffect(() => {
    if (!providerId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/providers/${providerId}`).then(r => r.json()),
      fetch(`/api/properties?providerId=${providerId}&status=active`).then(r => r.json()),
    ]).then(([provRes, propsRes]) => {
      const prov = provRes?.data ?? provRes;
      if (prov) {
        setProvider({
          id: prov.id,
          name: prov.name ?? prov.userName ?? "المعلن",
          bio: prov.bio ?? "",
          avatar: prov.avatar ?? "",
          banner: prov.banner ?? "",
          city: prov.city ?? "",
          district: prov.district ?? "",
          phone: prov.phone ?? prov.userPhone ?? "",
          whatsapp: prov.whatsapp ?? "",
          rating: prov.rating ?? "0",
          reviewsCount: prov.reviewsCount ?? 0,
          verified: prov.verified ?? false,
          featured: prov.featured ?? false,
          createdAt: prov.createdAt ?? null,
          reviews: Array.isArray(prov.reviews) ? prov.reviews : [],
          subscription: prov.subscription ?? null,
        });
      }
      const rows = Array.isArray(propsRes?.data) ? propsRes.data
        : Array.isArray(propsRes) ? propsRes : [];
      setProperties(rows.map(mapProp));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [providerId]);

  const memberMonths = provider?.createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(provider.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;

  const filteredProps = properties.filter(p => {
    if (activeTab === "all") return true;
    return p.rawListingType === activeTab; // "sale" | "rent"
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-500 text-sm">جارٍ تحميل بيانات المعلن...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <User className="w-16 h-16 text-gray-200 mx-auto" />
            <p className="text-gray-500 font-medium">لم يتم العثور على المعلن</p>
            <button onClick={() => window.history.back()} className="text-primary text-sm hover:underline">رجوع</button>
          </div>
        </div>
      </div>
    );
  }

  const ratingNum = parseFloat(provider.rating) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Header />

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="relative h-64 md:h-80 overflow-hidden bg-gray-900">
        <img
          src={provider.banner ? mediaUrl(provider.banner) : DEFAULT_BANNER}
          alt="banner"
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_BANNER; }}
        />
        {/* Multi-layer gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Back */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-2.5 transition-colors flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="hidden sm:inline">رجوع</span>
        </button>

        {/* Subscription badge */}
        {provider.subscription && (
          <div className="absolute top-4 left-4">
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Award className="w-3.5 h-3.5" />
              {provider.subscription.packageName}
            </span>
          </div>
        )}

        {/* Profile info */}
        <div className="absolute bottom-0 right-0 left-0 px-4 sm:px-8 pb-6">
          <div className="max-w-6xl mx-auto flex items-end gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {provider.avatar ? (
                <img
                  src={mediaUrl(provider.avatar)}
                  alt={provider.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-white shadow-2xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=0d9488&color=fff&size=96&bold=true`;
                  }}
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center text-3xl font-black text-white shadow-2xl border-4 border-white">
                  {provider.name?.[0] ?? "م"}
                </div>
              )}
              {provider.verified && (
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              )}
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-white text-2xl font-black drop-shadow-sm">{provider.name}</h1>
                {provider.verified && (
                  <span className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/40 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> موثّق
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {(provider.city || provider.district) && (
                  <span className="flex items-center gap-1 text-white/80 text-sm">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {[provider.city, provider.district].filter(Boolean).join(" ـ ")}
                  </span>
                )}
                {memberMonths && (
                  <span className="flex items-center gap-1 text-white/70 text-sm">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    عضو منذ {memberMonths < 12 ? `${memberMonths} شهر` : `${Math.round(memberMonths / 12)} سنة`}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop stats chips */}
            <div className="hidden md:flex items-center gap-2 pb-1 shrink-0">
              {ratingNum > 0 && (
                <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-white font-bold text-sm">{ratingNum.toFixed(1)}</span>
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">{provider.reviewsCount} تقييم</p>
                </div>
              )}
              <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Building2 className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-white font-bold text-sm">{properties.length}</span>
                </div>
                <p className="text-white/60 text-xs mt-0.5">إعلان نشط</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR (mobile) ─────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-gray-100 shadow-sm">
        <div className="flex divide-x divide-x-reverse divide-gray-100">
          {ratingNum > 0 && (
            <div className="flex-1 py-3 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-900 text-sm">{ratingNum.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-400">التقييم</p>
            </div>
          )}
          <div className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-bold text-gray-900 text-sm">{properties.length}</span>
            </div>
            <p className="text-xs text-gray-400">إعلان</p>
          </div>
          {memberMonths && (
            <div className="flex-1 py-3 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-bold text-gray-900 text-sm">
                  {memberMonths < 12 ? memberMonths : Math.round(memberMonths / 12)}
                </span>
              </div>
              <p className="text-xs text-gray-400">{memberMonths < 12 ? "شهر" : "سنة"}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex gap-8 items-start">

          {/* Left: listings + reviews */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Bio card */}
            {provider.bio && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> نبذة عن المعلن
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{provider.bio}</p>
              </motion.div>
            )}

            {/* Listings */}
            <div>
              {/* Header + tabs */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  إعلانات المعلن
                </h2>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {(["all", "sale", "rent"] as const).map(tab => {
                    const count = tab === "all"
                      ? properties.length
                      : properties.filter(p => p.rawListingType === tab).length;
                    const label = tab === "all" ? "الكل" : tab === "sale" ? "للبيع" : "للإيجار";
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredProps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-2xl border border-gray-100">
                  <Building2 className="w-14 h-14 text-gray-200" />
                  <p className="text-gray-400 font-medium">لا توجد إعلانات في هذا القسم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredProps.map((p, idx) => (
                    <PropertyCard key={p.id} p={p} idx={idx} onClick={() => setLocation(`/property/${p.id}`)} />
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <ReviewsSection
              reviews={provider.reviews}
              rating={provider.rating}
              reviewsCount={provider.reviewsCount}
            />
          </div>

          {/* Right: Contact sidebar (sticky) */}
          <div ref={sidebarRef} className="hidden lg:block w-80 xl:w-96 shrink-0">
            <div className="sticky top-6">
              <ContactSidebar provider={provider} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating contact bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-2xl px-4 py-3">
        <div className="flex gap-3">
          {provider.whatsapp ? (
            <a
              href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، رأيت إعلانك على عقارات بنها")}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl text-sm"
            >
              <MessageCircle className="w-4 h-4" /> واتساب
            </a>
          ) : null}
          {provider.phone ? (
            <a
              href={`tel:${provider.phone}`}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl text-sm"
            >
              <Phone className="w-4 h-4" /> اتصال
            </a>
          ) : null}
          {!provider.whatsapp && !provider.phone && (
            <p className="flex-1 text-center text-gray-400 text-sm py-3">لا توجد بيانات اتصال</p>
          )}
        </div>
      </div>

      {/* Spacer for mobile bar */}
      <div className="lg:hidden h-20" />

      <RealEstateFooter />
    </div>
  );
}
