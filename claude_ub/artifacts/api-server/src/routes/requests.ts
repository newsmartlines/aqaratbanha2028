import { Router } from "express";
import { db } from "@workspace/db";
import { requestsTable, usersTable, providersTable, servicesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.post("/requests", async (req, res) => {
  try {
    const { userId, providerId, serviceId, message } = req.body;
    if (!providerId) return res.status(400).json({ success: false, error: "Provider ID required" });
    const [request] = await db.insert(requestsTable).values({ userId, providerId, serviceId, message, status: "new" }).returning();
    res.json({ success: true, data: request });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create request" });
  }
});

// Admin: get all requests with full details
router.get("/requests", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: requestsTable.id,
        message: requestsTable.message,
        notes: requestsTable.notes,
        status: requestsTable.status,
        createdAt: requestsTable.createdAt,
        userId: requestsTable.userId,
        providerId: requestsTable.providerId,
        serviceId: requestsTable.serviceId,
        userName: usersTable.name,
        userPhone: usersTable.phone,
        serviceTitle: servicesTable.title,
        servicePrice: servicesTable.price,
      })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .orderBy(desc(requestsTable.createdAt));

    // Enrich with provider name
    const providerIds = [...new Set(rows.map(r => r.providerId).filter(Boolean))] as number[];
    const providerRows = providerIds.length
      ? await db
          .select({ id: providersTable.id, name: usersTable.name })
          .from(providersTable)
          .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
          .where(eq(providersTable.id, providerIds[0]))
      : [];

    // Build a map for all providers
    const allProviders = providerIds.length
      ? await db
          .select({ id: providersTable.id, name: usersTable.name })
          .from(providersTable)
          .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      : [];
    const providerMap = new Map(allProviders.map(p => [p.id, p.name]));

    const result = rows.map(r => ({
      ...r,
      providerName: r.providerId ? providerMap.get(r.providerId) ?? null : null,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
});

router.get("/providers/:providerId/requests", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const rows = await db
      .select({
        id: requestsTable.id,
        message: requestsTable.message,
        notes: requestsTable.notes,
        status: requestsTable.status,
        createdAt: requestsTable.createdAt,
        userId: requestsTable.userId,
        serviceId: requestsTable.serviceId,
        userName: usersTable.name,
        userPhone: usersTable.phone,
        serviceTitle: servicesTable.title,
      })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .where(eq(requestsTable.providerId, providerId))
      .orderBy(desc(requestsTable.createdAt));
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
});

router.patch("/requests/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ["new", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
    const [updated] = await db.update(requestsTable).set({ status }).where(eq(requestsTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update request" });
  }
});

router.patch("/requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    const [updated] = await db.update(requestsTable).set(updateData).where(eq(requestsTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update request" });
  }
});

router.get("/users/:userId/requests", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rows = await db
      .select({
        id: requestsTable.id,
        providerId: requestsTable.providerId,
        message: requestsTable.message,
        notes: requestsTable.notes,
        status: requestsTable.status,
        createdAt: requestsTable.createdAt,
        providerName: usersTable.name,
        providerAvatar: providersTable.avatar,
        serviceTitle: servicesTable.title,
        servicePrice: servicesTable.price,
      })
      .from(requestsTable)
      .leftJoin(providersTable, eq(requestsTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .where(eq(requestsTable.userId, userId))
      .orderBy(desc(requestsTable.createdAt));
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user requests" });
  }
});

export default router;
