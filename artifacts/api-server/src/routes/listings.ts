import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, providersTable, usersTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/listings", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: servicesTable.id,
        title: servicesTable.title,
        description: servicesTable.description,
        price: servicesTable.price,
        status: servicesTable.status,
        subcategory: servicesTable.subcategory,
        img: servicesTable.img,
        createdAt: servicesTable.createdAt,
        providerId: servicesTable.providerId,
        categoryId: servicesTable.categoryId,
        providerName: usersTable.name,
        categoryNameAr: categoriesTable.nameAr,
      })
      .from(servicesTable)
      .innerJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(servicesTable.categoryId, categoriesTable.id))
      .orderBy(servicesTable.createdAt);
    res.json({ success: true, data: rows });
  } catch (err) {
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
    if (price !== undefined) updates.price = price;

    const [updated] = await db
      .update(servicesTable)
      .set(updates)
      .where(eq(servicesTable.id, id))
      .returning();

    const [withProvider] = await db
      .select({
        id: servicesTable.id,
        title: servicesTable.title,
        description: servicesTable.description,
        price: servicesTable.price,
        status: servicesTable.status,
        subcategory: servicesTable.subcategory,
        img: servicesTable.img,
        createdAt: servicesTable.createdAt,
        providerId: servicesTable.providerId,
        categoryId: servicesTable.categoryId,
        providerName: usersTable.name,
        categoryNameAr: categoriesTable.nameAr,
      })
      .from(servicesTable)
      .innerJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(servicesTable.categoryId, categoriesTable.id))
      .where(eq(servicesTable.id, updated.id));

    res.json({ success: true, data: withProvider });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update listing" });
  }
});

router.delete("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(servicesTable).where(eq(servicesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete listing" });
  }
});

export default router;
