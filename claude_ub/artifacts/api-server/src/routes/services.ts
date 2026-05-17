import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, providersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/providers/:providerId/services", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const services = await db.select().from(servicesTable).where(eq(servicesTable.providerId, providerId)).orderBy(servicesTable.createdAt);
    res.json({ success: true, data: services });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch services" });
  }
});

router.post("/providers/:providerId/services", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const { title, description, price, categoryId, subcategory, img, status = "pending" } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    // Validate: categoryId must match provider's main categoryId
    if (categoryId) {
      const [provider] = await db.select({ categoryId: providersTable.categoryId }).from(providersTable).where(eq(providersTable.id, providerId));
      if (provider?.categoryId && parseInt(categoryId) !== provider.categoryId) {
        return res.status(400).json({ success: false, error: "لا يمكن إضافة خدمة خارج قسمك الرئيسي" });
      }
    }

    const [service] = await db
      .insert(servicesTable)
      .values({ providerId, title, description, price, categoryId: categoryId ? parseInt(categoryId) : null, subcategory, img, status })
      .returning();
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create service" });
  }
});

router.put("/providers/:providerId/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);
    const { title, description, price, categoryId, subcategory, img, status } = req.body;
    const existing = await db.select().from(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)));
    if (!existing.length) return res.status(404).json({ success: false, error: "Service not found" });

    // Validate: categoryId must match provider's main categoryId
    if (categoryId) {
      const [provider] = await db.select({ categoryId: providersTable.categoryId }).from(providersTable).where(eq(providersTable.id, providerId));
      if (provider?.categoryId && parseInt(categoryId) !== provider.categoryId) {
        return res.status(400).json({ success: false, error: "لا يمكن إضافة خدمة خارج قسمك الرئيسي" });
      }
    }

    const [service] = await db
      .update(servicesTable)
      .set({ title, description, price, categoryId: categoryId ? parseInt(categoryId) : undefined, subcategory, img, status })
      .where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)))
      .returning();
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update service" });
  }
});

router.delete("/providers/:providerId/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);
    await db.delete(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete service" });
  }
});

export default router;
