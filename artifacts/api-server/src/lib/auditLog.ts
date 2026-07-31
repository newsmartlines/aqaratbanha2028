/**
 * Admin Audit Log — append-only JSON-Lines file.
 * Every admin mutation (POST / PUT / PATCH / DELETE) is recorded here.
 *
 * Location: <cwd>/logs/admin-audit.jsonl
 * Each line is a valid JSON object terminated by \n.
 */

import fs from "fs";
import path from "path";

const LOG_DIR  = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "admin-audit.jsonl");
const MAX_READ_LINES = 500;

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }

export interface AuditEntry {
  ts:         string;
  ip:         string;
  userId?:    number;
  email?:     string;
  method:     string;
  path:       string;
  status?:    number;
  durationMs?: number;
  body?:      Record<string, unknown>;
}

/* ── Sanitise request body before logging ──────────────────────────────── */
const REDACTED_KEYS = new Set([
  "password", "passwordhash", "password_hash", "newpassword", "currentpassword",
  "token", "secret", "apikey", "api_key", "accesstoken", "refreshtoken",
]);

export function sanitiseBody(raw: unknown, maxStrLen = 300): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > maxStrLen) {
      out[k] = v.slice(0, maxStrLen) + "…";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* ── Write ─────────────────────────────────────────────────────────────── */
export function writeAuditLog(entry: AuditEntry): void {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch { /* never crash on logging failure */ }
}

/* ── Read (admin dashboard) ─────────────────────────────────────────────── */
export function readRecentAuditLog(limit = MAX_READ_LINES): AuditEntry[] {
  try {
    const raw   = fs.readFileSync(LOG_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-Math.min(limit, MAX_READ_LINES))
      .reverse()
      .map((l) => JSON.parse(l) as AuditEntry);
  } catch {
    return [];
  }
}

/* ── Rotate if > 50 MB ──────────────────────────────────────────────────── */
export function maybeRotateLog(): void {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > 50 * 1024 * 1024) {
      const rotated = LOG_FILE + "." + Date.now() + ".bak";
      fs.renameSync(LOG_FILE, rotated);
    }
  } catch { /* ignore */ }
}

// Rotate once on startup and daily thereafter
maybeRotateLog();
setInterval(maybeRotateLog, 24 * 60 * 60 * 1_000);
