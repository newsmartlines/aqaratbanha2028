import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, providersTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── GET /listings — public: returns all properties with provider info ──────────
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

// ── PATCH /listings/:id — admin only ─────────────────────────────────────────
router.patch("/listings/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: "Invalid listing ID" });
    }
    const { status, title, description, price } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) {
      const priceNum = parseFloat(String(price));
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ success: false, error: "Invalid price value" });
      }
      updates.price = String(priceNum);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    const [updated] = await db
      .update(propertiesTable)
      .set(updates)
      .where(eq(propertiesTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update listing" });
  }
});

// ── DELETE /listings/:id — admin only ────────────────────────────────────────
router.delete("/listings/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: "Invalid listing ID" });
    }
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete listing" });
  }
});

export default router;
