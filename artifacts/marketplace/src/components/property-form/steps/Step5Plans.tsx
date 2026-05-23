import { Crown, Loader2, CheckCircle2, CreditCard, Building2, User } from "lucide-react";
import type { BillingPlan } from "@/lib/api";
import { PlanCard } from "../shared/PlanCard";

interface Step5PlansProps {
  plans:           BillingPlan[];
  plansLoading:    boolean;
  selectedPlan:    BillingPlan | null;
  setSelectedPlan: (plan: BillingPlan) => void;
  error:           string | null;
  accountType?:    "user" | "company";
}

const ACCOUNT_TYPE_META = {
  company: {
    icon: Building2,
    label: "شركة / وسيط عقاري",
    badge: "باقات الشركات والوسطاء",
    badgeClass: "bg-amber-50 border-amber-200 text-amber-800",
    iconClass: "text-amber-600",
    iconBg: "bg-amber-100",
    hint: "تشمل الباقات المتاحة لحسابك الباقات الشاملة للشركات والوسطاء.",
  },
  user: {
    icon: User,
    label: "مستخدم عادي",
    badge: "باقات الأفراد",
    badgeClass: "bg-teal-50 border-teal-200 text-teal-800",
    iconClass: "text-teal-600",
    iconBg: "bg-teal-100",
    hint: "تشمل الباقات المتاحة لحسابك الباقات المناسبة للأفراد والملاك.",
  },
};

export function Step5Plans({
  plans, plansLoading, selectedPlan, setSelectedPlan, error, accountType = "user",
}: Step5PlansProps) {
  const sorted = [...plans].sort(
    (a, b) => a.sortOrder - b.sortOrder || parseFloat(a.price) - parseFloat(b.price),
  );

  const meta = ACCOUNT_TYPE_META[accountType];
  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">اختر الباقة المناسبة</h2>
        <p className="text-sm text-muted-foreground">
          حدد باقتك وانشر إعلانك — يمكنك الترقية في أي وقت من لوحة التحكم
        </p>
      </div>

      {/* Account type badge */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.badgeClass}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.iconBg}`}>
          <Icon className={`w-4 h-4 ${meta.iconClass}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-0.5">نوع حسابك</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{meta.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
              {meta.badge}
            </span>
          </div>
          <p className="text-xs opacity-70 mt-0.5">{meta.hint}</p>
        </div>
      </div>

      {plansLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد باقات متاحة حالياً</p>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            sorted.length === 1 ? "grid-cols-1 max-w-sm mx-auto" :
            sorted.length === 2 ? "grid-cols-2" :
            sorted.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
            "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {sorted.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan?.id === plan.id}
              onSelect={() => setSelectedPlan(plan)}
            />
          ))}
        </div>
      )}

      {/* Selected plan summary */}
      {selectedPlan && (
        <div
          className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
            parseFloat(selectedPlan.price) > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-teal-50 border-teal-200"
          }`}
        >
          <div>
            <p className="font-bold text-sm">
              الباقة المختارة: {selectedPlan.nameAr ?? selectedPlan.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parseFloat(selectedPlan.price) === 0
                ? "الإعلان مجاني — سيُراجع فريقنا إعلانك قبل النشر"
                : `ستدفع ${selectedPlan.price} ${selectedPlan.currency} عبر بوابة الدفع لتفعيل الباقة`}
            </p>
          </div>
          {parseFloat(selectedPlan.price) > 0
            ? <CreditCard className="w-6 h-6 text-amber-600 shrink-0" />
            : <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
