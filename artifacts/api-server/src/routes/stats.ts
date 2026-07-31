import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, paymentTransactionsTable, paymentsTable, propertiesTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [[providers], [users], [properties]] = await Promise.all([
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(providersTable)
        .where(and(eq(providersTable.approved, true), eq(providersTable.suspended, false))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(usersTable)
        .where(eq(usersTable.role, "user")),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(or(eq(propertiesTable.status, "active"), eq(propertiesTable.status, "approved"))),
    ]);

    res.json({
      success: true,
      data: {
        providers: providers?.count ?? 0,
        users: users?.count ?? 0,
        properties: properties?.count ?? 0,
      },
    });
  } catch (e: any) {
    console.error("Stats error:", e?.message);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// Admin-specific stats with revenue and pending counts
router.get("/admin/stats", adminOnly, async (_req, res) => {
  try {
    const [
      [allProviders],
      [activeProviders],
      [pendingProviders],
      [users],
      [activeProperties],
      [propertiesForSale],
      [propertiesForRent],
      [pendingProperties],
      [revenueRow],
      categoryRows,
      monthlyRows,
    ] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(providersTable),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(providersTable)
        .where(and(eq(providersTable.approved, true), eq(providersTable.suspended, false))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(providersTable)
        .where(and(eq(providersTable.approved, false), eq(providersTable.suspended, false))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(usersTable)
        .where(eq(usersTable.role, "user")),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(or(eq(propertiesTable.status, "active"), eq(propertiesTable.status, "approved"))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(and(or(eq(propertiesTable.status, "active"), eq(propertiesTable.status, "approved")), eq(propertiesTable.listingType, "sale"))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(and(or(eq(propertiesTable.status, "active"), eq(propertiesTable.status, "approved")), eq(propertiesTable.listingType, "rent"))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(eq(propertiesTable.status, "pending")),
      // Revenue: gateway transactions (paid) + manual subscription payments (paid/approved)
      // Exclude payments whose invoice_id matches a payment_transaction ref_id to avoid double-counting.
      db.execute(sql`
        SELECT COALESCE(
          (SELECT SUM(CAST(amount AS NUMERIC)) FROM payment_transactions WHERE status = 'paid') +
          COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM payments
            WHERE status IN ('paid','approved') AND amount IS NOT NULL
            AND (invoice_id IS NULL OR invoice_id NOT IN (
              SELECT ref_id FROM payment_transactions WHERE ref_id IS NOT NULL
            ))), 0),
          0
        )::text AS total
      `),
      // Top categories (active+approved properties grouped by mainCategory)
      db
        .select({
          category: propertiesTable.mainCategory,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(propertiesTable)
        .where(or(eq(propertiesTable.status, "active"), eq(propertiesTable.status, "approved")))
        .groupBy(propertiesTable.mainCategory)
        .orderBy(sql`count(*) desc`)
        .limit(6),
      // Monthly new listings (last 6 months) — active or approved
      db
        .select({
          month: sql<string>`to_char(created_at, 'YYYY-MM')`,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(propertiesTable)
        .where(sql`created_at >= now() - interval '6 months'`)
        .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
        .orderBy(sql`to_char(created_at, 'YYYY-MM') asc`),
    ]);

    res.json({
      success: true,
      data: {
        totalProviders: allProviders?.count ?? 0,
        activeProviders: activeProviders?.count ?? 0,
        pendingProviders: pendingProviders?.count ?? 0,
        totalUsers: users?.count ?? 0,
        activeProperties: activeProperties?.count ?? 0,
        propertiesForSale: propertiesForSale?.count ?? 0,
        propertiesForRent: propertiesForRent?.count ?? 0,
        pendingProperties: pendingProperties?.count ?? 0,
        totalRevenue: parseFloat((revenueRow as any)?.rows?.[0]?.total ?? revenueRow?.total ?? "0"),
        topCategories: categoryRows,
        monthlyListings: monthlyRows,
      },
    });
  } catch (e: any) {
    console.error("Admin stats error:", e?.message);
    res.status(500).json({ success: false, error: "Failed to fetch admin stats" });
  }
});

export default router;
