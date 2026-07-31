/**
 * Phase 3.1 — Subscription Integrity Migration
 * Applies raw SQL changes that can't run through drizzle-kit (needs TTY).
 *
 * Run with:  node scripts/migrate-subscription-integrity.mjs
 */

import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log("🔧 Phase 3.1 — Subscription Integrity Migration");
console.log("================================================");

try {
  // ── Step 1: Add new columns (idempotent) ─────────────────────────────────
  console.log("\n[1/5] Adding new columns to subscriptions table...");
  await client.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS replaced_by_subscription_id INTEGER,
      ADD COLUMN IF NOT EXISTS replaced_at                 TIMESTAMP,
      ADD COLUMN IF NOT EXISTS replacement_reason          TEXT;
  `);
  console.log("  ✓ Columns added (or already exist)");

  // ── Step 2: Clean up existing duplicate actives before adding constraint ──
  console.log("\n[2/5] Cleaning up duplicate active subscriptions...");

  const dupCheck = await client.query(`
    SELECT provider_id, COUNT(*) as cnt
    FROM subscriptions
    WHERE status = 'active' AND provider_id IS NOT NULL
    GROUP BY provider_id
    HAVING COUNT(*) > 1
  `);
  console.log(`  Found ${dupCheck.rows.length} provider(s) with multiple active subscriptions`);

  if (dupCheck.rows.length > 0) {
    // Keep only the most recent active per provider; expire the rest
    const fixedProviders = await client.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY provider_id
                 ORDER BY created_at DESC, id DESC
               ) AS rn
        FROM subscriptions
        WHERE status = 'active' AND provider_id IS NOT NULL
      )
      UPDATE subscriptions
      SET status = 'expired'
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING id
    `);
    console.log(`  ✓ Expired ${fixedProviders.rowCount} duplicate provider subscription(s)`);
  }

  const userDupCheck = await client.query(`
    SELECT user_id, COUNT(*) as cnt
    FROM subscriptions
    WHERE status = 'active' AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  `);
  console.log(`  Found ${userDupCheck.rows.length} user(s) with multiple active subscriptions`);

  if (userDupCheck.rows.length > 0) {
    const fixedUsers = await client.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id
                 ORDER BY created_at DESC, id DESC
               ) AS rn
        FROM subscriptions
        WHERE status = 'active' AND user_id IS NOT NULL
      )
      UPDATE subscriptions
      SET status = 'expired'
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING id
    `);
    console.log(`  ✓ Expired ${fixedUsers.rowCount} duplicate user subscription(s)`);
  }

  // ── Step 3: Add partial unique indexes ────────────────────────────────────
  console.log("\n[3/5] Adding partial unique indexes...");

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_provider_idx
      ON subscriptions (provider_id)
      WHERE status = 'active' AND provider_id IS NOT NULL;
  `);
  console.log("  ✓ subscriptions_one_active_per_provider_idx created");

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user_idx
      ON subscriptions (user_id)
      WHERE status = 'active' AND user_id IS NOT NULL;
  `);
  console.log("  ✓ subscriptions_one_active_per_user_idx created");

  // ── Step 4: Verify constraint is working ──────────────────────────────────
  console.log("\n[4/5] Verifying constraints...");

  const activeProviderDups = await client.query(`
    SELECT provider_id, COUNT(*) as cnt
    FROM subscriptions
    WHERE status = 'active' AND provider_id IS NOT NULL
    GROUP BY provider_id
    HAVING COUNT(*) > 1
  `);

  const activeUserDups = await client.query(`
    SELECT user_id, COUNT(*) as cnt
    FROM subscriptions
    WHERE status = 'active' AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  `);

  if (activeProviderDups.rows.length === 0 && activeUserDups.rows.length === 0) {
    console.log("  ✓ No duplicate active subscriptions found — data is clean");
  } else {
    console.error("  ✗ Still found duplicates — constraint may not have applied correctly");
    process.exit(1);
  }

  // ── Step 5: Show final state ───────────────────────────────────────────────
  console.log("\n[5/5] Final subscription status breakdown...");
  const stats = await client.query(`
    SELECT status, COUNT(*) as count
    FROM subscriptions
    GROUP BY status
    ORDER BY count DESC
  `);
  for (const row of stats.rows) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  console.log("\n✅ Migration complete — subscription integrity constraints applied.\n");
} catch (err) {
  console.error("\n✗ Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
