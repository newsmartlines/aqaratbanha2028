import { Router } from "express";
import { db } from "@workspace/db";
import { packagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/packages", async (_req, res) => {
  try {
    const packages = await db.select().from(packagesTable).orderBy(packagesTable.price);
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch packages" });
  }
});

router.post("/packages", async (req, res) => {
  try {
    const { nameAr, nameEn, price, durationDays, maxListings, commissionRate, featuredAllowed, topBadge, priorityRank } = req.body;
    const [pkg] = await db.insert(packagesTable).values({ nameAr, nameEn, price, durationDays, maxListings, commissionRate, featuredAllowed, topBadge, priorityRank }).returning();
    res.json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create package" });
  }
});

router.put("/packages/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nameAr, nameEn, price, durationDays, maxListings, commissionRate, featuredAllowed, topBadge, priorityRank } = req.body;
    const [pkg] = await db.update(packagesTable).set({ nameAr, nameEn, price, durationDays, maxListings, commissionRate, featuredAllowed, topBadge, priorityRank }).where(eq(packagesTable.id, id)).returning();
    res.json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update package" });
  }
});

router.delete("/packages/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(packagesTable).where(eq(packagesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete package" });
  }
});

export default router;
