import { useState, useEffect } from "react";
import {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, CheckCircle2,
  ChevronDown, Tag, ArrowLeft,
} from "lucide-react";
import { PROPERTY_GROUPS } from "../constants";
import type { FormValues } from "../types";

interface PropertyTypeSelectorProps {
  v: FormValues;
  set: (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
}

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, any> = {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown,
};

function resolveIcon(icon: any) {
  if (typeof icon === "function") return icon;
  if (typeof icon === "string" && ICON_MAP[icon]) return ICON_MAP[icon];
  return Building2;
}

/* phase 0 → 1 → 2 → 3 */
function usePhase(v: FormValues) {
  if (!v.propertyGroup) return 0;
  if (!v.mainCategory)  return 1;
  if (!v.listingType)   return 2;
  return 3;
}

/* ─── Step label ────────────────────────────────────────────────────────────── */
function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 transition-all duration-300"
      style={{
        background: done ? "#0d9488" : active ? "#e0f2f1" : "#f3f4f6",
        color:      done ? "#fff"    : active ? "#0d9488" : "#9ca3af",
        border:     done ? "none"    : active ? "1.5px solid #0d9488" : "1.5px solid #e5e7eb",
      }}
    >
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
    </span>
  );
}

/* ─── PHASE 0 / PHASE 1 chip showing chosen group ──────────────────────────── */
function SelectedGroupChip({
  group, onReset,
}: {
  group: typeof PROPERTY_GROUPS[number];
  onReset: () => void;
}) {
  const Icon = resolveIcon(group.icon);
  return (
    <button
      type="button"
      onClick={onReset}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-teal-500 bg-teal-50 text-teal-700 font-semibold text-sm transition-all duration-200 hover:bg-teal-100 group"
    >
      <span className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white" />
      </span>
      {group.label}
      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
    </button>
  );
}

