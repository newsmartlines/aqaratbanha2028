import { useState, useEffect } from "react";
import {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, CheckCircle2,
  ArrowLeft, Lock, Tag, ChevronLeft, Map,
} from "lucide-react";
import { PROPERTY_GROUPS } from "../constants";
import type { FormValues } from "../types";

/* ─── European colour palette per group ────────────────────────────────── */
const GROUP_PALETTE: Record<string, {
  bg: string; border: string; activeBorder: string;
  iconBg: string; iconColor: string; chipBg: string;
}> = {
  residential: {
    bg: "rgba(236,253,245,0.65)",
    border: "#a7f3d0",
    activeBorder: "#059669",
    iconBg: "#d1fae5",
    iconColor: "#065f46",
    chipBg: "#ecfdf5",
  },
  commercial: {
    bg: "rgba(239,246,255,0.65)",
    border: "#bfdbfe",
    activeBorder: "#2563eb",
    iconBg: "#dbeafe",
    iconColor: "#1e40af",
    chipBg: "#eff6ff",
  },
  land: {
    bg: "rgba(255,251,235,0.65)",
    border: "#fde68a",
    activeBorder: "#d97706",
    iconBg: "#fef3c7",
    iconColor: "#92400e",
    chipBg: "#fffbeb",
  },
};

const LISTING_PALETTE: Record<string, {
  bg: string; border: string; activeBorder: string; activeBg: string; dot: string;
}> = {
  sale: {
    bg: "#fff",
    border: "#e5e7eb",
    activeBorder: "#16a34a",
    activeBg: "rgba(240,253,244,0.9)",
    dot: "#16a34a",
  },
  rent: {
    bg: "#fff",
    border: "#e5e7eb",
    activeBorder: "#2563eb",
    activeBg: "rgba(239,246,255,0.9)",
    dot: "#2563eb",
  },
};

/* ─── Icon registry ─────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, any> = {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, Map,
};
function resolveIcon(icon: any) {
  if (typeof icon === "function") return icon;
  if (typeof icon === "string" && ICON_MAP[icon]) return ICON_MAP[icon];
  return Building2;
}

/* ─── Phase logic ───────────────────────────────────────────────────────── */
function usePhase(v: FormValues) {
  if (!v.propertyGroup) return 0;
  if (!v.mainCategory)  return 1;
  if (!v.listingType)   return 2;
  return 3;
}

/* ─── Animated section ──────────────────────────────────────────────────── */
function FadeIn({ show, delay = 0, children }: { show: boolean; delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [show, delay]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      pointerEvents: visible ? "auto" : "none",
    }}>
      {children}
    </div>
  );
}

/* ─── Step header ───────────────────────────────────────────────────────── */
function StepHeader({ n, label, done, active, accent, onReset }: {
  n: number; label: string; done: boolean; active: boolean; accent?: string; onReset?: () => void;
}) {
  const dotBg = done ? (accent ?? "#374151") : active ? "#fff" : "#f9fafb";
  const dotColor = done ? "#fff" : active ? "#374151" : "#9ca3af";
  const dotBorder = done ? "none" : active ? `1.5px solid ${accent ?? "#374151"}` : "1.5px solid #e5e7eb";
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300"
          style={{ background: dotBg, color: dotColor, border: dotBorder }}>
          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
        </div>
        <span className="text-sm font-bold" style={{ color: done || active ? "#111827" : "#9ca3af" }}>
          {label}{active && <span className="text-red-400 mr-0.5"> *</span>}
        </span>
      </div>
      {done && onReset && (
        <button type="button" onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-3 h-3" /> تغيير
        </button>
      )}
    </div>
  );
}

/* ─── Lock overlay ──────────────────────────────────────────────────────── */
function LockOverlay({ msg }: { msg: string }) {
  return (
    <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center z-10 select-none"
      style={{ background: "rgba(249,250,251,0.88)", backdropFilter: "blur(4px)" }}>
      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "#f3f4f6", border: "1.5px dashed #d1d5db" }}>
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <p className="text-xs font-semibold text-gray-400">{msg}</p>
      </div>
    </div>
  );
}

