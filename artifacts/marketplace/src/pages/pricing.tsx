import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Check, Crown, Zap, Shield, BarChart2, Star, Loader2, ArrowLeft } from "lucide-react";
import { api, type BillingPlan } from "@/lib/api";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useAuth } from "@/lib/auth-context";

function parseLimits(raw?: string | null): Record<string, number> {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}
function parseFeatures(raw?: string | null): Record<string, boolean> {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

const FEATURE_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch: "أعلى نتائج البحث",
  verifiedBadge: "شارة موثّق ✓",
  premiumBadge: "شارة Premium",
  prioritySupport: "دعم الأولوية",
  analytics: "إحصائيات متقدمة",
  seo: "تحسين محركات البحث",
  aiTools: "أدوات الذكاء الاصطناعي",
  autoBoost: "رفع تلقائي للإعلانات",
};

const LIMIT_LABELS: Record<string, string> = {
  properties: "عقارات",
  photos: "صور لكل عقار",
  videos: "فيديوهات",
  featuredAds: "إعلانات مميزة",
  pinnedAds: "إعلانات مثبتة",
  messages: "رسائل شهرياً",
  leads: "طلبات شهرياً",
};

function formatVal(v: number) {
  return v < 0 ? "غير محدود" : v === 0 ? "—" : v.toLocaleString("ar-EG");
}

interface PlanCardProps {
  plan: BillingPlan;
  onChoose: () => void;
  isLoggedIn: boolean;
}

