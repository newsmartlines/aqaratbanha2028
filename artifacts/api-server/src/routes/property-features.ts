import { Router } from "express";
import { db } from "@workspace/db";
import { propertyFeaturesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── Default seed data ─────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  { type: "feature", name: "مصعد",          icon: "🛗", sortOrder: 1 },
  { type: "feature", name: "موقف سيارات",  icon: "🚗", sortOrder: 2 },
  { type: "feature", name: "مسبح",          icon: "🏊", sortOrder: 3 },
  { type: "feature", name: "جراج مغطى",    icon: "🏠", sortOrder: 4 },
  { type: "feature", name: "تكييف مركزي",  icon: "❄️", sortOrder: 5 },
  { type: "feature", name: "إنترنت",         icon: "📡", sortOrder: 6 },
  { type: "feature", name: "حارس أمن",      icon: "💂", sortOrder: 7 },
  { type: "feature", name: "مولد كهرباء",  icon: "⚡", sortOrder: 8 },
  { type: "feature", name: "خزان مياه",    icon: "💧", sortOrder: 9 },
  { type: "feature", name: "نادي رياضي",   icon: "🏋️", sortOrder: 10 },
  { type: "feature", name: "شرفة",           icon: "🪟", sortOrder: 11 },
  { type: "feature", name: "حديقة خاصة",  icon: "🌿", sortOrder: 12 },
  { type: "feature", name: "نظام منزل ذكي", icon: "🤖", sortOrder: 13 },
  { type: "feature", name: "أمن 24 ساعة",  icon: "🔒", sortOrder: 14 },
  { type: "feature", name: "مفروش",          icon: "🛋️", sortOrder: 15 },
  { type: "service", name: "مسجد",           icon: "🕌", sortOrder: 1 },
  { type: "service", name: "مدرسة",          icon: "🏫", sortOrder: 2 },
  { type: "service", name: "مستشفى",         icon: "🏥", sortOrder: 3 },
  { type: "service", name: "صيدلية",         icon: "💊", sortOrder: 4 },
  { type: "service", name: "سوبر ماركت",   icon: "🛒", sortOrder: 5 },
  { type: "service", name: "مول تجاري",    icon: "🏬", sortOrder: 6 },
  { type: "service", name: "بنك",            icon: "🏦", sortOrder: 7 },
  { type: "service", name: "حديقة عامة",  icon: "🌳", sortOrder: 8 },
  { type: "service", name: "مواصلات عامة", icon: "🚌", sortOrder: 9 },
  { type: "service", name: "مطاعم",          icon: "🍽️", sortOrder: 10 },
  { type: "service", name: "نادي رياضي",   icon: "🏃", sortOrder: 11 },
  { type: "service", name: "محطة وقود",    icon: "⛽", sortOrder: 12 },
];

// Auto-seed on first run — idempotent: inserts only names that don't exist yet
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  try {
    const existing = await db
      .select({ name: propertyFeaturesTable.name, type: propertyFeaturesTable.type })
      .from(propertyFeaturesTable);
    const existingSet = new Set(existing.map((r) => `${r.type}:${r.name}`));
    const toInsert = DEFAULT_FEATURES.filter(
      (f) => !existingSet.has(`${f.type}:${f.name}`)
    );
    if (toInsert.length > 0) {
      await db.insert(propertyFeaturesTable).values(
        toInsert.map((f) => ({ ...f, status: "active" }))
      );
      console.log(`[property-features] Seeded ${toInsert.length} missing features/services`);
    }
    seeded = true;
  } catch (err) {
    console.error("[property-features] Seed error:", err);
  }
}

// ── Public: active features / services ───────────────────────────────────────

router.get("/property-features", async (req, res) => {
  await ensureSeeded();
  try {
    const type = (req.query.type as string) || "feature";
    const rows = await db
      .select()
      .from(propertyFeaturesTable)
      .where(eq(propertyFeaturesTable.type, type))
      .orderBy(asc(propertyFeaturesTable.sortOrder));
    // Public: only active
    res.json(rows.filter((r) => r.status === "active"));
  } catch (err) {
    console.error("[property-features GET]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: all features / services ───────────────────────────────────────────

router.get("/admin/property-features", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  await ensureSeeded();
  try {
    const type = (req.query.type as string) || "feature";
    const rows = await db
      .select()
      .from(propertyFeaturesTable)
      .where(eq(propertyFeaturesTable.type, type))
      .orderBy(asc(propertyFeaturesTable.sortOrder));
    res.json(rows);
  } catch (err) {
    console.error("[admin/property-features GET]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post("/admin/property-features", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const { type = "feature", name, icon = "🏠", status = "active", sortOrder = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });
    const [row] = await db
      .insert(propertyFeaturesTable)
      .values({ type, name: name.trim(), icon, status, sortOrder: Number(sortOrder) })
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features POST]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: update ─────────────────────────────────────────────────────────────

router.put("/admin/property-features/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const id = parseInt(req.params.id);
    const { name, icon, status, sortOrder } = req.body;
    const updates: Partial<typeof propertyFeaturesTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name.trim();
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    const [row] = await db
      .update(propertyFeaturesTable)
      .set(updates)
      .where(eq(propertyFeaturesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features PUT]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: toggle status ──────────────────────────────────────────────────────

router.patch("/admin/property-features/:id/toggle", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select()
      .from(propertyFeaturesTable)
      .where(eq(propertyFeaturesTable.id, id));
    if (!current) return res.status(404).json({ error: "not found" });
    const newStatus = current.status === "active" ? "hidden" : "active";
    const [row] = await db
      .update(propertyFeaturesTable)
      .set({ status: newStatus })
      .where(eq(propertyFeaturesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features PATCH toggle]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: bulk reorder ───────────────────────────────────────────────────────

router.patch("/admin/property-features/reorder", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const items: Array<{ id: number; sortOrder: number }> = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "array required" });
    await Promise.all(
      items.map((item) =>
        db
          .update(propertyFeaturesTable)
          .set({ sortOrder: item.sortOrder })
          .where(eq(propertyFeaturesTable.id, item.id))
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/property-features PATCH reorder]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

router.delete("/admin/property-features/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session?.role || session.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const id = parseInt(req.params.id);
    await db.delete(propertyFeaturesTable).where(eq(propertyFeaturesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/property-features DELETE]", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
