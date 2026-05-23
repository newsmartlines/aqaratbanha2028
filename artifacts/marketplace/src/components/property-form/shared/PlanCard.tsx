import { Crown, Package, Star, Check, X, CheckCircle2, XCircle } from "lucide-react";
import type { BillingPlan } from "@/lib/api";

interface PlanCardProps {
  plan:     BillingPlan;
  selected: boolean;
  onSelect: () => void;
}

const LIMIT_LABELS: Record<string, string> = {
  properties: "العقارات",
  photos: "الصور",
  videos: "الفيديوهات",
  featuredAds: "إعلانات مميزة",
  pinnedAds: "إعلانات مثبتة",
  messages: "الرسائل",
  leads: "الطلبات",
};

const FEATURE_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch: "أعلى نتائج البحث",
  verifiedBadge: "شارة موثّق ✓",
  premiumBadge: "شارة Premium",
  prioritySupport: "دعم الأولوية",
  analytics: "إحصائيات متقدمة",
  seo: "تحسين SEO",
  aiTools: "أدوات الذكاء الاصطناعي",
  autoBoost: "رفع تلقائي للإعلانات",
};

function formatLimit(v: number) {
  return v < 0 ? "غير محدود" : v === 0 ? "—" : v.toLocaleString("ar");
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  let features: Record<string, boolean> = {};
  let limits:   Record<string, number>  = {};
  try { features = JSON.parse(plan.features ?? "{}"); } catch { /**/ }
  try { limits   = JSON.parse(plan.limits   ?? "{}"); } catch { /**/ }

  const isFree       = parseFloat(plan.price) === 0;
  const planColor    = plan.color ?? "#0d9488";
  const isRecommended = plan.isRecommended;
  const isPopular    = plan.isMostPopular;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-right rounded-2xl border-2 flex flex-col transition-all overflow-hidden ${
        selected
          ? "shadow-lg scale-[1.01]"
          : "border-border hover:shadow-md bg-white"
      }`}
      style={selected ? { borderColor: planColor, boxShadow: `0 4px 24px ${planColor}33` } : {}}
    >
      {/* Top badge */}
      {isRecommended && !selected && (
        <div className="text-white text-[10px] font-bold text-center py-1.5" style={{ backgroundColor: planColor }}>
          موصى به ⭐
        </div>
      )}
      {isPopular && !isRecommended && !selected && (
        <div className="bg-amber-500 text-white text-[10px] font-bold text-center py-1.5">
          الأكثر شعبية
        </div>
      )}
      {selected && (
        <div className="text-white text-[10px] font-bold text-center py-1.5" style={{ backgroundColor: planColor }}>
          ✓ الباقة المختارة
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: planColor + "22", border: `2px solid ${planColor}44` }}>
              {isFree
                ? <Package className="w-4 h-4" style={{ color: planColor }} />
                : isPopular || plan.sortOrder >= 3
                ? <Crown className="w-4 h-4" style={{ color: planColor }} />
                : <Star className="w-4 h-4" style={{ color: planColor }} />}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: planColor }}>
                {plan.nameAr ?? plan.name}
              </p>
              {plan.descriptionAr && (
                <p className="text-[10px] text-muted-foreground leading-tight">{plan.descriptionAr}</p>
              )}
            </div>
          </div>
          <div className="text-left shrink-0">
            {isFree ? (
              <p className="text-xl font-black" style={{ color: planColor }}>مجاني</p>
            ) : (
              <>
                <p className="text-xl font-black text-gray-900">
                  {plan.price}
                  <span className="text-xs font-normal text-muted-foreground"> ج.م/ش</span>
                </p>
                {plan.yearlyPrice && (
                  <p className="text-[10px] text-muted-foreground">{plan.yearlyPrice} / سنوي</p>
                )}
              </>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              عمولة: <strong>{plan.commissionPercent}%</strong>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Limits */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">الحدود</p>
          {Object.entries(LIMIT_LABELS).map(([key, label]) => {
            const val = limits[key] ?? 0;
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-bold text-xs ${val < 0 ? "text-green-600" : val === 0 ? "text-muted-foreground" : "text-gray-800"}`}>
                  {formatLimit(val)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Features */}
        <div className="space-y-1.5 flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">المزايا</p>
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const enabled = features[key];
            return (
              <div key={key} className={`flex items-center gap-1.5 text-xs ${enabled ? "" : "opacity-40"}`}>
                {enabled
                  ? <CheckCircle2 className="w-3 h-3 shrink-0 text-green-500" />
                  : <XCircle className="w-3 h-3 shrink-0 text-muted-foreground" />}
                <span className={enabled ? "text-gray-800" : "text-muted-foreground line-through"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Trial badge */}
        {plan.trialDays > 0 && (
          <div className="text-center text-[10px] font-semibold rounded-full py-1 px-3"
            style={{ backgroundColor: planColor + "18", color: planColor }}>
            {plan.trialDays} يوم تجريبي مجاناً
          </div>
        )}
      </div>
    </button>
  );
}
