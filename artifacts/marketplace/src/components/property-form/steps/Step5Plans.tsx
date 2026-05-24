import { Loader2, Crown, Check, CreditCard, CheckCircle2 } from "lucide-react";
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

export function Step5Plans({
  plans, plansLoading, selectedPlan, setSelectedPlan, error,
}: Step5PlansProps) {
  const sorted = [...plans].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || parseFloat(a.price) - parseFloat(b.price),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-widest">آخر خطوة</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">اختر الباقة المناسبة</h2>
        <p className="text-sm text-gray-400">
          الباقات من لوحة الإدارة — يمكنك الترقية في أي وقت
        </p>
      </div>

      {plansLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد باقات متاحة حالياً</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${
          sorted.length === 1 ? "grid-cols-1 max-w-xs mx-auto" :
          sorted.length === 2 ? "grid-cols-2" :
          sorted.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
          "grid-cols-2 sm:grid-cols-4"
        }`}>
          {sorted.map(plan => (
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
          className="rounded-xl p-4 border flex items-center justify-between gap-3 transition-all"
          style={{
            background: `${selectedPlan.color || "#0d9488"}08`,
            borderColor: `${selectedPlan.color || "#0d9488"}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: selectedPlan.color || "#0d9488" }}>
              {parseFloat(selectedPlan.price) === 0
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : <CreditCard className="w-4 h-4 text-white" />
              }
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">
                الباقة المختارة: {selectedPlan.nameAr ?? selectedPlan.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {parseFloat(selectedPlan.price) === 0
                  ? "⚡ نشر مجاني — سيُراجع إعلانك قبل النشر"
                  : `💳 ستدفع ${selectedPlan.price} ${selectedPlan.currency} لتفعيل الباقة`
                }
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 underline shrink-0"
            onClick={() => {
              const cheaper = sorted.find(p => parseFloat(p.price) < parseFloat(selectedPlan!.price));
              if (cheaper) setSelectedPlan(cheaper);
            }}>
            تغيير
          </p>
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
