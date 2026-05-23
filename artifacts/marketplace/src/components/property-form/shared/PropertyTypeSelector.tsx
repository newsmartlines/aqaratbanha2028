import { useState, useEffect, useRef } from "react";
import {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, CheckCircle2,
  ArrowLeft, Lock, Tag, ChevronLeft,
  Coffee,
} from "lucide-react";
import { PROPERTY_GROUPS } from "../constants";
import type { FormValues } from "../types";

/* ─── Icon registry ─────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, any> = {
  Home, Building2, Trees, Briefcase, Warehouse, ShoppingBag,
  Layers, Stethoscope, Store, Utensils, Crown, Coffee,
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

/* ─── Animated section wrapper ──────────────────────────────────────────── */
function FadeIn({
  show, delay = 0, children,
}: { show: boolean; delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [show, delay]);

  return (
    <div
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0px)" : "translateY(14px)",
        transition: "opacity 0.38s cubic-bezier(.4,0,.2,1), transform 0.38s cubic-bezier(.4,0,.2,1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Step header ───────────────────────────────────────────────────────── */
function StepHeader({
  n, label, done, active, onReset,
}: { n: number; label: string; done: boolean; active: boolean; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-all duration-300"
          style={{
            background: done ? "#0d9488" : active ? "#f0fdfa" : "#f9fafb",
            color:      done ? "#fff"    : active ? "#0d9488" : "#9ca3af",
            boxShadow:  active ? "0 0 0 3px #ccfbf1" : "none",
            border:     done ? "none" : active ? "2px solid #0d9488" : "2px solid #e5e7eb",
          }}
        >
          {done ? <CheckCircle2 className="w-4 h-4" /> : n}
        </div>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: done || active ? "#111827" : "#9ca3af" }}>
          {label}
          {active && <span className="text-red-500 mr-0.5"> *</span>}
        </span>
        {done && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
            مكتمل ✓
          </span>
        )}
      </div>
      {done && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold text-gray-400 hover:text-teal-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-teal-50"
        >
          <ArrowLeft className="w-3 h-3" /> تغيير
        </button>
      )}
    </div>
  );
}

