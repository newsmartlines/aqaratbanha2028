import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, providersTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/listings", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: propertiesTable.id,
        title: propertiesTable.title,
        description: propertiesTable.description,
        price: propertiesTable.price,
        status: propertiesTable.status,
        listingType: propertiesTable.listingType,
        mainCategory: propertiesTable.mainCategory,
        images: propertiesTable.images,
        createdAt: propertiesTable.createdAt,
        providerId: propertiesTable.providerId,
        providerName: usersTable.name,
      })
      .from(propertiesTable)
      .leftJoin(providersTable, eq(propertiesTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .orderBy(desc(propertiesTable.createdAt));
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch listings" });
  }
});

router.patch("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, title, description, price } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = String(price);

    const [updated] = await db
      .update(propertiesTable)
      .set(updates)
      .where(eq(propertiesTable.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update listing" });
  }
});

router.delete("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete listing" });
  }
});

export default router;
