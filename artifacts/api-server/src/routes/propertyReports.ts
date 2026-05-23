import { Router } from "express";
import { db } from "@workspace/db";
import { propertyReportsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

router.post("/property-reports", async (req, res) => {
  const { propertyId, email, message } = req.body;
  if (!propertyId || !email || !message) {
    return res.status(400).json({ error: "بيانات ناقصة" });
  }
  const [row] = await db.insert(propertyReportsTable).values({ propertyId: Number(propertyId), email, message }).returning();
  return res.json({ ok: true, id: row.id });
});

router.get("/admin/property-reports", async (req, res) => {
  const token = req.cookies?.session ?? (req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
  const session = await getSession(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db.select().from(propertyReportsTable).orderBy(desc(propertyReportsTable.createdAt));
  return res.json(rows);
});

router.patch("/admin/property-reports/:id", async (req, res) => {
  const token = req.cookies?.session ?? (req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
  const session = await getSession(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const { status } = req.body;
  await db.update(propertyReportsTable).set({ status }).where(eq(propertyReportsTable.id, Number(req.params.id)));
  return res.json({ ok: true });
});

router.delete("/admin/property-reports/:id", async (req, res) => {
  const token = req.cookies?.session ?? (req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
  const session = await getSession(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  await db.delete(propertyReportsTable).where(eq(propertyReportsTable.id, Number(req.params.id)));
  return res.json({ ok: true });
});

export default router;