/* ─── Lock overlay ──────────────────────────────────────────────────────── */
function LockOverlay({ msg }: { msg: string }) {
  return (
    <div
      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center z-10 select-none"
      style={{
        background: "linear-gradient(135deg,rgba(249,250,251,0.92) 0%,rgba(243,244,246,0.90) 100%)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mb-1"
          style={{ background: "#f3f4f6", border: "2px dashed #d1d5db" }}
        >
          <Lock className="w-4.5 h-4.5 text-gray-400" />
        </div>
        <p className="text-xs font-extrabold text-gray-500 leading-snug">{msg}</p>
      </div>
    </div>
  );
}

/* ─── Ghost shimmer blocks ──────────────────────────────────────────────── */
function GhostRow({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 pointer-events-none"
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)`, opacity: 0.12, filter: "blur(4px)" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-gray-300 animate-pulse" />
      ))}
    </div>
  );
}

function GhostChips({ count = 5 }: { count?: number }) {
  const ws = [80, 64, 92, 70, 76, 60, 84];
  return (
    <div className="flex flex-wrap gap-2 pointer-events-none" style={{ opacity: 0.12, filter: "blur(4px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-gray-300" style={{ width: ws[i % ws.length] }} />
      ))}
    </div>
  );
}

function GhostCards({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 pointer-events-none" style={{ opacity: 0.12, filter: "blur(4px)" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-gray-300" />
      ))}
    </div>
  );
}

/* ─── Vertical connector ────────────────────────────────────────────────── */
function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex flex-col items-center py-1 gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 rounded-full transition-all duration-500"
          style={{
            height: 4,
            background: done ? "#14b8a6" : "#e5e7eb",
            transitionDelay: done ? `${i * 40}ms` : "0ms",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Group icon colours ────────────────────────────────────────────────── */
const GROUP_META: Record<string, { gradient: string; iconBg: string; selectedBg: string; selectedBorder: string }> = {
  residential: {
    gradient:       "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)",
    iconBg:         "#059669",
    selectedBg:     "#ecfdf5",
    selectedBorder: "#059669",
  },
  commercial: {
    gradient:       "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",
    iconBg:         "#2563eb",
    selectedBg:     "#eff6ff",
    selectedBorder: "#2563eb",
  },
  land: {
    gradient:       "linear-gradient(135deg,#fefce8 0%,#fef9c3 100%)",
    iconBg:         "#d97706",
    selectedBg:     "#fefce8",
    selectedBorder: "#d97706",
  },
};

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
interface PropertyTypeSelectorProps {
  v: FormValues;
  set: (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
}

export function PropertyTypeSelector({ v, set, onMainCategoryChange }: PropertyTypeSelectorProps) {
  const phase       = usePhase(v);
  const activeGroup = PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleGroupClick = (val: string) => {
    if (v.propertyGroup === val) return;
    set("propertyGroup",  val);
    set("mainCategory",   "");
    set("listingType",    "");
    set("features",       []);
    set("nearbyServices", []);
  };

  const handleGroupReset = () => {
    set("propertyGroup",  "");
    set("mainCategory",   "");
    set("listingType",    "");
    set("features",       []);
    set("nearbyServices", []);
  };

  const handleSubtypeClick = (val: string) => {
    set("listingType", "");
    if (onMainCategoryChange) onMainCategoryChange(val);
    else set("mainCategory", val);
  };

  const handleSubtypeReset = () => {
    set("mainCategory", "");
    set("listingType",  "");
  };

  /* ════════════════════════════════════════════════════════════════════ */
  /* BLOCK 1 — نوع العقار                                                 */
  /* ════════════════════════════════════════════════════════════════════ */
  const block1 = (
    <div
      className="rounded-2xl border-2 bg-white p-5 transition-all duration-400"
      style={{
        borderColor: phase >= 1 ? "#14b8a6" : "#e5e7eb",
        boxShadow: phase === 0 ? "0 2px 16px 0 rgba(20,184,166,.08)" : "none",
      }}
    >
      <StepHeader
        n={1}
        label="نوع العقار"
        done={phase >= 1}
        active={phase === 0}
        onReset={phase >= 1 ? handleGroupReset : undefined}
      />

      {/* Phase 0: all 3 group cards */}
      {phase === 0 && (
        <div className="grid grid-cols-3 gap-3">
          {PROPERTY_GROUPS.map((group) => {
            const Icon = resolveIcon(group.icon);
            const meta = GROUP_META[group.value] ?? GROUP_META["residential"];
            return (
              <button
                key={group.value}
                type="button"
                onClick={() => handleGroupClick(group.value)}
                className="group relative flex flex-col items-center text-center gap-3 py-5 px-2 rounded-2xl border-2 border-gray-200 bg-white font-semibold focus:outline-none transition-all duration-200 hover:shadow-md"
                style={{
                  "--hover-border": meta.selectedBorder,
                } as any}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = meta.selectedBorder;
                  (e.currentTarget as HTMLElement).style.background = meta.selectedBg;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLElement).style.background = "#fff";
                }}
              >
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: meta.iconBg, width: 52, height: 52 }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-800 mb-0.5">{group.label}</p>
                  <p className="text-[10px] text-gray-400 leading-tight hidden sm:block">{group.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Phase 1+: compact chip of selected group */}
      {phase >= 1 && activeGroup && (
        <FadeIn show={phase >= 1}>
          {(() => {
            const Icon = resolveIcon(activeGroup.icon);
            const meta = GROUP_META[activeGroup.value] ?? GROUP_META["residential"];
            return (
              <button
                type="button"
                onClick={handleGroupReset}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors hover:opacity-80"
                style={{ borderColor: meta.selectedBorder, background: meta.selectedBg, color: meta.iconBg }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: meta.iconBg }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </span>
                {activeGroup.label}
                <ChevronLeft className="w-3.5 h-3.5 opacity-50 rotate-180" />
              </button>
            );
          })()}
        </FadeIn>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* BLOCK 2 — نوع الوحدة                                                 */
  /* ════════════════════════════════════════════════════════════════════ */
  const isBlock2Locked = phase < 1;
  const block2 = (
    <div
      className="rounded-2xl border-2 bg-white p-5 transition-all duration-400"
      style={{
        borderStyle: isBlock2Locked ? "dashed" : "solid",
        borderColor: phase >= 2 ? "#14b8a6" : isBlock2Locked ? "#e5e7eb" : "#d1d5db",
        boxShadow: phase === 1 ? "0 2px 16px 0 rgba(20,184,166,.08)" : "none",
      }}
    >
      <StepHeader
        n={2}
        label="نوع الوحدة"
        done={phase >= 2}
        active={phase === 1}
        onReset={phase >= 2 ? handleSubtypeReset : undefined}
      />

      {/* Locked ghost */}
      {isBlock2Locked && (
        <div className="relative min-h-[56px]">
          <GhostChips count={6} />
          <LockOverlay msg="اختر نوع العقار أولًا" />
        </div>
      )}

      {/* Phase 1: subtype chips */}
      {phase === 1 && activeGroup && (
        <FadeIn show>
          <div className="flex flex-wrap gap-2">
            {activeGroup.subtypes.map((sub) => {
              const SubIcon = resolveIcon(sub.icon);
              const isActive = v.mainCategory === sub.value;
              return (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => handleSubtypeClick(sub.value)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 focus:outline-none"
                  style={{
                    borderColor: isActive ? "#0d9488" : "#e5e7eb",
                    background:  isActive ? "#f0fdfa" : "#fff",
                    color:       isActive ? "#0f766e" : "#374151",
                    boxShadow:   isActive ? "0 2px 8px rgba(13,148,136,.18)" : "none",
                    transform:   isActive ? "scale(1.04)" : "scale(1)",
                  }}
                >
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                  {!isActive && <SubIcon className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
                  {sub.label}
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* Phase 2+: compact chip */}
      {phase >= 2 && (
        <FadeIn show>
          <button
            type="button"
            onClick={handleSubtypeReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-teal-500 bg-teal-50 text-teal-700 font-bold text-sm hover:bg-teal-100 transition-colors"
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            {v.mainCategory}
            <ChevronLeft className="w-3 h-3 opacity-50 rotate-180" />
          </button>
        </FadeIn>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* BLOCK 3 — نوع الإعلان (للبيع / للإيجار)                              */
  /* ════════════════════════════════════════════════════════════════════ */
  const isBlock3Locked = phase < 2;

  const LISTING_OPTS = [
    {
      value:  "sale",
      label:  "للبيع",
      sub:    "بيع عقارك بأفضل سعر",
      emoji:  "🏷️",
      border: "#f59e0b",
      bg:     "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)",
      icon:   "#f59e0b",
      text:   "#78350f",
    },
    {
      value:  "rent",
      label:  "للإيجار",
      sub:    "أجّر عقارك شهريًا أو سنويًا",
      emoji:  "🔑",
      border: "#0d9488",
      bg:     "linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)",
      icon:   "#0d9488",
      text:   "#134e4a",
    },
  ];

  const block3 = (
    <div
      className="rounded-2xl border-2 bg-white p-5 transition-all duration-400"
      style={{
        borderStyle: isBlock3Locked ? "dashed" : "solid",
        borderColor: phase >= 3 ? "#14b8a6" : isBlock3Locked ? "#e5e7eb" : "#d1d5db",
        boxShadow: phase === 2 ? "0 2px 16px 0 rgba(20,184,166,.08)" : "none",
      }}
    >
      <StepHeader
        n={3}
        label="نوع الإعلان"
        done={phase >= 3}
        active={phase === 2}
        onReset={phase >= 3 ? () => set("listingType", "") : undefined}
      />

      {/* Locked ghost */}
      {isBlock3Locked && (
        <div className="relative min-h-[100px]">
          <GhostCards count={2} />
          <LockOverlay msg="اختر نوع الوحدة أولًا" />
        </div>
      )}

      {/* Phase 2: sale/rent cards */}
      {!isBlock3Locked && (
        <FadeIn show={phase >= 2} delay={60}>
          <div className="grid grid-cols-2 gap-3">
            {LISTING_OPTS.map((opt) => {
              const active = v.listingType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("listingType", opt.value)}
                  className="relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-right focus:outline-none transition-all duration-200 hover:shadow-lg"
                  style={{
                    borderColor: active ? opt.border : "#e5e7eb",
                    background:  active ? opt.bg     : "#fafafa",
                    transform:   active ? "scale(1.02) translateY(-1px)" : "scale(1)",
                    boxShadow:   active ? `0 6px 24px ${opt.border}28` : "0 1px 4px rgba(0,0,0,.04)",
                  }}
                >
                  {active && (
                    <span
                      className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center shadow"
                      style={{ background: opt.border }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                  <span className="text-3xl leading-none">{opt.emoji}</span>
                  <div>
                    <p
                      className="text-base font-extrabold leading-tight mb-1"
                      style={{ color: active ? opt.text : "#111827" }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-400 leading-snug">{opt.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* COMPLETION BANNER                                                     */
  /* ════════════════════════════════════════════════════════════════════ */
  const completionBanner = (
    <FadeIn show={phase === 3} delay={100}>
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4 border"
        style={{ background: "linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)", borderColor: "#5eead4" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow"
          style={{ background: "#0d9488" }}
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-teal-800">رائع! الاختيارات مكتملة</p>
          <p className="text-xs text-teal-600 mt-0.5 truncate">
            {PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup)?.label}
            {v.mainCategory && <> &middot; {v.mainCategory}</>}
            {v.listingType  && <> &middot; {v.listingType === "sale" ? "للبيع" : "للإيجار"}</>}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-extrabold px-4 py-2 rounded-xl text-white shrink-0 shadow"
          style={{ background: "#0d9488" }}
        >
          التالي
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </span>
      </div>
    </FadeIn>
  );

  /* ════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                */
  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div dir="rtl" className="flex flex-col" style={{ gap: 0 }}>
      {block1}
      <Connector done={phase >= 1} />
      {block2}
      <Connector done={phase >= 2} />
      {block3}
      {phase === 3 && (
        <div className="mt-3">
          {completionBanner}
        </div>
      )}
    </div>
  );
}
