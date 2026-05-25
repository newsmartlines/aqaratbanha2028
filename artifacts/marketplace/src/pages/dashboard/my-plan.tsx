import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Crown, Clock, CheckCircle2, Zap, ArrowLeft, Building2,
  BarChart2, Shield, TrendingUp, Loader2, Package, CalendarDays,
  CreditCard, Infinity, Star, CheckCircle,
  Receipt, RefreshCw,
} from "lucide-react";
import { api, type ProviderStats, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProviderLayout from "@/components/ProviderLayout";
import {
  parseLimits, parseFeatures, fmtLimit as fmt,
  fmtMoney, fmtDate, FEATURE_LABELS,
} from "@/lib/plan-helpers";

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع", pending: "قيد المراجعة", failed: "مرفوض", cancelled: "ملغي",
};

/* ── UpgradePlanCard ─────────────────────────────────────────────── */
function UpgradePlanCard({ plan, isCurrent, onSelect }: {
  plan: BillingPlan; isCurrent: boolean; onSelect: () => void;
}) {
  const price  = parseFloat(plan.price);
  const isFree = price === 0;
  const accent = plan.color ?? "#0d9488";

  return (
    <div className={`relative rounded-2xl border flex flex-col transition-all duration-200 overflow-hidden
      ${isCurrent ? "ring-2" : "border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5"}`}
      style={isCurrent ? { borderColor: accent, boxShadow: `0 8px 30px ${accent}18` } : {}}>
      <div className="h-1 w-full shrink-0" style={{ background: isCurrent ? accent : "#e5e7eb" }} />

      {isCurrent && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white"
            style={{ background: accent }}>
            باقتك الحالية ✓
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{plan.name}</p>
            <h3 className="font-bold text-gray-900 leading-tight">{plan.nameAr ?? plan.name}</h3>
          </div>
          <div className="text-left shrink-0">
            {isFree
              ? <p className="text-xl font-black" style={{ color: accent }}>مجاني</p>
              : <><p className="text-xl font-black text-gray-900">{Number(price).toLocaleString("ar-EG")}</p>
                 <p className="text-[10px] text-gray-400">{plan.currency} / {plan.durationDays} يوم</p></>
            }
          </div>
        </div>

        {isCurrent ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-auto"
            style={{ color: accent }}>
            <CheckCircle className="w-3.5 h-3.5" /> مفعّلة الآن
          </div>
        ) : (
          <button onClick={onSelect}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors mt-auto"
            style={{ background: accent }}>
            {price > 0 ? "ترقية لهذه الباقة" : "تفعيل مجاناً"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function MyPlanPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const providerId = user?.providerId;
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
    refetchInterval: 30_000,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans", "company"],
    queryFn: () => api.billingPlans.publicListByType("company"),
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["providerMyPayments", providerId],
    queryFn: api.payments.providerMyPayments,
    enabled: !!providerId,
  });

  const sub       = stats?.subscription ?? null;
  const isActive  = sub?.isActive ?? false;
  const daysLeft  = sub?.daysLeft ?? 0;
  const durDays   = sub?.durationDays ?? 30;
  const progressPct = durDays > 0 ? Math.max(0, Math.min(100, Math.round((daysLeft / durDays) * 100))) : 0;

  const sortedPlans = [...plans].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || parseFloat(a.price) - parseFloat(b.price),
  );

  const currentPlan = sortedPlans.find(p =>
    p.nameAr === sub?.packageNameAr || p.name === sub?.packageNameAr,
  ) ?? null;

  const accent     = currentPlan?.color ?? "#0d9488";
  const planLimits = parseLimits(currentPlan?.limits);
  const planFeats  = parseFeatures(currentPlan?.features);

  const subPayments = (paymentsData?.rows ?? [])
    .filter(r => r.kind === "subscription")
    .slice(0, 20);

  const handleUpgrade = (plan: BillingPlan) => {
    if (parseFloat(plan.price) === 0) {
      navigate("/dashboard/subscription");
    } else {
      const qs = new URLSearchParams({
        planName: plan.nameAr ?? plan.name ?? "",
        price: String(plan.price),
        duration: String(plan.durationDays),
        currency: plan.currency ?? "EGP",
        planId: String(plan.id),
      }).toString();
      navigate(`/pay/subscription?${qs}`);
    }
  };

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
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">

        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">باقتي</h1>
            <p className="text-sm text-gray-400 mt-0.5">إدارة اشتراكك وتاريخ مدفوعاتك</p>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: accent }}
          >
            <Zap className="w-4 h-4" />
            تصفح الباقات
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(["overview", "history"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tab === "overview" ? "نظرة عامة" : "تاريخ المدفوعات"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            {/* ── Current Plan Hero Card ─────────────────────────── */}
            {sub ? (
              <div className="rounded-3xl overflow-hidden shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent}99)` }}>
                <div className="px-6 pt-6 pb-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isActive ? "bg-white/20 text-white" : "bg-black/20 text-white/70"
                        }`}>
                          {isActive ? "✓ نشطة" : "منتهية"}
                        </span>
                        {progressPct <= 25 && isActive && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-200">
                            ⚠ تنتهي قريباً
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl font-black text-white leading-tight">
                        {sub.packageNameAr ?? "الباقة المجانية"}
                      </h2>
                      {sub.packagePrice && parseFloat(sub.packagePrice) > 0 && (
                        <p className="text-white/70 text-sm mt-1.5">
                          {parseFloat(sub.packagePrice).toLocaleString("ar-EG")} ج.م / {durDays} يوم
                        </p>
                      )}
                    </div>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.15)" }}>
                      <Crown className="w-7 h-7 text-amber-300" />
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-sm text-white/80">
                        <span>المدة المتبقية</span>
                        <span className="font-bold text-white">{daysLeft} من {durDays} يوم</span>
                      </div>
                      <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%`, background: progressPct > 30 ? "white" : "#fbbf24" }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 px-6 py-3 text-xs text-white/70 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.15)" }}>
                  <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />بدأ: {fmtDate(sub.startDate)}</div>
                  <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />ينتهي: {fmtDate(sub.endDate)}</div>
                  {isActive && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{daysLeft} يوم متبقٍ</div>}
                  {sub.packagePrice && parseFloat(sub.packagePrice) > 0 && (
                    <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />
                      دفعت: {parseFloat(sub.packagePrice).toLocaleString("ar-EG")} ج.م
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">لا يوجد اشتراك نشط</h2>
                  <p className="text-gray-400 text-sm mt-1">اشترك الآن وابدأ بنشر إعلاناتك العقارية</p>
                </div>
                <button onClick={() => navigate("/pricing")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors">
                  <Zap className="w-4 h-4" /> اشترك الآن
                </button>
              </div>
            )}

            {/* ── Plan features & limits ────────────────────────── */}
            {currentPlan && (
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Limits */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-gray-400" /> حدود الباقة
                  </h3>
                  {(Object.entries({
                    properties:  "العقارات المسموحة",
                    photos:      "الصور لكل عقار",
                    featuredAds: "إعلانات مميزة",
                    leads:       "الطلبات الشهرية",
                  }) as [string, string][]).map(([key, label]) => {
                    if (!(key in planLimits)) return null;
                    const val = planLimits[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className={`font-bold text-sm px-2.5 py-0.5 rounded-full ${
                          val < 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"
                        }`}>
                          {val < 0
                            ? <span className="flex items-center gap-1"><Infinity className="w-3.5 h-3.5 inline" /> غير محدود</span>
                            : fmt(val)
                          }
                        </span>
                      </div>
                    );
                  })}
                  {currentPlan.commissionPercent && currentPlan.commissionPercent !== "0" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">نسبة العمولة</span>
                      <span className="font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{currentPlan.commissionPercent}%</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" /> المزايا المضمّنة
                  </h3>
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const enabled = !!planFeats[key];
                    return (
                      <div key={key} className={`flex items-center gap-2 text-sm ${enabled ? "" : "opacity-40"}`}>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${enabled ? "text-teal-500" : "text-gray-300"}`} />
                        <span className={enabled ? "text-gray-700" : "text-gray-400 line-through"}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quick stats bar ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Building2,   label: "إجمالي العقارات", value: String(stats?.servicesCount ?? 0),  color: "text-teal-600 bg-teal-50" },
                { icon: Star,        label: "التقييم",          value: `${stats?.avgRating ?? "—"} ⭐`,    color: "text-amber-600 bg-amber-50" },
                { icon: TrendingUp,  label: "الطلبات",          value: String(stats?.totalOrders ?? 0),    color: "text-blue-600 bg-blue-50" },
                { icon: Shield,      label: "المراجعات",        value: String(stats?.reviewsCount ?? 0),   color: "text-purple-600 bg-purple-50" },
              ].map((b, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${b.color}`}>
                    <b.icon className="w-[18px] h-[18px]" />
                  </div>
                  <p className="text-xl font-black text-gray-900">{b.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.label}</p>
                </div>
              ))}
            </div>

            {/* ── Available plans grid ──────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">الباقات المتاحة</h2>
                <button onClick={() => navigate("/pricing")}
                  className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: accent }}>
                  تصفح الكل <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              {sortedPlans.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                  لا توجد باقات متاحة حالياً
                </div>
              ) : (
                <div className={`grid gap-4 ${sortedPlans.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                  {sortedPlans.map(plan => (
                    <UpgradePlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={currentPlan?.id === plan.id}
                      onSelect={() => handleUpgrade(plan)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Renewal CTA ───────────────────────────────────── */}
            {sub && isActive && progressPct <= 40 && (
              <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}08)`, border: `1px solid ${accent}30` }}>
                <div>
                  <p className="font-bold text-gray-900">اشتراكك على وشك الانتهاء</p>
                  <p className="text-sm text-gray-500 mt-0.5">جدّد الآن واستمر بدون انقطاع — {daysLeft} يوم متبقٍ فقط</p>
                </div>
                <button onClick={() => navigate("/pricing")}
                  className="shrink-0 px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-colors"
                  style={{ background: accent }}>
                  <RefreshCw className="w-4 h-4" /> جدّد الاشتراك
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Payment History Tab ────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            ) : subPayments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-1">لا توجد مدفوعات بعد</h3>
                <p className="text-sm text-gray-400">ستظهر هنا جميع مدفوعات اشتراكاتك</p>
                <button onClick={() => navigate("/pricing")}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: accent }}>
                  <Zap className="w-4 h-4" /> اشترك الآن
                </button>
              </div>
            ) : (
              <>
                {/* Totals summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "إجمالي المدفوع",  value: `${fmtMoney(paymentsData?.totals?.paidAmount)} ج.م`,   color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
                    { label: "قيد المراجعة",    value: `${fmtMoney(paymentsData?.totals?.pendingAmount)} ج.م`, color: "text-amber-700 bg-amber-50 border-amber-100" },
                    { label: "عدد المعاملات",    value: String(subPayments.length),                             color: "text-blue-700 bg-blue-50 border-blue-100" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
                      <p className="text-xl font-black">{s.value}</p>
                      <p className="text-xs font-medium mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-900 text-sm">سجل مدفوعات الاشتراكات</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs">
                          <th className="px-5 py-3 text-right font-semibold">رقم الإيصال</th>
                          <th className="px-5 py-3 text-right font-semibold">الوصف</th>
                          <th className="px-5 py-3 text-right font-semibold">المبلغ</th>
                          <th className="px-5 py-3 text-right font-semibold">الحالة</th>
                          <th className="px-5 py-3 text-right font-semibold">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {subPayments.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {row.refId}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ background: `${accent}18` }}>
                                  <Crown className="w-3.5 h-3.5" style={{ color: accent }} />
                                </div>
                                <span className="font-medium text-gray-800">
                                  {row.serviceTitle ?? "اشتراك في باقة"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-gray-900">{fmtMoney(row.amount)} ج.م</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                STATUS_STYLE[row.status] ?? STATUS_STYLE.pending
                              }`}>
                                {STATUS_LABEL[row.status] ?? row.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                              {fmtDate(row.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  <button onClick={() => navigate("/dashboard/payments")}
                    className="underline hover:text-gray-600">
                    عرض كل المدفوعات والمعاملات ←
                  </button>
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </ProviderLayout>
  );
}
