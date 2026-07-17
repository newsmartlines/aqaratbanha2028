/**
 * Thin in-memory cache for site settings reads.
 * Keeps hot-path API guards fast (single DB query per key, shared for 5 s).
 * Call `invalidateSetting(key)` after every successful save.
 */

import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

interface CacheEntry { value: string | null; expiresAt: number }
const cache = new Map<string, CacheEntry>();

export async function getSettingCached(
  key: string,
  defaultValue: string,
  ttlMs = 5_000,
): Promise<string> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value ?? defaultValue;

  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);

  const value = row?.value ?? defaultValue;
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateSetting(key: string): void {
  cache.delete(key);
}

/** Convenience: returns true when subscriptions/packages are enabled (default). */
export async function subscriptionsEnabled(): Promise<boolean> {
  const val = await getSettingCached("subscriptionsEnabled", "true");
  return val !== "false";
}
