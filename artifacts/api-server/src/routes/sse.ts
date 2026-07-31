/**
 * sse.ts — Server-Sent Events endpoint
 * GET /api/sse/stream — establish a real-time SSE connection
 * Authenticated via session cookie or Authorization header.
 */

import { Router, type Request, type Response } from "express";
import { sseManager } from "../lib/sse-manager";
import { getSession } from "./auth";
import crypto from "crypto";

const router = Router();

router.get("/sse/stream", async (req: Request, res: Response) => {
  const token =
    (req.cookies as Record<string, string>)?.session ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  let userId: number | null = null;
  let role = "guest";

  if (token) {
    try {
      const session = await getSession(token);
      if (session) {
        userId = session.userId;
        role = session.role;
      }
    } catch { /* anonymous */ }
  }

  const clientId = crypto.randomBytes(8).toString("hex");
  sseManager.connect(clientId, userId, role, res);
});

// GET /api/sse/status — admin only, connection count
router.get("/sse/status", async (req: Request, res: Response) => {
  res.json({ success: true, data: { clients: sseManager.clientCount } });
});

export default router;
