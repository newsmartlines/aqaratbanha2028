import { Crown, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import type { BillingPlan } from "@/lib/api";
import { PlanCard } from "../shared/PlanCard";

interface Step5PlansProps {
  plans:           BillingPlan[];
  plansLoading:    boolean;
  selectedPlan:    BillingPlan | null;
  setSelectedPlan: (plan: BillingPlan) => void;
  error:           string | null;
}

export function Step5Plans({
  plans, plansLoading, selectedPlan, setSelectedPlan, error,
}: Step5PlansProps) {
  const sorted = [...plans].sort(
    (a, b) => a.sortOrder - b.sortOrder || parseFloat(a.price) - parseFloat(b.price),
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">اختر الباقة المناسبة</h2>
        <p className="text-sm text-muted-foreground">
          حدد باقتك وانشر إعلانك — يمكنك الترقية في أي وقت من لوحة التحكم
        </p>
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
        /* Horizontal scroll on small screens, grid on large */
        <div className="overflow-x-auto pb-2 -mx-1">
          <div
            className="flex gap-3 px-1"
            style={{ minWidth: `${sorted.length * 200}px` }}
          >
            {sorted.map((plan) => (
              <div
                key={plan.id}
                className="flex-1"
                style={{ minWidth: 180, maxWidth: sorted.length <= 3 ? "none" : 220 }}
              >
                <PlanCard
                  plan={plan}
                  selected={selectedPlan?.id === plan.id}
                  onSelect={() => setSelectedPlan(plan)}
                />
              </div>
            ))}
          </div>
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
                : `ستدفع ${selectedPlan.price} ${selectedPlan.currency} عبر STC Pay لتفعيل الباقة`}
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
