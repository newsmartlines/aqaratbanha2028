import { Crown, Star, Shield, Check, Zap } from "lucide-react";
import type { BillingPlan } from "@/lib/api";

interface PlanCardProps {
  plan:     BillingPlan;
  selected: boolean;
  onSelect: () => void;
}

const LIMIT_LABELS: Record<string, string> = {
  properties:  "العقارات",
  photos:      "الصور",
  featuredAds: "إعلانات مميزة",
  pinnedAds:   "إعلانات مثبتة",
  messages:    "الرسائل",
  leads:       "الطلبات",
};

const FEATURE_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الرئيسية",
  topSearch:       "أعلى البحث",
  verifiedBadge:   "شارة موثّق ✓",
  premiumBadge:    "شارة Premium",
  prioritySupport: "دعم الأولوية",
  analytics:       "إحصائيات متقدمة",
  seo:             "تحسين SEO",
  aiTools:         "أدوات AI",
  autoBoost:       "رفع تلقائي",
};

function fmt(v: number) {
  return v < 0 ? "غير محدود" : v === 0 ? "—" : v.toLocaleString("ar-EG");
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  let features: Record<string, boolean> = {};
  let limits:   Record<string, number>  = {};
  try { features = JSON.parse(plan.features ?? "{}"); } catch { /**/ }
  try { limits   = JSON.parse(plan.limits   ?? "{}"); } catch { /**/ }

  const isFree    = parseFloat(plan.price) === 0;
  const accent    = plan.color ?? "#0d9488";
  const topFeats  = Object.entries(features).filter(([, v]) => v).slice(0, 3);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-right flex flex-col transition-all duration-200 overflow-hidden rounded-2xl border ${
        selected
          ? "shadow-2xl -translate-y-1"
          : "border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5"
      }`}
      style={selected ? {
        borderColor: accent,
        borderWidth: "2px",
        boxShadow: `0 20px 50px ${accent}22`,
      } : {}}
    >
      {/* Color strip */}
      <div className="h-1 w-full shrink-0 transition-colors duration-200"
        style={{ background: selected ? accent : "#e5e7eb" }} />

      {/* Badge row */}
      {(plan.isRecommended || plan.isMostPopular || selected) && (
        <div
          className="text-white text-[10px] font-black text-center py-1.5 uppercase tracking-wider"
          style={{ background: selected ? accent : plan.isRecommended ? accent : "#f59e0b" }}
        >
          {selected ? "✓ الباقة المختارة" : plan.isRecommended ? "موصى به ⭐" : "⭐ الأكثر طلباً"}
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon + name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}18` }}>
              {isFree
                ? <Shield className="w-4 h-4" style={{ color: accent }} />
                : (plan.sortOrder ?? 0) >= 3
                ? <Crown className="w-4 h-4" style={{ color: accent }} />
                : <Star className="w-4 h-4" style={{ color: accent }} />
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate" style={{ color: accent }}>
                {plan.nameAr ?? plan.name}
              </p>
              {plan.descriptionAr && (
                <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 mt-0.5">{plan.descriptionAr}</p>
              )}
            </div>
          </div>
          <div className="text-left shrink-0">
            {isFree ? (
              <p className="text-lg font-black" style={{ color: accent }}>مجاني</p>
            ) : (
              <>
                <p className="text-lg font-black text-gray-900 leading-tight">
                  {Number(plan.price).toLocaleString("ar-EG")}
                  <span className="text-xs font-normal text-gray-400"> {plan.currency}</span>
                </p>
                <p className="text-[10px] text-gray-400">/{plan.durationDays} يوم</p>
              </>
            )}
            {plan.commissionPercent && plan.commissionPercent !== "0" && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                عمولة <strong>{plan.commissionPercent}%</strong>
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Limits */}
        <div className="space-y-1">
          {Object.entries(LIMIT_LABELS).map(([key, label]) => {
            if (!Object.prototype.hasOwnProperty.call(limits, key)) return null;
            const val = limits[key];
            return (
              <div key={key} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">{label}</span>
                <span className={`font-bold ${val < 0 ? "text-green-600" : val === 0 ? "text-gray-300" : "text-gray-700"}`}>
                  {fmt(val)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Features */}
        {topFeats.length > 0 && (
          <div className="space-y-1 flex-1">
            {topFeats.map(([key]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px]">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accent}18` }}>
                  <Check className="w-2 h-2" style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-gray-600">{FEATURE_LABELS[key] ?? key}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trial */}
        {plan.trialDays > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]"
            style={{ color: accent }}>
            <Zap className="w-3 h-3 shrink-0" />
            <span className="font-semibold">{plan.trialDays} أيام تجريبية مجاناً</span>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          className="w-full py-2 rounded-xl font-bold text-sm transition-all duration-200 mt-1"
          style={selected
            ? { background: accent, color: "#fff" }
            : { background: "#f4f4f5", color: "#374151" }
          }
          onClick={e => { e.stopPropagation(); onSelect(); }}
        >
          {selected ? "✓ تم الاختيار" : isFree ? "ابدأ مجاناً" : "اختر"}
        </button>
      </div>
    </button>
  );
}