/* ─── Ghost blocks ──────────────────────────────────────────────────────── */
function GhostRow({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2 pointer-events-none"
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)`, opacity: 0.08, filter: "blur(3px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-gray-300" />
      ))}
    </div>
  );
}
function GhostChips({ count = 5 }: { count?: number }) {
  const ws = [72, 60, 80, 65, 70];
  return (
    <div className="flex flex-wrap gap-2 pointer-events-none" style={{ opacity: 0.08, filter: "blur(3px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg bg-gray-300" style={{ width: ws[i % ws.length] }} />
      ))}
    </div>
  );
}
function GhostCards() {
  return (
    <div className="grid grid-cols-2 gap-2 pointer-events-none" style={{ opacity: 0.08, filter: "blur(3px)" }}>
      {[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-300" />)}
    </div>
  );
}

/* ─── Connector ─────────────────────────────────────────────────────────── */
function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex justify-center py-0.5">
      <div className="w-px rounded-full transition-all duration-500" style={{ height: 14, background: done ? "#9ca3af" : "#e5e7eb" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export interface PropertyTypeSelectorProps {
  v: FormValues;
  set: (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
}

export function PropertyTypeSelector({ v, set, onMainCategoryChange }: PropertyTypeSelectorProps) {
  const phase = usePhase(v);
  const activeGroup = PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup);
  const pal = activeGroup ? GROUP_PALETTE[activeGroup.value] : undefined;

  const handleGroupClick = (val: string) => {
    if (v.propertyGroup === val) return;
    set("propertyGroup", val); set("mainCategory", ""); set("listingType", "");
    set("features", []); set("nearbyServices", []);
  };
  const handleGroupReset = () => {
    set("propertyGroup", ""); set("mainCategory", ""); set("listingType", "");
    set("features", []); set("nearbyServices", []);
  };
  const handleSubtypeClick = (val: string) => {
    set("listingType", "");
    if (onMainCategoryChange) onMainCategoryChange(val);
    else set("mainCategory", val);
  };
  const handleSubtypeReset = () => { set("mainCategory", ""); set("listingType", ""); };

  /* ── BLOCK 1 ── */
  const block1 = (
    <div className="rounded-xl border bg-white p-3.5 transition-all duration-300"
      style={{ borderColor: phase >= 1 ? (pal?.activeBorder ?? "#d1d5db") : "#e5e7eb" }}>
      <StepHeader n={1} label="نوع العقار" done={phase >= 1} active={phase === 0}
        accent={pal?.activeBorder} onReset={phase >= 1 ? handleGroupReset : undefined} />

      {phase === 0 && (
        <div className="grid grid-cols-3 gap-2">
          {PROPERTY_GROUPS.map((group) => {
            const p = GROUP_PALETTE[group.value];
            const Icon = resolveIcon(group.icon);
            return (
              <button key={group.value} type="button" onClick={() => handleGroupClick(group.value)}
                className="flex flex-col items-center text-center gap-1.5 py-3 px-2 rounded-xl border font-semibold transition-all duration-150 hover:shadow-sm focus:outline-none"
                style={{ borderColor: p.border, background: p.bg }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: p.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: p.iconColor }} />
                </div>
                <span className="text-xs font-bold" style={{ color: p.iconColor }}>{group.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {phase >= 1 && activeGroup && pal && (
        <FadeIn show>
          {(() => {
            const Icon = resolveIcon(activeGroup.icon);
            return (
              <button type="button" onClick={handleGroupReset}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors hover:opacity-80"
                style={{ borderColor: pal.border, background: pal.chipBg, color: pal.iconColor }}>
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: pal.iconBg }}>
                  <Icon className="w-3 h-3" style={{ color: pal.iconColor }} />
                </div>
                {activeGroup.label}
                <ChevronLeft className="w-3 h-3 opacity-40 rotate-180" />
              </button>
            );
          })()}
        </FadeIn>
      )}
    </div>
  );

  /* ── BLOCK 2 ── */
  const isBlock2Locked = phase < 1;
  const block2 = (
    <div className="rounded-xl border bg-white p-3.5 transition-all duration-300"
      style={{ borderStyle: isBlock2Locked ? "dashed" : "solid", borderColor: phase >= 2 ? (pal?.activeBorder ?? "#d1d5db") : "#e5e7eb" }}>
      <StepHeader n={2} label="نوع الوحدة" done={phase >= 2} active={phase === 1}
        accent={pal?.activeBorder} onReset={phase >= 2 ? handleSubtypeReset : undefined} />

      {isBlock2Locked && (
        <div className="relative"><GhostChips count={5} /><LockOverlay msg="اختر نوع العقار أولًا" /></div>
      )}

      {phase === 1 && activeGroup && pal && (
        <FadeIn show>
          <div className="flex flex-wrap gap-1.5">
            {activeGroup.subtypes.map((sub) => {
              const SubIcon = resolveIcon(sub.icon);
              const isActive = v.mainCategory === sub.value;
              return (
                <button key={sub.value} type="button" onClick={() => handleSubtypeClick(sub.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:outline-none"
                  style={{
                    borderColor: isActive ? pal.activeBorder : "#e5e7eb",
                    background: isActive ? pal.chipBg : "#fff",
                    color: isActive ? pal.iconColor : "#4b5563",
                  }}>
                  {isActive
                    ? <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: pal.activeBorder }} />
                    : <SubIcon className="w-3 h-3 text-gray-400 shrink-0" />}
                  {sub.label}
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      {phase >= 2 && pal && (
        <FadeIn show>
          <button type="button" onClick={handleSubtypeReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors hover:opacity-80"
            style={{ borderColor: pal.border, background: pal.chipBg, color: pal.iconColor }}>
            <Tag className="w-3 h-3 shrink-0" />{v.mainCategory}
            <ChevronLeft className="w-3 h-3 opacity-40 rotate-180" />
          </button>
        </FadeIn>
      )}
    </div>
  );

  /* ── BLOCK 3 ── */
  const isBlock3Locked = phase < 2;
  const LISTING_OPTS = [
    { value: "sale", label: "للبيع", desc: "بيع عقارك بأفضل سعر", emoji: "🏷️" },
    { value: "rent", label: "للإيجار", desc: "أجّر عقارك شهريًا أو سنويًا", emoji: "🔑" },
  ];

  const block3 = (
    <div className="rounded-xl border bg-white p-3.5 transition-all duration-300"
      style={{ borderStyle: isBlock3Locked ? "dashed" : "solid", borderColor: phase >= 3 ? "#d1d5db" : "#e5e7eb" }}>
      <StepHeader n={3} label="نوع الإعلان" done={phase >= 3} active={phase === 2}
        onReset={phase >= 3 ? () => set("listingType", "") : undefined} />

      {isBlock3Locked && (
        <div className="relative"><GhostCards /><LockOverlay msg="اختر نوع الوحدة أولًا" /></div>
      )}

      {!isBlock3Locked && (
        <FadeIn show={phase >= 2} delay={50}>
          <div className="grid grid-cols-2 gap-2">
            {LISTING_OPTS.map((opt) => {
              const lp = LISTING_PALETTE[opt.value];
              const active = v.listingType === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => set("listingType", opt.value)}
                  className="relative flex items-center gap-2.5 p-3 rounded-xl border-2 text-right focus:outline-none transition-all duration-150 hover:shadow-sm"
                  style={{
                    borderColor: active ? lp.activeBorder : lp.border,
                    background: active ? lp.activeBg : lp.bg,
                  }}>
                  {active && (
                    <span className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: lp.dot }}>
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}
    </div>
  );

  /* ── COMPLETION banner ── */
  const [completeVisible, setCompleteVisible] = useState(false);
  useEffect(() => {
    if (phase === 3) {
      const t = setTimeout(() => setCompleteVisible(true), 80);
      return () => clearTimeout(t);
    }
    setCompleteVisible(false);
    return undefined;
  }, [phase]);

  const completionBanner = phase === 3 && (
    <div style={{
      opacity: completeVisible ? 1 : 0,
      transform: completeVisible ? "translateY(0)" : "translateY(6px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{ borderColor: "#a7f3d0", background: "rgba(236,253,245,0.7)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#059669" }}>
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800">اختياراتك مكتملة — أكمل بيانات العقار أدناه</p>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup)?.label}
            {v.mainCategory && <> · {v.mainCategory}</>}
            {v.listingType && <> · {v.listingType === "sale" ? "للبيع" : "للإيجار"}</>}
          </p>
        </div>
        <ArrowLeft className="w-3.5 h-3.5 text-gray-400 rotate-180 shrink-0" />
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="flex flex-col" style={{ gap: 0 }}>
      {block1}
      <Connector done={phase >= 1} />
      {block2}
      <Connector done={phase >= 2} />
      {block3}
      {phase === 3 && <div className="mt-2">{completionBanner}</div>}
    </div>
  );
}
