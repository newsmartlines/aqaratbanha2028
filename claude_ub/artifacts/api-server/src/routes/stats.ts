import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, servicesTable, requestsTable } from "@workspace/db";
import { eq, and, sql, ne } from "drizzle-orm";

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

export default router;
