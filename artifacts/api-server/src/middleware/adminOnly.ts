import type { Request, Response, NextFunction } from "express";
import { getSession } from "../routes/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { adminStaffTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

/**
 * Gate for /api/admin/*: allow seeded admins AND any active staff member.
 * Granular gating (which admin route they can hit) is enforced separately by
 * `requirePermission(name)` mounted on individual routes.
 */
export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");

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
    if (user.role === "admin") return next();

    const [staff] = await db
      .select({ id: adminStaffTable.id, status: adminStaffTable.status })
      .from(adminStaffTable)
      .where(eq(adminStaffTable.email, user.email));
    if (staff && staff.status === "active") return next();
  } catch {
    // ignore DB error
  }

  return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
}
