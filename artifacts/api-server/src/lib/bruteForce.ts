/**
 * Brute-force / account-lockout protection.
 * Tracks failed login attempts per IP and per email address.
 * Entirely in-memory — fast and zero-dependency.
 * Auto-cleanup runs every 5 minutes to prevent memory leaks.
 */

interface LockState {
  attempts: number;
  lockedUntil?: number;
  lastAttempt: number;
}

const WINDOW_MS       = 15 * 60 * 1_000;   // sliding 15-min window
const REGULAR_MAX     = 5;                  // before lockout for regular users
const ADMIN_MAX       = 3;                  // stricter for admin login
const LOCKOUT_1_MS    = 15 * 60 * 1_000;   // 15-min lockout (first lockout)
const LOCKOUT_2_MS    = 60 * 60 * 1_000;   // 1-hour lockout (repeat offenders)
const CLEANUP_AFTER   = 2 * LOCKOUT_2_MS;  // evict stale entries after 2 h

const ipMap    = new Map<string, LockState>();
const emailMap = new Map<string, LockState>();

/* ── Periodic cleanup ────────────────────────────────────────────────────── */
function cleanup(): void {
  const now = Date.now();
  for (const [k, v] of ipMap.entries())    if (now - v.lastAttempt > CLEANUP_AFTER) ipMap.delete(k);
  for (const [k, v] of emailMap.entries()) if (now - v.lastAttempt > CLEANUP_AFTER) emailMap.delete(k);
}
const _cleanupTimer = setInterval(cleanup, 5 * 60_000);
if (typeof _cleanupTimer.unref === "function") _cleanupTimer.unref();

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function get(map: Map<string, LockState>, key: string): LockState {
  return map.get(key) ?? { attempts: 0, lastAttempt: 0 };
}

function lockoutMs(attempts: number, isAdmin: boolean): number {
  const threshold = isAdmin ? ADMIN_MAX : REGULAR_MAX;
  if (attempts >= threshold * 3) return LOCKOUT_2_MS;
  if (attempts >= threshold)     return LOCKOUT_1_MS;
  return 0;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Returns { locked: true, remainingSecs } if the IP *or* email is currently
 * locked out.  Returns { locked: false } otherwise.
 */
export function isLocked(
  ip: string,
  email: string,
): { locked: boolean; remainingSecs?: number } {
  const now = Date.now();
  for (const [map, key] of [
    [ipMap,    ip],
    [emailMap, email.toLowerCase()],
  ] as [Map<string, LockState>, string][]) {
    const state = map.get(key);
    if (state?.lockedUntil && now < state.lockedUntil) {
      return { locked: true, remainingSecs: Math.ceil((state.lockedUntil - now) / 1_000) };
    }
  }
  return { locked: false };
}

/**
 * Record a failed login attempt.
 * Pass `isAdmin = true` for admin-login paths to use stricter thresholds.
 */
export function recordFailed(ip: string, email: string, isAdmin = false): void {
  const now = Date.now();
  const threshold = isAdmin ? ADMIN_MAX : REGULAR_MAX;

  for (const [map, key] of [
    [ipMap,    ip],
    [emailMap, email.toLowerCase()],
  ] as [Map<string, LockState>, string][]) {
    const s = get(map, key);

    // Reset counter if outside the sliding window
    if (now - s.lastAttempt > WINDOW_MS && !s.lockedUntil) s.attempts = 0;

    s.attempts++;
    s.lastAttempt = now;

    const ms = lockoutMs(s.attempts, isAdmin);
    if (ms > 0) s.lockedUntil = now + ms;

    map.set(key, s);
  }

  // Log persistent offenders
  const ipState = ipMap.get(ip);
  if (ipState && ipState.attempts >= threshold * 2) {
    // Could push to audit log here; keep import-free for now
  }
}

/**
 * Clear all attempt records for this IP + email on successful login.
 */
export function clearAttempts(ip: string, email: string): void {
  ipMap.delete(ip);
  emailMap.delete(email.toLowerCase());
}

/** Diagnostic snapshot (for admin security dashboard). */
export function getBruteForceStats(): {
  trackedIPs: number;
  lockedIPs: number;
  trackedEmails: number;
  lockedEmails: number;
} {
  const now = Date.now();
  let lockedIPs = 0, lockedEmails = 0;
  for (const s of ipMap.values())    if (s.lockedUntil && now < s.lockedUntil) lockedIPs++;
  for (const s of emailMap.values()) if (s.lockedUntil && now < s.lockedUntil) lockedEmails++;
  return { trackedIPs: ipMap.size, lockedIPs, trackedEmails: emailMap.size, lockedEmails };
}
