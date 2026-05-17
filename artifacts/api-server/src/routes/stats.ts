import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, servicesTable, requestsTable, paymentTransactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [[providers], [users], [services], [requests]] = await Promise.all([
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
        .from(servicesTable),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(requestsTable),
    ]);

    res.json({
      success: true,
      data: {
        providers: providers?.count ?? 0,
        users: users?.count ?? 0,
        services: services?.count ?? 0,
        requests: requests?.count ?? 0,
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
      [services],
      [requests],
      [revenueRow],
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
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(servicesTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(requestsTable),
      db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)::text` })
        .from(paymentTransactionsTable)
        .where(eq(paymentTransactionsTable.status, "paid")),
    ]);

    res.json({
      success: true,
      data: {
        totalProviders: allProviders?.count ?? 0,
        activeProviders: activeProviders?.count ?? 0,
        pendingProviders: pendingProviders?.count ?? 0,
        totalUsers: users?.count ?? 0,
        totalServices: services?.count ?? 0,
        totalRequests: requests?.count ?? 0,
        totalRevenue: parseFloat(revenueRow?.total ?? "0"),
      },
    });
  } catch (e: any) {
    console.error("Admin stats error:", e?.message);
    res.status(500).json({ success: false, error: "Failed to fetch admin stats" });
  }
});

export default router;
