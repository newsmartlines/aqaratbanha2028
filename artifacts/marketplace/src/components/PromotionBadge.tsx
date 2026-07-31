/**
 * PromotionBadge — Renders the correct visual badge for any promotion type.
 *
 * Usage:
 *   <PromotionBadge promotion={property.activePromotion} />
 *
 * The badge uses the type key (as stored in property_promotions.type) to pick
 * the right color, icon and label. Handles both the "paid" keys
 * (spotlight, featured_homepage, featured_category, urgent_badge, bump_up, premium_listing)
 * and the legacy quota-based keys (bump, featured, spotlight).
 */

import { Crown, Zap, Star, Pin, Flame, Sparkles, TrendingUp, Diamond } from "lucide-react";

// Shape returned by both /api/properties list and /api/properties/:id
export interface ActivePromotion {
  type: string;
  boostScore: number;
  expiresAt: Date | string | null;
}

interface BadgeConfig {
  label: string;
  Icon: React.ElementType;
  bg: string;          // background hex
  text: string;        // text hex
  glow?: string;       // box-shadow color (rgba) — only for high-tier promos
  border?: string;     // border hex override
}

const BADGE_MAP: Record<string, BadgeConfig> = {
  premium_listing: {
    label: "بريميوم",
    Icon: Diamond,
    bg: "#6D28D9",
    text: "#fff",
    glow: "rgba(109,40,217,0.5)",
    border: "#6D28D9",
  },
  spotlight: {
    label: "مبرز",
    Icon: Sparkles,
    bg: "#7C3AED",
    text: "#fff",
    glow: "rgba(124,58,237,0.45)",
    border: "#7C3AED",
  },
  featured_homepage: {
    label: "مميز",
    Icon: Crown,
    bg: "#F59E0B",
    text: "#fff",
    glow: "rgba(245,158,11,0.5)",
    border: "#F59E0B",
  },
  featured: {          // legacy quota type
    label: "مميز",
    Icon: Crown,
    bg: "#F59E0B",
    text: "#fff",
    glow: "rgba(245,158,11,0.5)",
    border: "#F59E0B",
  },
  featured_category: {
    label: "مثبت",
    Icon: Pin,
    bg: "#F97316",
    text: "#fff",
    border: "#F97316",
  },
  urgent_badge: {
    label: "عاجل",
    Icon: Flame,
    bg: "#EF4444",
    text: "#fff",
    border: "#EF4444",
  },
  bump_up: {
    label: "مرفوع",
    Icon: TrendingUp,
    bg: "#3B82F6",
    text: "#fff",
    border: "#3B82F6",
  },
  bump: {              // legacy quota type
    label: "مرفوع",
    Icon: TrendingUp,
    bg: "#3B82F6",
    text: "#fff",
    border: "#3B82F6",
  },
};

// ── Card-level border/ring styling utilities ──────────────────────────────────

/** Returns Tailwind-compatible inline styles for a card that has a promotion. */
export function getPromotionCardStyle(
  promotion: ActivePromotion | null | undefined
): React.CSSProperties {
  if (!promotion) return {};
  const cfg = BADGE_MAP[promotion.type];
  if (!cfg) return {};

  const base: React.CSSProperties = {
    borderColor: cfg.border ?? cfg.bg,
    borderWidth: "2px",
    borderStyle: "solid",
  };

  if (cfg.glow) {
    base.boxShadow = `0 0 0 3px ${cfg.bg}22, 0 4px 20px ${cfg.glow}`;
  }

  return base;
}

// ── Badge component ───────────────────────────────────────────────────────────

interface Props {
  promotion: ActivePromotion | null | undefined;
  size?: "sm" | "md";
}

export function PromotionBadge({ promotion, size = "sm" }: Props) {
  if (!promotion) return null;
  const cfg = BADGE_MAP[promotion.type];
  if (!cfg) return null;

  const { label, Icon, bg, text, glow } = cfg;

  const isMd = size === "md";

  return (
    <span
      className={`inline-flex items-center gap-1 font-black rounded-full tracking-wide
        ${isMd ? "text-xs px-3 py-1.5" : "text-[10px] px-2 py-0.5"}`}
      style={{
        background: bg,
        color: text,
        boxShadow: glow
          ? `0 3px 12px ${glow}, 0 1px 3px rgba(0,0,0,0.2)`
          : "0 1px 3px rgba(0,0,0,0.15)",
        border: "1.5px solid rgba(255,255,255,0.3)",
        textShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}
    >
      <Icon className={`shrink-0 drop-shadow ${isMd ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`} />
      {label}
    </span>
  );
}

/** Returns a human-readable tier label for a promotion type (used in detail pages). */
export function getPromotionTierLabel(type: string): string {
  return BADGE_MAP[type]?.label ?? "";
}

/** Returns true if the promotion type should receive spotlight-level card styling. */
export function isHighTierPromotion(type: string): boolean {
  return ["premium_listing", "spotlight"].includes(type);
}