function PricingCard({ plan, onChoose, isLoggedIn }: PlanCardProps) {
  const price    = parseFloat(plan.price);
  const isFree   = price === 0;
  const accent   = plan.color || "#0d9488";
  const limits   = parseLimits(plan.limits);
  const features = parseFeatures(plan.features);
  const enabledFeatures = Object.entries(features).filter(([, v]) => v);

  return (
    <div
      className={`relative flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
        ${plan.isRecommended ? "border-gray-100 bg-white" : "border-gray-100 bg-white"}`}
      style={plan.isRecommended ? { borderColor: accent, borderWidth: "2px", boxShadow: `0 24px 64px ${accent}20` } : {}}
    >
      {/* Recommended ribbon */}
      {plan.isRecommended && (
        <div className="text-center py-2 text-xs font-black text-white uppercase tracking-widest"
          style={{ background: accent }}>
          ✦ الأكثر تميزاً ✦
        </div>
      )}
      {plan.isMostPopular && !plan.isRecommended && (
        <div className="text-center py-2 text-xs font-black text-white uppercase tracking-widest bg-amber-500">
          ⭐ الأكثر طلباً
        </div>
      )}

      {/* Top color line */}
      {!plan.isRecommended && !plan.isMostPopular && (
        <div className="h-1 w-full" style={{ background: accent }} />
      )}

      <div className="p-6 sm:p-8 flex flex-col flex-1 gap-5">
        {/* Name + description */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}18` }}>
              {isFree
                ? <Shield className="w-4 h-4" style={{ color: accent }} />
                : plan.sortOrder >= 3
                ? <Crown className="w-4 h-4" style={{ color: accent }} />
                : <Star className="w-4 h-4" style={{ color: accent }} />
              }
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{plan.name}</p>
              <p className="font-bold text-gray-900 text-base leading-tight">{plan.nameAr ?? plan.name}</p>
            </div>
          </div>
          {plan.descriptionAr && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{plan.descriptionAr}</p>
          )}
        </div>

        {/* Price */}
        <div className="pb-4 border-b border-gray-100">
          {isFree ? (
            <div>
              <span className="text-4xl font-black" style={{ color: accent }}>مجاني</span>
              <p className="text-xs text-gray-400 mt-1">بدون رسوم شهرية</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-gray-900">
                  {Number(price).toLocaleString("ar-EG")}
                </span>
                <div className="text-sm text-gray-400 mb-1 leading-tight">
                  <div>{plan.currency ?? "EGP"}</div>
                  <div>/ {plan.durationDays} يوم</div>
                </div>
              </div>
              {plan.yearlyPrice && (
                <p className="text-xs text-gray-400 mt-1">
                  أو {Number(plan.yearlyPrice).toLocaleString("ar-EG")} {plan.currency ?? "EGP"} / سنوياً
                </p>
              )}
              {plan.trialDays > 0 && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${accent}15`, color: accent }}>
                  <Zap className="w-3 h-3" />
                  {plan.trialDays} أيام تجريبية مجاناً
                </span>
              )}
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">الحدود الشهرية</p>
          {Object.entries(LIMIT_LABELS).map(([key, label]) => {
            const val = limits[key] ?? 0;
            if (val === 0 && !Object.prototype.hasOwnProperty.call(limits, key)) return null;
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                  val < 0
                    ? "bg-green-50 text-green-700"
                    : val === 0
                    ? "bg-gray-50 text-gray-400"
                    : "bg-gray-50 text-gray-700"
                }`}>
                  {formatVal(val)}
                </span>
              </div>
            );
          })}
          {plan.commissionPercent && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">العمولة</span>
              <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {plan.commissionPercent}%
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        {enabledFeatures.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">المزايا المضمّنة</p>
            {enabledFeatures.map(([key]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accent}18` }}>
                  <Check className="w-2.5 h-2.5" style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-gray-700">{FEATURE_LABELS[key] ?? key}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <button
            onClick={onChoose}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: accent, color: "#fff" }}
          >
            {isFree
              ? "ابدأ مجاناً"
              : isLoggedIn
              ? `اشترك في ${plan.nameAr ?? plan.name}`
              : `سجّل الآن واشترك`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: plans = [], isLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billing-plans-pricing"],
    queryFn: api.billingPlans.publicList,
    staleTime: 5 * 60_000,
  });

  const sorted = [...plans]
    .filter(p => p.status === "active")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || parseFloat(a.price) - parseFloat(b.price));

  const handleChoose = (plan: BillingPlan) => {
    const isFree = parseFloat(plan.price) === 0;
    if (user) {
      if (user.role === "provider" || user.role === "admin") {
        const qs = new URLSearchParams({
          planName: plan.nameAr ?? plan.name ?? "",
          price: String(plan.price),
          duration: String(plan.durationDays),
          currency: plan.currency ?? "EGP",
          planId: String(plan.id),
        }).toString();
        navigate(isFree ? "/dashboard/subscription" : `/pay/subscription?${qs}`);
      } else {
        navigate("/add-property");
      }
    } else {
      navigate("/register?returnTo=/pricing");
    }
  };

  const TRUST_ITEMS = [
    { icon: Shield,   label: "دفع آمن ومشفر" },
    { icon: Zap,      label: "تفعيل فوري" },
    { icon: BarChart2, label: "إحصائيات مفصّلة" },
    { icon: Crown,    label: "دعم متميز" },
  ];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-5 py-2 mb-8 text-sm text-gray-300 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            باقات تُدار بالكامل من لوحة الإدارة
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
            اختر الباقة
            <span className="text-teal-400"> المناسبة لك</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            باقات مرنة تناسب الأفراد والشركات — أي تغيير من الإدارة يظهر هنا فوراً
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Crown className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-1">لا توجد باقات متاحة حالياً</p>
            <p className="text-sm">تواصل مع الإدارة لتفعيل الباقات</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            sorted.length === 1 ? "max-w-sm mx-auto" :
            sorted.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" :
            sorted.length === 3 ? "sm:grid-cols-3" :
            sorted.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" :
            "sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {sorted.map(plan => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onChoose={() => handleChoose(plan)}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        )}
      </section>

      {/* Trust bar */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">هل تحتاج مساعدة في الاختيار؟</h2>
        <p className="text-gray-500 mb-8">فريقنا جاهز لمساعدتك في اختيار الباقة الأنسب لنشاطك</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/contact")}
            className="px-8 py-3.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            تواصل معنا
          </button>
          <button
            onClick={() => navigate("/add-property")}
            className="px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            ابدأ الآن
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </section>

      <RealEstateFooter />
    </div>
  );
}
