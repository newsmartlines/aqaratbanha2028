/**
 * DashboardStatCard — Shared stat/KPI card used by BOTH user and provider dashboards.
 *
 * Any visual change here (padding, animation, border-radius, typography, hover effect)
 * automatically propagates to ALL roles — no duplication needed.
 *
 * Role-specific differences are handled by passing different `stats` arrays from the
 * parent page; the card component itself is role-agnostic.
 */

import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import type { ElementType } from "react";

export interface StatCardConfig {
  label: string;
  value: number | string;
  icon: ElementType;
  color: string;
  bg: string;
  border?: string;
  accent?: string;
  href: string;
  suffix?: string;
}

interface DashboardStatCardProps extends StatCardConfig {
  loading?: boolean;
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border = "border-border/50",
  accent = "from-transparent",
  href,
  suffix,
  loading = false,
}: DashboardStatCardProps) {
  return (
    <Link href={href}>
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accent} to-transparent p-5 bg-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-80 ${border}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${color} transition-transform group-hover:scale-110`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <ArrowUpRight
            className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${color}`}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 bg-secondary/60 rounded-lg animate-pulse" />
            <div className="h-3 w-16 bg-secondary/40 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">
              {typeof value === "number"
                ? value.toLocaleString("ar-EG")
                : value}
            </p>
            {suffix && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {suffix}
              </p>
            )}
          </>
        )}

        <p className={`text-sm font-semibold mt-3 ${color}`}>{label}</p>
      </div>
    </Link>
  );
}
