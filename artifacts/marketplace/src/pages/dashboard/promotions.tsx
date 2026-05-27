import { useState } from "react";
import { Link } from "wouter";
import {
  Zap, Star, Sparkles, Crown, TrendingUp, Clock, CheckCircle2,
  XCircle, Loader2, RefreshCw, ArrowUpRight, Package, Lock,
  ChevronRight, AlertTriangle, Rocket, Info,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuotaInfo {
  planId: number | null;
  planNameAr: string | null;
  plan: {
    bumpUpsPerMonth: number;
    featuredAds: number;
    spotlightAds: number;
    boostDurationDays: number;
    priorityScore: number;
    canBuyExtraBoosts: boolean;
  };
  features: {
    bumpUp: boolean;
    homepageDisplay: boolean;
    spotlightAd: boolean;
    extraBoostPurchase: boolean;
  };
  used: { bumpUps: number; featuredAds: number; spotlightAds: number };
  addons: { bumps: number; featured: number; spotlight: number };
  remaining: { bumpUps: number; featuredAds: number; spotlightAds: number };
  month: string;
}

interface PropertyPromotion {
  id: number;
  propertyId: number;
  type: "bump" | "featured" | "spotlight";
  source: "plan" | "addon" | "manual";
  boostScore: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  propertyTitle: string | null;
  propertyStatus: string | null;
}

interface UserProperty {
  id: number;
  title: string;
  status: string;
  featured: boolean;
  urgent: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRemaining(n: number): string {
  if (n >= 9999) return "∞";
  return String(n);
}

function fmtExpiry(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400_000));
  if (days === 0) return "ينتهي اليوم";
  return `${days} يوم متبقي`;
}

function pct(used: number, total: number): number {
  if (total < 0 || total >= 9999) return used > 0 ? 5 : 0;
  if (total === 0) return 100;
  return Math.min(100, Math.round((used / total) * 100));
}

