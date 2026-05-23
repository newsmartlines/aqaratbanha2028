import { Lock, CheckCircle2 } from "lucide-react";
import {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, MapPin,
} from "lucide-react";
import { PROPERTY_GROUPS } from "../constants";
import type { FormValues } from "../types";

interface PropertyTypeSelectorProps {
  v:                    FormValues;
  set:                  (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
}

/* ── Locked overlay ────────────────────────────────────────────────────── */
function LockedOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-10"
      style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
          <Lock className="w-4.5 h-4.5 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-500">{message}</p>
      </div>
    </div>
  );
}

/* ── Step header ───────────────────────────────────────────────────────── */
function StepHeader({
  step, label, done,
}: { step: number; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors duration-300 ${
          done
            ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
            : "bg-gray-100 border-2 border-gray-200 text-gray-500"
        }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <p className="text-sm font-bold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </p>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */
export function PropertyTypeSelector({ v, set, onMainCategoryChange }: PropertyTypeSelectorProps) {
  const activeGroup = PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup);

  const phase = !v.propertyGroup ? 0 : !v.mainCategory ? 1 : !v.listingType ? 2 : 3;

  const handleGroupClick = (groupValue: string) => {
    if (v.propertyGroup === groupValue) return;
    set("propertyGroup", groupValue);
    set("mainCategory", "");
    set("listingType", "");
    set("features", []);
    set("nearbyServices", []);
  };

  const handleSubtypeClick = (value: string) => {
    set("listingType", "");
    if (onMainCategoryChange) {
      onMainCategoryChange(value);
    } else {
      set("mainCategory", value);
    }
  };

  /* ── STEP 1 ── نوع العقار */
  const step1 = (
    <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-sm transition-all duration-300">
      <StepHeader step={1} label="نوع العقار" done={phase >= 1} />
      <div className="grid grid-cols-3 gap-3">
        {PROPERTY_GROUPS.map((group) => {
          const Icon = group.icon;
          const active = v.propertyGroup === group.value;
          return (
            <button
              key={group.value}
              type="button"
              onClick={() => handleGroupClick(group.value)}
              className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 font-semibold transition-all duration-200 text-center focus:outline-none ${
                active
                  ? "border-teal-600 bg-teal-50 shadow-sm shadow-teal-100"
                  : "border-border hover:border-teal-300 hover:bg-gray-50"
              }`}
            >
              {active && (
                <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                active ? "bg-teal-600 text-white shadow-md shadow-teal-200" : "bg-gray-100 text-gray-500"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-bold ${active ? "text-teal-700" : "text-gray-700"}`}>
                {group.label}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                {group.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── STEP 2 ── نوع الوحدة */
  const isStep2Locked = phase < 1;
  const step2 = (
    <div
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300 ${
        isStep2Locked ? "border-dashed border-gray-200" : "border-border"
      } ${phase >= 2 ? "border-teal-200" : ""}`}
    >
      <StepHeader step={2} label="نوع الوحدة" done={phase >= 2} />
      <div className="relative">
        {/* Ghost blurred chips shown behind the overlay when locked */}
        {isStep2Locked && (
          <div className="flex flex-wrap gap-2 select-none pointer-events-none" style={{ filter: "blur(3px)", opacity: 0.25 }}>
            {[72, 60, 80, 65, 70, 55].map((w, i) => (
              <div key={i} className="h-9 rounded-xl border-2 border-gray-200 bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        )}

        {isStep2Locked && <LockedOverlay message="اختر نوع العقار أولًا" />}

        {!isStep2Locked && activeGroup && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeGroup.subtypes.map((sub) => {
              const SubIcon = sub.icon;
              const active = v.mainCategory === sub.value;
              return (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => handleSubtypeClick(sub.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 focus:outline-none ${
                    active
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                      : "border-border bg-white hover:border-teal-300 hover:bg-teal-50 text-gray-700"
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0" />
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  /* ── STEP 3 ── نوع الإعلان */
  const isStep3Locked = phase < 2;
  const LISTING_OPTS = [
    { value: "sale", label: "للبيع",   desc: "بيع عقارك بأفضل سعر",          color: "amber", bg: "bg-amber-50", border: "border-amber-200" },
    { value: "rent", label: "للإيجار", desc: "أجّر عقارك شهرياً أو سنوياً", color: "teal",  bg: "bg-teal-50",  border: "border-teal-200"  },
  ];
  const step3 = (
    <div
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300 ${
        isStep3Locked ? "border-dashed border-gray-200" : "border-border"
      } ${phase >= 3 ? "border-teal-200" : ""}`}
    >
      <StepHeader step={3} label="نوع الإعلان" done={phase >= 3} />
      <div className="relative">
        {/* Ghost blurred listing buttons */}
        {isStep3Locked && (
          <div className="grid grid-cols-2 gap-3 select-none pointer-events-none" style={{ filter: "blur(3px)", opacity: 0.25 }}>
            {LISTING_OPTS.map((opt) => (
              <div key={opt.value} className={`h-20 rounded-2xl border-2 ${opt.border} ${opt.bg}`} />
            ))}
          </div>
        )}

        {isStep3Locked && <LockedOverlay message="اختر نوع الوحدة أولًا" />}

        {!isStep3Locked && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {LISTING_OPTS.map((opt) => {
              const active = v.listingType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("listingType", opt.value)}
                  className={`relative flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-right transition-all duration-150 focus:outline-none ${
                    active
                      ? opt.value === "sale"
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-teal-600 bg-teal-50 shadow-sm"
                      : "border-border hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {active && (
                    <span className={`absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center ${
                      opt.value === "sale" ? "bg-amber-500" : "bg-teal-600"
                    }`}>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <span className={`text-lg font-extrabold ${
                    active
                      ? opt.value === "sale" ? "text-amber-600" : "text-teal-700"
                      : "text-gray-800"
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Connector line between steps ── */
  const connector = (active: boolean) => (
    <div className="flex justify-center my-1">
      <div className={`w-0.5 h-4 rounded-full transition-colors duration-300 ${active ? "bg-teal-400" : "bg-gray-200"}`} />
    </div>
  );

  return (
    <div className="space-y-0">
      {step1}
      {connector(phase >= 1)}
      {step2}
      {connector(phase >= 2)}
      {step3}

      {/* Completion hint */}
      {phase === 3 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-3 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold text-teal-700">
            رائع! يمكنك الانتقال للخطوة التالية الآن
          </span>
        </div>
      )}
    </div>
  );
}
