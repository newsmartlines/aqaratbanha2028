import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Crown, Clock, CheckCircle2, XCircle, Zap, ArrowLeft,
  Building2, BarChart2, Star, Shield, TrendingUp, Loader2,
  Package, CalendarDays, Infinity,
} from "lucide-react";
import { api, type ProviderStats, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProviderLayout from "@/components/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

function parseLimits(raw: string | undefined | null) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function fmtLimit(v: number) {
  return v < 0 ? <Infinity className="w-3.5 h-3.5" /> : v === 0 ? <span>—</span> : <span>{v.toLocaleString("ar-EG")}</span>;
}

interface PlanCardProps {
  plan: BillingPlan;
  isCurrent: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isCurrent, onSelect }: PlanCardProps) {
  const price = parseFloat(plan.price);
  const limits = parseLimits(plan.limits as any);

  return (
    <div className={`relative rounded-2xl border transition-all p-5 ${
      isCurrent
        ? "border-teal-400 bg-teal-50/60 ring-2 ring-teal-100"
        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
    }`}>
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="bg-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
            باقتك الحالية
          </span>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-gray-900 text-base">{plan.nameAr ?? plan.name}</p>
          <div className="flex items-baseline gap-1 mt-1">
            {price === 0 ? (
              <span className="text-2xl font-black text-gray-500">مجاني</span>
            ) : (
              <>
                <span className="text-2xl font-black text-gray-900">{price.toLocaleString("ar-EG")}</span>
                <span className="text-sm text-gray-400">{plan.currency ?? "EGP"} / {plan.durationDays} يوم</span>
              </>
            )}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isCurrent ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
        }`}>
          {price === 0 ? <Package className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
        </div>
      </div>

      {limits && (
        <div className="space-y-1.5 mb-4 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>عقارات</span>
            <span className="font-semibold">{limits.properties < 0 ? "غير محدود" : limits.properties}</span>
          </div>
          <div className="flex justify-between">
            <span>إعلانات مميزة</span>
            <span className="font-semibold">{limits.featuredAds < 0 ? "غير محدود" : limits.featuredAds}</span>
          </div>
          <div className="flex justify-between">
            <span>طلبات</span>
            <span className="font-semibold">{limits.leads < 0 ? "غير محدود" : limits.leads}</span>
          </div>
        </div>
      )}

      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-teal-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          مفعّلة الآن
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors"
        >
          الترقية لهذه الباقة
        </button>
      )}
    </div>
  );
}

export default function MyPlanPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const providerId = user?.providerId;

  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans", "company"],
    queryFn: () => api.billingPlans.publicListByType("company"),
  });

  const sub = stats?.subscription ?? null;
  const isActive = sub?.isActive ?? false;
  const daysLeft = sub?.daysLeft ?? 0;
  const durationDays = sub?.durationDays ?? 30;
  const progressPct = durationDays > 0 ? Math.round((daysLeft / durationDays) * 100) : 0;

  const sortedPlans = [...plans].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  const currentPlan = sortedPlans.find(p =>
    sub && (p.nameAr === sub.packageNameAr || p.name === sub.packageNameAr)
  );

  const goToBuy = () => navigate("/dashboard/subscription");

  if (statsLoading || plansLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-80">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">باقتي</h1>
            <p className="text-sm text-gray-500 mt-0.5">إدارة اشتراكك وترقية باقتك</p>
          </div>
          <Button
            onClick={goToBuy}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm shadow-teal-100"
          >
            <Zap className="w-4 h-4" />
            اشتري باقة جديدة
          </Button>
        </div>

        {/* ── Current Plan Hero Card ── */}
        {sub ? (
          <div className={`rounded-3xl overflow-hidden shadow-md ${isActive ? "bg-gradient-to-br from-teal-600 to-teal-800" : "bg-gradient-to-br from-gray-600 to-gray-800"}`}>
            <div className="px-6 pt-6 pb-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs font-bold border-0 ${isActive ? "bg-white/20 text-white" : "bg-white/15 text-gray-200"}`}>
                      {isActive ? "✓ نشطة" : "منتهية"}
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-black text-white">{sub.packageNameAr ?? "باقة مجانية"}</h2>
                  {sub.packagePrice && parseFloat(sub.packagePrice) > 0 && (
                    <p className="text-teal-200 text-sm mt-1">
                      {parseFloat(sub.packagePrice).toLocaleString("ar-EG")} ج.م / {durationDays} يوم
                    </p>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-amber-300" />
                </div>
              </div>

              {/* Days progress */}
              {isActive && daysLeft !== null && (
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-teal-200">المدة المتبقية</span>
                    <span className="font-bold text-white">{daysLeft} يوم من {durationDays}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressPct > 30 ? "bg-white" : "bg-amber-300"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {progressPct <= 30 && (
                    <p className="text-amber-300 text-xs font-medium flex items-center gap-1">
                      ⚠️ اشتراكك على وشك الانتهاء — جدّد الآن
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom info strip */}
            <div className="bg-black/20 px-6 py-3 flex flex-wrap gap-4 text-xs text-white/80">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>بدأ: {new Date(sub.startDate).toLocaleDateString("ar-EG")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>ينتهي: {new Date(sub.endDate).toLocaleDateString("ar-EG")}</span>
              </div>
              {isActive && daysLeft !== null && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{daysLeft} يوم متبقٍ</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No active subscription */
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">لا يوجد اشتراك نشط</h2>
              <p className="text-gray-500 text-sm mt-1">اشترك الآن وابدأ بنشر إعلاناتك العقارية</p>
            </div>
            <Button onClick={goToBuy} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl">
              <Zap className="w-4 h-4" />
              اشتري باقة الآن
            </Button>
          </div>
        )}

        {/* ── Quick Benefits ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Building2,   label: "نشر العقارات",       color: "text-teal-600 bg-teal-50" },
            { icon: Star,        label: "إعلانات مميزة",      color: "text-amber-600 bg-amber-50" },
            { icon: BarChart2,   label: "إحصائيات متقدمة",    color: "text-blue-600 bg-blue-50" },
            { icon: Shield,      label: "دعم الأولوية",       color: "text-purple-600 bg-purple-50" },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                <b.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </div>
              <p className="text-sm font-semibold text-gray-700">{b.label}</p>
            </div>
          ))}
        </div>

        {/* ── Available Plans ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">الباقات المتاحة</h2>
            <button
              onClick={goToBuy}
              className="text-sm text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              عرض التفاصيل الكاملة
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {sortedPlans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              لا توجد باقات متاحة حالياً
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={currentPlan?.id === plan.id}
                  onSelect={() => {
                    const qs = new URLSearchParams({
                      planName: plan.nameAr ?? plan.name ?? "",
                      price: String(plan.price),
                      duration: String(plan.durationDays),
                      currency: plan.currency ?? "EGP",
                      planId: String(plan.id),
                    }).toString();
                    navigate(`/pay/subscription?${qs}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Big CTA ── */}
        <div className="bg-gradient-to-l from-teal-600 to-teal-700 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white">
            <p className="font-bold text-lg">هل تريد تحسين ظهورك؟</p>
            <p className="text-teal-200 text-sm mt-0.5">رفع إعلاناتك وتمييزها يضاعف عدد الطلبات التي تستقبلها</p>
          </div>
          <button
            onClick={goToBuy}
            className="shrink-0 bg-white text-teal-700 font-bold px-6 py-3 rounded-2xl hover:bg-teal-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            اشتري باقة جديدة
          </button>
        </div>

      </div>
    </ProviderLayout>
  );
}
