import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, paymentTransactionsTable, propertiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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
        .from(usersTable),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(eq(propertiesTable.status, "active")),
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
        .where(eq(propertiesTable.status, "active")),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.listingType, "sale"))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.listingType, "rent"))),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(propertiesTable)
        .where(eq(propertiesTable.status, "pending")),
      db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)::text` })
        .from(paymentTransactionsTable)
        .where(eq(paymentTransactionsTable.status, "paid")),
      // Top categories (active properties grouped by mainCategory)
      db
        .select({
          category: propertiesTable.mainCategory,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(propertiesTable)
        .where(eq(propertiesTable.status, "active"))
        .groupBy(propertiesTable.mainCategory)
        .orderBy(sql`count(*) desc`)
        .limit(6),
      // Monthly new listings (last 6 months)
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
        totalRevenue: parseFloat(revenueRow?.total ?? "0"),
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
