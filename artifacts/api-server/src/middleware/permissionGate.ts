import type { Request, Response, NextFunction } from "express";
import { getEffectivePermissions } from "./requirePermission";
import { getSession } from "../routes/auth";

/**
 * Maps a URL path under /api/admin/* to the permission name required to access it.
 * Returns null if no permission is required (still gated by adminOnly upstream).
 */
function permissionForPath(path: string): string | null {
  // Strip /admin prefix and any trailing slash
  const stripped = path.replace(/^\/admin/, "").replace(/^\/+/, "");
  const first = (stripped.split("/")[0] ?? "").toLowerCase();
  switch (first) {
    case "":
    case "dashboard":
    case "sidebar-counts":
    case "notifications":
    case "stats":
    case "overview":
      // Always allowed for any active staff (info-only).
      return null;
    case "providers":
    case "companies":
      return "providers";
    case "users":
      return "users";
    case "staff":
      return "staff";
    case "listings":
    case "services":
      return "listings";
    case "categories":
    case "subcategories":
      return "categories";
    case "locations":
    case "regions":
    case "cities":
    case "areas":
      return "locations";
    case "orders":
    case "requests":
      return "orders";
    case "support-tickets":
    case "support":
      return "support";
    case "payments":
      return "payments";
    case "commission":
      return "commission";
    case "subscriptions":
    case "packages":
      return "subscriptions";
    case "reports":
      return "reports";
    case "settings":
      return "settings";
    case "ads":
    case "promotions":
    case "featured-areas":
    case "billing-plans":
    case "email-templates":
    case "popups":
    case "backup":
      return "settings";
    default:
      return null;
  }
}

/**
 * Permission gate that runs AFTER adminOnly. Reads the path being requested,
 * resolves the required permission name, and checks the staff record. Seeded
 * super-admin (users.role === "admin" with no staff row) and staff super_admin
 * always pass.
 */
export async function permissionGate(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/admin")) return next();

  const required = permissionForPath(req.path);
  if (!required) return next();

  const token =
    (req.cookies as Record<string, string>)?.session ??
    (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });
  const session = await getSession(token);
  if (!session) return res.status(401).json({ success: false, error: "Session expired" });

  try {
    const { permissions, isSuperAdmin } = await getEffectivePermissions(session.userId);
    if (isSuperAdmin || permissions.all === true || permissions[required] === true) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `Forbidden: missing '${required}' permission`,
    });
  } catch {
    return res.status(500).json({ success: false, error: "Permission check failed" });
  }
}
