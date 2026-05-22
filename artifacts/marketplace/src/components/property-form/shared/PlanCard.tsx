import { Building2, ImagePlus, Star, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BillingPlan } from "@/lib/api";
import { PLAN_LABELS } from "../constants";

interface PlanCardProps {
  plan:     BillingPlan;
  selected: boolean;
  onSelect: () => void;
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  let features: Record<string, boolean> = {};
  let limits:   Record<string, number>  = {};
  try { features = JSON.parse(plan.features); } catch { /**/ }
  try { limits   = JSON.parse(plan.limits);   } catch { /**/ }

  const isFree = parseFloat(plan.price) === 0;
  const activeFeatures = Object.entries(features).filter(([, v]) => v);
  const props  = limits.properties === -1 ? "غير محدود" : `${limits.properties ?? 0}`;
  const photos = limits.photos     === -1 ? "غير محدود" : `${limits.photos     ?? 0}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-right rounded-2xl border-2 p-5 transition-all flex flex-col gap-3 ${
        selected
          ? "border-teal-600 bg-teal-50 shadow-lg shadow-teal-100"
          : "border-border hover:border-teal-300 hover:bg-secondary/30 bg-white"
      }`}
    >
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shadow">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="flex items-start gap-2 flex-wrap min-h-[20px]">
        {plan.isMostPopular && (
          <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5">الأكثر طلباً</Badge>
        )}
        {plan.isRecommended && (
          <Badge className="bg-teal-600 text-white text-[10px] px-2 py-0.5">موصى به</Badge>
        )}
        {plan.trialDays > 0 && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-teal-400 text-teal-700">
            {plan.trialDays} يوم مجاناً
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-foreground">{plan.nameAr ?? plan.name}</p>
          {plan.descriptionAr && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.descriptionAr}</p>
          )}
        </div>
        <div className="text-left shrink-0">
          {isFree ? (
            <p className="text-2xl font-black text-teal-600">مجاني</p>
          ) : (
            <>
              <p className="text-2xl font-black text-foreground">
                {plan.price}
                <span className="text-sm font-semibold text-muted-foreground mr-1">{plan.currency}</span>
              </p>
              <p className="text-xs text-muted-foreground">/ شهر</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{props}</span> عقار
        </span>
        <span className="flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{photos}</span> صورة
        </span>
        {(limits.featuredAds ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">
              {limits.featuredAds === -1 ? "∞" : limits.featuredAds}
            </span> مميز
          </span>
        )}
      </div>

      {activeFeatures.length > 0 && (
        <div className="space-y-1.5">
          {activeFeatures.slice(0, 4).map(([key]) => {
            if (!PLAN_LABELS[key]) return null;
            return (
              <div key={key} className="flex items-center gap-2 text-xs text-foreground">
                <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-teal-600" />
                </div>
                {PLAN_LABELS[key]}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}
