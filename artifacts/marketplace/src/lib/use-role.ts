/**
 * useRole — Unified role hook for the shared dashboard.
 *
 * Single source of truth for role-based rendering across ALL dashboard pages.
 * Import this instead of manually deriving `isProvider` from useAuth().
 *
 * Usage:
 *   const { isProvider, isUser, role, user, providerId } = useRole();
 *
 *   {isProvider && <ProviderOnlySection />}
 *   {isUser     && <UserOnlySection />}
 */

import { useAuth } from "./auth-context";

export type DashboardRole = "user" | "provider";

export interface RoleInfo {
  role: DashboardRole;
  isProvider: boolean;
  isUser: boolean;
  providerId: number | null;
  user: ReturnType<typeof useAuth>["user"];
  loading: boolean;
}

export function useRole(): RoleInfo {
  const { user, loading } = useAuth();
  const role = (user?.role === "provider" ? "provider" : "user") as DashboardRole;

  return {
    role,
    isProvider: role === "provider",
    isUser: role === "user",
    providerId: user?.providerId ?? null,
    user,
    loading,
  };
}
