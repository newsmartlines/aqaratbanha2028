/**
 * Admin Audit Trail Middleware
 *
 * Attaches to every mutation (POST / PUT / PATCH / DELETE) on /api/admin/*.
 * After the response is sent it writes a structured audit log entry so
 * administrators can see exactly who changed what, from which IP, and when.
 */

import type { Request, Response, NextFunction } from "express";
import { getSession }         from "../routes/auth";
import { db }                 from "@workspace/db";
import { usersTable }         from "@workspace/db";
import { eq }                 from "drizzle-orm";
import { writeAuditLog, sanitiseBody } from "../lib/auditLog";

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function adminAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only instrument admin mutations
  if (!MUTATIONS.has(req.method) || !req.path.startsWith("/admin")) {
    return next();
  }

  const startedAt = Date.now();

  // Patch res.json so we can capture the status code after it's set
  const originalJson = res.json.bind(res);
  (res as any).json = function (body: unknown) {
    (res as any).json = originalJson; // restore immediately

    const statusCode = res.statusCode;

    // Fire-and-forget — never block the response
    setImmediate(async () => {
      try {
        const token =
          (req.cookies as Record<string, string> | undefined)?.session ??
          (req.headers.authorization as string | undefined)
            ?.replace(/^Bearer\s+/i, "");

        let userId: number | undefined;
        let email: string | undefined;

        if (token) {
          const session = await getSession(token);
          if (session) {
            userId = session.userId;
            const [user] = await db
              .select({ email: usersTable.email })
              .from(usersTable)
              .where(eq(usersTable.id, session.userId));
            email = user?.email;
          }
        }

        writeAuditLog({
          ts:         new Date().toISOString(),
          ip:         String(req.ip ?? req.socket?.remoteAddress ?? "unknown"),
          userId,
          email,
          method:     req.method,
          path:       req.path,
          status:     statusCode,
          durationMs: Date.now() - startedAt,
          body:       sanitiseBody(req.body),
        });
      } catch { /* never crash on audit failure */ }
    });

    return originalJson(body);
  };

  next();
}
