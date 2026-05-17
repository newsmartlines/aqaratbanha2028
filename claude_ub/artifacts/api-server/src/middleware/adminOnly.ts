import type { Request, Response, NextFunction } from "express";
import { getSession } from "../routes/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: "Session expired" });
  }

  if (session.role === "admin") {
    return next();
  }

  // Fallback: verify from DB in case role wasn't cached in session
  try {
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, session.userId));
    if (user?.role === "admin") return next();
  } catch {
    // ignore DB error
  }

  return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
}