const TYPE_META = {
  bump: { label: "ترفيع", icon: Zap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", score: "boostScore" },
  featured: { label: "مميز", icon: Star, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", score: "boostScore" },
  spotlight: { label: "Spotlight", icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", score: "boostScore" },
};

// ── Quota Meter ───────────────────────────────────────────────────────────────

function QuotaMeter({
  label, icon: Icon, color, used, total, addons, remaining, hasFeature,
}: {
  label: string; icon: any; color: string;
  used: number; total: number; addons: number; remaining: number; hasFeature: boolean;
}) {
  const percent = pct(used, total);
  const totalLabel = total === -1 ? "∞" : String(total);
  const isExhausted = remaining === 0 && addons === 0;

  return (
    <div className={`p-4 rounded-xl border transition-all ${hasFeature ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasFeature ? color.replace("text-", "bg-").replace("600", "100") : "bg-slate-100"}`}>
            <Icon className={`w-4 h-4 ${hasFeature ? color : "text-slate-400"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            {!hasFeature && <p className="text-xs text-slate-400">غير متاح في باقتك</p>}
          </div>
        </div>
        {hasFeature ? (
          <Badge variant="outline" className={isExhausted ? "border-red-200 text-red-600 bg-red-50" : "border-emerald-200 text-emerald-700 bg-emerald-50"}>
            {isExhausted ? "استُنفد" : `${fmtRemaining(remaining)} متبقي`}
          </Badge>
        ) : (
          <Lock className="w-4 h-4 text-slate-300" />
        )}
      </div>
      {hasFeature && (
        <>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>المستخدم: {used}</span>
            <span>الإجمالي: {totalLabel}</span>
          </div>
          <Progress value={percent} className="h-1.5" />
          {addons > 0 && (
            <p className="text-xs text-violet-600 mt-1.5">+ {addons} إضافي (addon)</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPromotions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [bumpingId, setBumpingId] = useState<number | null>(null);
  const [featuringId, setFeaturingId] = useState<number | null>(null);
  const [spotlightingId, setSpotlightingId] = useState<number | null>(null);

  const { data: quotaData, isLoading: quotaLoading } = useQuery<{ success: boolean; data: QuotaInfo }>({
    queryKey: ["promotion-quotas", userId],
    queryFn: () => api.fetchJson("/users/me/promotion-quotas"),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const { data: promoHistoryData, isLoading: historyLoading } = useQuery<{ success: boolean; data: PropertyPromotion[] }>({
    queryKey: ["property-promotions", userId],
    queryFn: () => api.fetchJson(`/users/${userId}/property-promotions`),
    enabled: !!userId,
  });

  const { data: myPropsData, isLoading: propsLoading } = useQuery<{ success: boolean; data: UserProperty[] }>({
    queryKey: ["user-properties", userId],
    queryFn: () => api.fetchJson("/user/properties"),
    enabled: !!userId,
  });

  const quotas = quotaData?.data ?? null;
  const promoHistory = promoHistoryData?.data ?? [];
  const myProps = (myPropsData?.data ?? []).filter((p: any) => ["active", "approved"].includes(p.status));
  const isLoading = quotaLoading || historyLoading || propsLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["promotion-quotas", userId] });
    queryClient.invalidateQueries({ queryKey: ["property-promotions", userId] });
    queryClient.invalidateQueries({ queryKey: ["user-properties", userId] });
  };

  const bumpMutation = useMutation({
    mutationFn: (propertyId: number) => api.fetchJson(`/properties/${propertyId}/bump`, { method: "POST" }),
    onMutate: (propertyId) => setBumpingId(propertyId),
    onSettled: () => { setBumpingId(null); invalidate(); },
    onSuccess: (res: any) => toast({ title: "✅ تم الترفيع!", description: res.message }),
    onError: (e: any) => toast({ title: "فشل الترفيع", description: e.message, variant: "destructive" }),
  });

  const featureMutation = useMutation({
    mutationFn: (propertyId: number) => api.fetchJson(`/properties/${propertyId}/feature`, { method: "POST" }),
    onMutate: (propertyId) => setFeaturingId(propertyId),
    onSettled: () => { setFeaturingId(null); invalidate(); },
    onSuccess: (res: any) => toast({ title: "⭐ تم التمييز!", description: res.message }),
    onError: (e: any) => toast({ title: "فشل التمييز", description: e.message, variant: "destructive" }),
  });

  const spotlightMutation = useMutation({
    mutationFn: (propertyId: number) => api.fetchJson(`/properties/${propertyId}/spotlight`, { method: "POST" }),
    onMutate: (propertyId) => setSpotlightingId(propertyId),
    onSettled: () => { setSpotlightingId(null); invalidate(); },
    onSuccess: (res: any) => toast({ title: "✨ تم Spotlight!", description: res.message }),
    onError: (e: any) => toast({ title: "فشل Spotlight", description: e.message, variant: "destructive" }),
  });

  // Active promotions (grouped by propertyId → best)
  const activePromos = promoHistory.filter(p =>
    p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date())
  );
  const activePromoMap = new Map<number, PropertyPromotion>();
  for (const p of activePromos) {
    const prev = activePromoMap.get(p.propertyId);
    if (!prev || (p.boostScore ?? 0) > (prev.boostScore ?? 0)) activePromoMap.set(p.propertyId, p);
  }

  const monthAr = quotas?.month
    ? new Date(`${quotas.month}-01`).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })
    : "";

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8" dir="rtl">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Rocket className="w-6 h-6 text-violet-600" />
              الترقيات والتعلية
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">ارفع إعلاناتك، وتحكم في ظهورها حسب باقتك</p>
          </div>
          <button onClick={invalidate} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* ── Plan Summary ───────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">باقتك الحالية</p>
                    <p className="text-xl font-bold">{quotas?.planNameAr ?? "مجاني"}</p>
                    {monthAr && <p className="text-white/60 text-xs mt-0.5">دورة {monthAr}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-300">{fmtRemaining(quotas?.remaining.bumpUps ?? 0)}</p>
                    <p className="text-white/70 text-xs">Bump Up متبقي</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-300">{fmtRemaining(quotas?.remaining.featuredAds ?? 0)}</p>
                    <p className="text-white/70 text-xs">مميز متبقي</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-300">{fmtRemaining(quotas?.remaining.spotlightAds ?? 0)}</p>
                    <p className="text-white/70 text-xs">Spotlight متبقي</p>
                  </div>
                </div>
                <Link href="/dashboard/packages">
                  <Button variant="secondary" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    ترقية الباقة <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
              </div>

              {/* Priority Score bar */}
              {(quotas?.plan.priorityScore ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/70 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> أولوية الظهور</span>
                    <span className="font-bold">{quotas?.plan.priorityScore}/100</span>
                  </div>
                  <Progress value={quotas?.plan.priorityScore ?? 0} className="h-2 bg-white/20 [&>div]:bg-amber-400" />
                </div>
              )}
            </div>

            {/* ── Quota Meters ──────────────────────────────────────────────── */}
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4 text-violet-600" />
                استخدام ترقياتك هذا الشهر
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuotaMeter
                  label="Bump Up — ترفيع"
                  icon={Zap}
                  color="text-blue-600"
                  used={quotas?.used.bumpUps ?? 0}
                  total={quotas?.plan.bumpUpsPerMonth ?? 0}
                  addons={quotas?.addons.bumps ?? 0}
                  remaining={quotas?.remaining.bumpUps ?? 0}
                  hasFeature={quotas?.features.bumpUp ?? false}
                />
                <QuotaMeter
                  label="Featured — مميز"
                  icon={Star}
                  color="text-amber-600"
                  used={quotas?.used.featuredAds ?? 0}
                  total={quotas?.plan.featuredAds ?? 0}
                  addons={quotas?.addons.featured ?? 0}
                  remaining={quotas?.remaining.featuredAds ?? 0}
                  hasFeature={quotas?.features.homepageDisplay ?? false}
                />
                <QuotaMeter
                  label="Spotlight — إبراز"
                  icon={Sparkles}
                  color="text-violet-600"
                  used={quotas?.used.spotlightAds ?? 0}
                  total={quotas?.plan.spotlightAds ?? 0}
                  addons={quotas?.addons.spotlight ?? 0}
                  remaining={quotas?.remaining.spotlightAds ?? 0}
                  hasFeature={quotas?.features.spotlightAd ?? false}
                />
              </div>
            </div>

            {/* ── How it works (ranking) ────────────────────────────────────── */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                كيف يعمل الترتيب الذكي؟
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Sparkles, color: "text-violet-600", bg: "bg-violet-100", label: "Spotlight", score: "800+", desc: "أعلى مستوى إبراز" },
                  { icon: Star, color: "text-amber-600", bg: "bg-amber-100", label: "Featured", score: "500+", desc: "إعلان مميز بارز" },
                  { icon: Zap, color: "text-blue-600", bg: "bg-blue-100", label: "Bump Up", score: "200+", desc: "يتناقص مع الوقت" },
                  { icon: TrendingUp, color: "text-slate-500", bg: "bg-slate-100", label: "أولوية الباقة", score: "0-200", desc: "حسب خطة اشتراكك" },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 bg-white rounded-lg border border-slate-100">
                    <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    <p className="text-xs font-mono text-violet-600 mt-1">+{item.score}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── My Properties — Action Buttons ───────────────────────────── */}
            {myProps.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-violet-600" />
                  عقاراتي — ابدأ الترقية
                </h2>
                <div className="space-y-3">
                  {myProps.slice(0, 10).map((prop) => {
                    const activePromo = activePromoMap.get(prop.id);
                    const isBumping = bumpingId === prop.id;
                    const isFeaturing = featuringId === prop.id;
                    const isSpotlighting = spotlightingId === prop.id;

                    return (
                      <div key={prop.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{prop.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {prop.featured && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                  <Star className="w-2.5 h-2.5" /> مميز
                                </span>
                              )}
                              {activePromo && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                                  activePromo.type === "spotlight" ? "text-violet-700 bg-violet-50 border-violet-200" :
                                  activePromo.type === "featured" ? "text-amber-700 bg-amber-50 border-amber-200" :
                                  "text-blue-700 bg-blue-50 border-blue-200"
                                }`}>
                                  {activePromo.type === "spotlight" ? <Sparkles className="w-2.5 h-2.5" /> :
                                   activePromo.type === "featured" ? <Star className="w-2.5 h-2.5" /> :
                                   <Zap className="w-2.5 h-2.5" />}
                                  {TYPE_META[activePromo.type]?.label} — {fmtExpiry(activePromo.expiresAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Bump Up */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            disabled={!quotas?.features.bumpUp || (quotas?.remaining.bumpUps ?? 0) <= 0 || isBumping}
                            onClick={() => bumpMutation.mutate(prop.id)}
                            title={!quotas?.features.bumpUp ? "غير متاح في باقتك" : (quotas?.remaining.bumpUps ?? 0) <= 0 ? "الحصة مستنفدة" : ""}
                          >
                            {isBumping ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Zap className="w-3 h-3 ml-1" />}
                            ترفيع
                            {!quotas?.features.bumpUp && <Lock className="w-3 h-3 mr-1 opacity-50" />}
                          </Button>

                          {/* Feature */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            disabled={!quotas?.features.homepageDisplay || (quotas?.remaining.featuredAds ?? 0) <= 0 || isFeaturing}
                            onClick={() => featureMutation.mutate(prop.id)}
                            title={!quotas?.features.homepageDisplay ? "غير متاح في باقتك" : (quotas?.remaining.featuredAds ?? 0) <= 0 ? "الحصة مستنفدة" : ""}
                          >
                            {isFeaturing ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Star className="w-3 h-3 ml-1" />}
                            مميز
                            {!quotas?.features.homepageDisplay && <Lock className="w-3 h-3 mr-1 opacity-50" />}
                          </Button>

                          {/* Spotlight */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                            disabled={!quotas?.features.spotlightAd || (quotas?.remaining.spotlightAds ?? 0) <= 0 || isSpotlighting}
                            onClick={() => spotlightMutation.mutate(prop.id)}
                            title={!quotas?.features.spotlightAd ? "غير متاح في باقتك" : (quotas?.remaining.spotlightAds ?? 0) <= 0 ? "الحصة مستنفدة" : ""}
                          >
                            {isSpotlighting ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Sparkles className="w-3 h-3 ml-1" />}
                            Spotlight
                            {!quotas?.features.spotlightAd && <Lock className="w-3 h-3 mr-1 opacity-50" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── No-plan CTA ────────────────────────────────────────────────── */}
            {!quotas?.planId && (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-8 text-center">
                <Crown className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">فعّل باقة مدفوعة لفتح ترقيات الإعلانات</h3>
                <p className="text-slate-500 text-sm mb-6">
                  الباقة المجانية لا تتضمن Bump Up أو Featured أو Spotlight.<br />
                  اختر باقة مناسبة وابدأ في تصدر نتائج البحث.
                </p>
                <Link href="/dashboard/packages">
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    عرض الباقات <ArrowUpRight className="w-4 h-4 mr-2" />
                  </Button>
                </Link>
              </div>
            )}

            {/* ── Promotion History ─────────────────────────────────────────── */}
            {promoHistory.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  سجل الترقيات
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100">
                    {promoHistory.slice(0, 15).map((p) => {
                      const meta = TYPE_META[p.type];
                      const Icon = meta?.icon ?? Zap;
                      const isActive = p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date());
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta?.bg ?? "bg-slate-100"}`}>
                            <Icon className={`w-4 h-4 ${meta?.color ?? "text-slate-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.propertyTitle ?? `عقار #${p.propertyId}`}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${
                                isActive ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                                "text-slate-500 bg-slate-50 border-slate-200"
                              }`}>
                                {isActive ? "نشط" : "منتهي"}
                              </span>
                              <span className="text-xs text-slate-400">{meta?.label}</span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400">{p.source === "addon" ? "addon" : "باقة"}</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 shrink-0 text-end">
                            {p.expiresAt ? fmtExpiry(p.expiresAt) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// Helper icon component
function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