/* ─── LOCK overlay ─────────────────────────────────────────────────────────── */
function LockOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-10 select-none"
      style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(5px)" }}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center pointer-events-none">
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-xs font-bold text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ─── Ghost placeholder rows ─────────────────────────────────────────────── */
function GhostChips({ count = 6 }: { count?: number }) {
  const widths = [72, 60, 80, 65, 70, 55, 68, 75];
  return (
    <div className="flex flex-wrap gap-2 pointer-events-none" style={{ opacity: 0.18, filter: "blur(3px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 rounded-xl bg-gray-300" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

function GhostCards({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 pointer-events-none" style={{ opacity: 0.18, filter: "blur(3px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-gray-300" />
      ))}
    </div>
  );
}

/* ─── Connector line ────────────────────────────────────────────────────── */
function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center" style={{ margin: "2px 0" }}>
      <div
        className="w-px rounded-full transition-all duration-500"
        style={{ height: 20, background: active ? "#2dd4bf" : "#e5e7eb" }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
export function PropertyTypeSelector({ v, set, onMainCategoryChange }: PropertyTypeSelectorProps) {
  const phase         = usePhase(v);
  const activeGroup   = PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup);

  /* tiny fade-in animation tracker */
  const [subtypesVisible, setSubtypesVisible]   = useState(false);
  const [listingVisible, setListingVisible]     = useState(false);
  const [completeVisible, setCompleteVisible]   = useState(false);

  useEffect(() => {
    if (phase >= 1) { const t = setTimeout(() => setSubtypesVisible(true), 60);  return () => clearTimeout(t); }
    setSubtypesVisible(false);
  }, [phase >= 1, v.propertyGroup]);

  useEffect(() => {
    if (phase >= 2) { const t = setTimeout(() => setListingVisible(true), 60);   return () => clearTimeout(t); }
    setListingVisible(false);
  }, [phase >= 2]);

  useEffect(() => {
    if (phase >= 3) { const t = setTimeout(() => setCompleteVisible(true), 80);  return () => clearTimeout(t); }
    setCompleteVisible(false);
  }, [phase >= 3]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleGroupClick = (groupValue: string) => {
    if (v.propertyGroup === groupValue) return;
    set("propertyGroup", groupValue);
    set("mainCategory",  "");
    set("listingType",   "");
    set("features",      []);
    set("nearbyServices",[]);
  };

  const handleGroupReset = () => {
    set("propertyGroup", "");
    set("mainCategory",  "");
    set("listingType",   "");
    set("features",      []);
    set("nearbyServices",[]);
  };

  const handleSubtypeClick = (value: string) => {
    set("listingType", "");
    if (onMainCategoryChange) onMainCategoryChange(value);
    else set("mainCategory", value);
  };

  const handleSubtypeReset = () => {
    set("mainCategory", "");
    set("listingType",  "");
  };

  /* ════════════════════════════════════════════════════════════════════ */
  /* STEP 1 — نوع العقار                                                  */
  /* ════════════════════════════════════════════════════════════════════ */
  const step1 = (
    <div
      className="rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300"
      style={{ borderColor: phase >= 1 ? "#5eead4" : "#e5e7eb" }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <StepBadge n={1} done={phase >= 1} active={phase === 0} />
          <span className="text-sm font-bold text-gray-700">
            نوع العقار <span className="text-red-500">*</span>
          </span>
        </div>
        {phase >= 1 && (
          <button
            type="button"
            onClick={handleGroupReset}
            className="text-xs text-gray-400 hover:text-teal-600 font-medium transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            تغيير
          </button>
        )}
      </div>

      {/* PHASE 0: all 3 groups */}
      {phase === 0 && (
        <div className="grid grid-cols-3 gap-3">
          {PROPERTY_GROUPS.map((group) => {
            const Icon = resolveIcon(group.icon);
            return (
              <button
                key={group.value}
                type="button"
                onClick={() => handleGroupClick(group.value)}
                className="relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 border-gray-200 font-semibold transition-all duration-200 text-center focus:outline-none hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-gray-700">{group.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">{group.desc}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* PHASE 1+: only selected group shown as compact chip */}
      {phase >= 1 && activeGroup && (
        <div
          style={{
            opacity:   subtypesVisible ? 1 : 0,
            transform: subtypesVisible ? "translateY(0)" : "translateY(-6px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          <SelectedGroupChip group={activeGroup} onReset={handleGroupReset} />
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* STEP 2 — نوع الوحدة                                                  */
  /* ════════════════════════════════════════════════════════════════════ */
  const isStep2Locked = phase < 1;
  const step2 = (
    <div
      className="rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300"
      style={{
        borderStyle: isStep2Locked ? "dashed" : "solid",
        borderColor: phase >= 2 ? "#5eead4" : isStep2Locked ? "#e5e7eb" : "#d1d5db",
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <StepBadge n={2} done={phase >= 2} active={phase === 1} />
          <span className="text-sm font-bold text-gray-700">
            نوع الوحدة <span className="text-red-500">*</span>
          </span>
        </div>
        {phase >= 2 && (
          <button
            type="button"
            onClick={handleSubtypeReset}
            className="text-xs text-gray-400 hover:text-teal-600 font-medium transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            تغيير
          </button>
        )}
      </div>

      {/* locked ghost */}
      {isStep2Locked && (
        <div className="relative">
          <GhostChips count={6} />
          <LockOverlay label="اختر نوع العقار أولًا" />
        </div>
      )}

      {/* PHASE 1: subtype chips */}
      {phase === 1 && activeGroup && (
        <div
          style={{
            opacity:   subtypesVisible ? 1 : 0,
            transform: subtypesVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <div className="flex flex-wrap gap-2">
            {activeGroup.subtypes.map((sub) => {
              const SubIcon = resolveIcon(sub.icon);
              return (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => handleSubtypeClick(sub.value)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-all duration-150 focus:outline-none hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm"
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 2+: selected subtype as compact chip */}
      {phase >= 2 && (
        <div
          style={{
            opacity:   listingVisible ? 1 : 0,
            transform: listingVisible ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          <button
            type="button"
            onClick={handleSubtypeReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-teal-500 bg-teal-50 text-teal-700 font-semibold text-sm hover:bg-teal-100 transition-colors group"
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            {v.mainCategory}
            <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
          </button>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* STEP 3 — نوع الإعلان                                                 */
  /* ════════════════════════════════════════════════════════════════════ */
  const isStep3Locked = phase < 2;

  const LISTING_OPTS = [
    {
      value: "sale",
      label: "للبيع",
      desc:  "بيع عقارك بأفضل سعر",
      accent: { border: "#f59e0b", bg: "#fffbeb", iconBg: "#f59e0b", text: "#92400e" },
      icon: "🏷️",
    },
    {
      value: "rent",
      label: "للإيجار",
      desc:  "أجّر عقارك شهرياً أو سنوياً",
      accent: { border: "#0d9488", bg: "#f0fdfa", iconBg: "#0d9488", text: "#134e4a" },
      icon: "🔑",
    },
  ];

  const step3 = (
    <div
      className="rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300"
      style={{
        borderStyle: isStep3Locked ? "dashed" : "solid",
        borderColor: phase >= 3 ? "#5eead4" : isStep3Locked ? "#e5e7eb" : "#d1d5db",
      }}
    >
      {/* header */}
      <div className="flex items-center gap-2.5 mb-4">
        <StepBadge n={3} done={phase >= 3} active={phase === 2} />
        <span className="text-sm font-bold text-gray-700">
          نوع الإعلان <span className="text-red-500">*</span>
        </span>
      </div>

      {/* locked ghost */}
      {isStep3Locked && (
        <div className="relative">
          <GhostCards count={2} />
          <LockOverlay label="اختر نوع الوحدة أولًا" />
        </div>
      )}

      {/* PHASE 2: listing type cards */}
      {!isStep3Locked && (
        <div
          style={{
            opacity:   listingVisible ? 1 : 0,
            transform: listingVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            {LISTING_OPTS.map((opt) => {
              const active = v.listingType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("listingType", opt.value)}
                  className="relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-right transition-all duration-200 focus:outline-none hover:shadow-md"
                  style={{
                    borderColor: active ? opt.accent.border : "#e5e7eb",
                    background:  active ? opt.accent.bg     : "#fff",
                    transform:   active ? "scale(1.02)"     : "scale(1)",
                    boxShadow:   active ? `0 4px 16px ${opt.accent.border}30` : undefined,
                  }}
                >
                  {active && (
                    <span
                      className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                      style={{ background: opt.accent.border }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                  <span className="text-2xl leading-none">{opt.icon}</span>
                  <div>
                    <p
                      className="text-base font-extrabold leading-tight"
                      style={{ color: active ? opt.accent.text : "#111827" }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* COMPLETION BANNER                                                     */
  /* ════════════════════════════════════════════════════════════════════ */
  const completionBanner = phase === 3 && (
    <div
      style={{
        opacity:   completeVisible ? 1 : 0,
        transform: completeVisible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{ background: "#f0fdfa", borderColor: "#99f6e4" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#0d9488" }}
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-teal-800">رائع! اختياراتك مكتملة</p>
          <p className="text-xs text-teal-600 mt-0.5">
            {v.propertyGroup && PROPERTY_GROUPS.find(g => g.value === v.propertyGroup)?.label}
            {v.mainCategory && <> · {v.mainCategory}</>}
            {v.listingType  && <> · {v.listingType === "sale" ? "للبيع" : "للإيجار"}</>}
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0 flex items-center gap-1"
          style={{ background: "#0d9488" }}
        >
          التالي
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </span>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                */
  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {step1}
      <Connector active={phase >= 1} />
      {step2}
      <Connector active={phase >= 2} />
      {step3}
      {phase === 3 && (
        <div style={{ marginTop: 12 }}>
          {completionBanner}
        </div>
      )}
    </div>
  );
}
