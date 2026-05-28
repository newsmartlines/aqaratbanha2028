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
      <div className="h-1.5 w-full shrink-0 transition-colors duration-200"
        style={{ background: selected ? accent : "#e5e7eb" }} />

      {/* Badge row */}
      {(plan.isRecommended || plan.isMostPopular || selected) && (
        <div
          className="text-white text-xs font-black text-center py-2 uppercase tracking-wider"
          style={{ background: selected ? accent : plan.isRecommended ? accent : "#f59e0b" }}
        >
          {selected ? "✓ الباقة المختارة" : plan.isRecommended ? "موصى به ⭐" : "⭐ الأكثر طلباً"}
        </div>
      )}

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Icon + name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}18` }}>
              {isFree
                ? <Shield className="w-5 h-5" style={{ color: accent }} />
                : (plan.sortOrder ?? 0) >= 3
                ? <Crown className="w-5 h-5" style={{ color: accent }} />
                : <Star className="w-5 h-5" style={{ color: accent }} />
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight truncate" style={{ color: accent }}>
                {plan.nameAr ?? plan.name}
              </p>
              {plan.descriptionAr && (
                <p className="text-xs text-gray-400 leading-snug line-clamp-2 mt-0.5">{plan.descriptionAr}</p>
              )}
            </div>
          </div>
          <div className="text-left shrink-0">
            {isFree ? (
              <p className="text-xl font-black" style={{ color: accent }}>مجاني</p>
            ) : (
              <>
                <p className="text-xl font-black text-gray-900 leading-tight">
                  {Number(plan.price).toLocaleString("ar-EG")}
                  <span className="text-sm font-normal text-gray-500"> {plan.currency}</span>
                </p>
                <p className="text-xs text-gray-500 text-left">/{plan.durationDays} يوم</p>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Limits */}
        <div className="space-y-2">
          {Object.entries(LIMIT_LABELS).map(([key, label]) => {
            if (!Object.prototype.hasOwnProperty.call(limits, key)) return null;
            const val = limits[key];
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold text-sm ${val < 0 ? "text-green-600" : val === 0 ? "text-gray-400" : "text-gray-900"}`}>
                  {fmt(val)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Features */}
        {topFeats.length > 0 && (
          <div className="space-y-1.5 flex-1">
            {topFeats.map(([key]) => (
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

        {/* Trial */}
        {plan.trialDays > 0 && (
          <div className="flex items-center gap-1.5 text-sm"
            style={{ color: accent }}>
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">{plan.trialDays} أيام تجريبية مجاناً</span>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 mt-1"
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
