import type { Request, Response, NextFunction } from "express";
import { getSession } from "../routes/auth";
import { db } from "@workspace/db";
import { adminStaffTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type PermissionName =
  | "providers"
  | "users"
  | "orders"
  | "payments"
  | "settings"
  | "categories"
  | "reports"
  | "staff"
  | "listings"
  | "locations"
  | "support"
  | "subscriptions"
  | "commission";

function parsePermissions(raw: unknown): Record<string, boolean> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, boolean>;
  try {
    const obj = JSON.parse(String(raw));
    return obj && typeof obj === "object" ? (obj as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Allows the request if:
 *  - Session belongs to the seeded super-admin user (users.role === "admin"
 *    AND there is no admin_staff row by the same email — i.e. true root admin), OR
 *  - The signed-in user has an active admin_staff row whose permissions JSON
 *    contains `{ [permission]: true }` (or `{ all: true }` / role super_admin).
 *
 * Otherwise returns 403.
 */
export function requirePermission(permission: PermissionName) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const token =
      (req.cookies as Record<string, string>)?.session ??
      (req.headers.authorization as string | undefined)?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const session = await getSession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: "Session expired" });
    }

    try {
      const [user] = await db
        .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, session.userId));
      if (!user) {
        return res.status(401).json({ success: false, error: "User not found" });
      }

      // Look up matching staff record (if any) by email.
      const [staff] = await db
        .select()
        .from(adminStaffTable)
        .where(eq(adminStaffTable.email, user.email));

      // True super-admin (seeded admin user with no staff record) → allow all.
      if (user.role === "admin" && !staff) {
        return next();
      }

      // Staff super-admin → allow all.
      if (staff && staff.status === "active" && staff.role === "super_admin") {
        return next();
      }

      if (!staff || staff.status !== "active") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const perms = parsePermissions(staff.permissions);
      if (perms.all === true || perms[permission] === true) {
        return next();
      }

      return res
        .status(403)
        .json({ success: false, error: `Forbidden: missing '${permission}' permission` });
    } catch (e) {
      console.error("requirePermission error", e);
      return res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}

/** Helper to fetch effective permissions for a user (used by /auth/me). */
export async function getEffectivePermissions(userId: number): Promise<{
  staffRole: string | null;
  permissions: Record<string, boolean>;
  isSuperAdmin: boolean;
}> {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return { staffRole: null, permissions: {}, isSuperAdmin: false };

  const [staff] = await db
    .select()
    .from(adminStaffTable)
    .where(eq(adminStaffTable.email, user.email));

  // Seeded super-admin (no staff row but role admin) — full access.
  if (user.role === "admin" && !staff) {
    return { staffRole: "super_admin", permissions: { all: true }, isSuperAdmin: true };
  }
  if (!staff) return { staffRole: null, permissions: {}, isSuperAdmin: false };

  const permissions = parsePermissions(staff.permissions);
  const isSuperAdmin = staff.role === "super_admin";
  if (isSuperAdmin) permissions.all = true;
  return { staffRole: staff.role, permissions, isSuperAdmin };
}
