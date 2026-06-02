import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Phone, MessageCircle, Home, Building2, BedDouble,
  Bath, Maximize2, Star, Eye, ArrowLeft, Loader2, CheckCircle,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1400&q=80";

type PropItem = {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  address: string;
  mainCategory: string;
  listingType: string;
  rooms: number;
  bathrooms: number;
  area: string;
  images: string[];
  featured: boolean;
  status: string;
};

type ProviderInfo = {
  name: string;
  avatar: string;
  banner: string;
  city: string;
  district: string;
  phone: string;
  whatsapp: string;
  createdAt: string | null;
};

function mapProp(p: Record<string, unknown>): PropItem {
  const imgs = (() => {
    try { return JSON.parse((p.images as string) ?? "[]") as string[]; } catch { return []; }
  })();
  return {
    id: p.id as number,
    title: (p.title as string) ?? "",
    price: parseFloat((p.price as string) ?? "0") > 0
      ? Number(p.price).toLocaleString("en-US") + " ج.م"
      : "السعر عند الطلب",
    priceNum: parseFloat((p.price as string) ?? "0") || 0,
    address: (p.address as string) ?? "",
    mainCategory: (p.mainCategory as string) ?? "",
    listingType: (p.listingType as string) === "rent" ? "للإيجار" : "للبيع",
    rooms: (p.rooms as number) ?? 0,
    bathrooms: (p.bathrooms as number) ?? 0,
    area: (p.area as string) ?? "0",
    images: imgs.length > 0 ? imgs : [DEFAULT_IMG],
    featured: (p.featured as boolean) ?? false,
    status: (p.status as string) ?? "",
  };
}

export default function AdvertiserPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const providerId = parseInt(params.id ?? "0");

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [properties, setProperties] = useState<PropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

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
          name: prov.name ?? prov.agentName ?? "",
          avatar: prov.avatar ?? "",
          banner: prov.banner ?? "",
          city: prov.city ?? "",
          district: prov.district ?? "",
          phone: prov.phone ?? "",
          whatsapp: prov.whatsapp ?? "",
          createdAt: prov.createdAt ?? null,
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Header />

      {/* ── BANNER ── */}
      <div className="relative h-52 md:h-72 overflow-hidden bg-gray-900">
        <img
          src={provider?.banner || DEFAULT_BANNER}
          alt="banner"
          className="w-full h-full object-cover opacity-60"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_BANNER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>

        {/* Provider info overlaid on banner */}
        <div className="absolute bottom-0 right-0 left-0 p-5 flex items-end gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {provider?.avatar ? (
              <img
                src={mediaUrl(provider.avatar)}
                alt={provider.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(provider?.name ?? "م")}&background=0d9488&color=fff&size=80`; }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-3xl font-extrabold text-white shadow-xl border-4 border-white">
                {provider?.name?.[0] ?? "م"}
              </div>
            )}
            <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-gray-400 border-2 border-white" />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-xl font-extrabold drop-shadow-sm">
                {provider?.name || "المعلن"}
              </h1>
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            {(provider?.city || provider?.district) && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span className="text-white/80 text-sm">
                  {[provider.city, provider.district].filter(Boolean).join(" ـ ")}
                </span>
              </div>
            )}
            {memberMonths && (
              <p className="text-white/70 text-xs mt-0.5">
                عضو منذ {memberMonths < 12 ? `${memberMonths} شهر` : `${Math.round(memberMonths / 12)} سنة`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTACT BAR ── */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2 me-auto">
            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
            <span className="text-xs text-muted-foreground">غير متصل الآن</span>
          </div>
          {provider?.whatsapp && (
            <a
              href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </a>
          )}
          {provider?.phone && (
            <button
              onClick={() => setPhoneRevealed(true)}
              className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              <Eye className="w-4 h-4" />
              {phoneRevealed
                ? <span dir="ltr">{provider.phone}</span>
                : "أظهر رقم التليفون"}
            </button>
          )}
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">
            إعلانات المعلن
            <span className="mr-2 text-base font-semibold text-muted-foreground">
              ({properties.length} عقار)
            </span>
          </h2>
        </div>

        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white rounded-3xl border border-border">
            <Building2 className="w-16 h-16 text-gray-200" />
            <p className="text-xl font-bold text-gray-400">لا توجد إعلانات منشورة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => setLocation(`/property/${p.id}`)}
                className="bg-white rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG; }}
                  />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <Badge className={`text-xs font-bold rounded-full ${p.listingType === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                      {p.listingType}
                    </Badge>
                    {p.featured && (
                      <Badge className="text-xs font-bold rounded-full bg-amber-400 text-amber-900 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-700" /> مميز
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="absolute bottom-3 right-3 text-xs rounded-full">
                    {p.mainCategory}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  {p.address && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {p.rooms > 0 && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" /> {p.rooms}
                      </span>
                    )}
                    {p.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5" /> {p.bathrooms}
                      </span>
                    )}
                    {parseFloat(p.area) > 0 && (
                      <span className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" /> {parseFloat(p.area)} م²
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-extrabold text-base">{p.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <RealEstateFooter />
    </div>
  );
}
