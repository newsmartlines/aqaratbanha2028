import { Router } from "express";
import { db } from "@workspace/db";
import { propertyFeaturesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── Default seed data (v2 — Lucide icon names) ────────────────────────────────

const DEFAULT_FEATURES = [
  // ─── مميزات العقار ──────────────────────────────────────────────────────────
  { type: "feature", name: "مسبح",            icon: "Waves",          sortOrder: 1  },
  { type: "feature", name: "جراج مغطى",       icon: "Car",            sortOrder: 2  },
  { type: "feature", name: "حديقة خاصة",      icon: "TreePine",       sortOrder: 3  },
  { type: "feature", name: "مصعد",             icon: "ArrowUpDown",    sortOrder: 4  },
  { type: "feature", name: "شرفة",             icon: "Building",       sortOrder: 5  },
  { type: "feature", name: "مكيف مركزي",      icon: "Wind",           sortOrder: 6  },
  { type: "feature", name: "أمن 24 ساعة",     icon: "Shield",         sortOrder: 7  },
  { type: "feature", name: "غرفة خادمة",      icon: "BedDouble",      sortOrder: 8  },
  { type: "feature", name: "غرفة سائق",       icon: "BedSingle",      sortOrder: 9  },
  { type: "feature", name: "مستودع",           icon: "Package",        sortOrder: 10 },
  { type: "feature", name: "بوابة ذكية",      icon: "DoorOpen",       sortOrder: 11 },
  { type: "feature", name: "نظام منزل ذكي",   icon: "Cpu",            sortOrder: 12 },
  { type: "feature", name: "مطبخ مجهز",       icon: "UtensilsCrossed",sortOrder: 13 },
  { type: "feature", name: "غرفة غسيل",       icon: "WashingMachine", sortOrder: 14 },
  { type: "feature", name: "طاقة شمسية",      icon: "Sun",            sortOrder: 15 },
  { type: "feature", name: "موقف خاص",        icon: "CarFront",       sortOrder: 16 },
  { type: "feature", name: "صالة رياضية",     icon: "Dumbbell",       sortOrder: 17 },
  { type: "feature", name: "ملعب",             icon: "Trophy",         sortOrder: 18 },
  // ─── الخدمات الطرفية القريبة ─────────────────────────────────────────────
  { type: "service", name: "مسجد",             icon: "Building2",      sortOrder: 1  },
  { type: "service", name: "مدرسة",            icon: "School",         sortOrder: 2  },
  { type: "service", name: "مستشفى",           icon: "Hospital",       sortOrder: 3  },
  { type: "service", name: "مول تجاري",        icon: "ShoppingBag",    sortOrder: 4  },
  { type: "service", name: "مطاعم",            icon: "Utensils",       sortOrder: 5  },
  { type: "service", name: "كافيهات",          icon: "Coffee",         sortOrder: 6  },
  { type: "service", name: "محطة وقود",        icon: "Fuel",           sortOrder: 7  },
  { type: "service", name: "صيدلية",           icon: "Pill",           sortOrder: 8  },
  { type: "service", name: "جامعة",            icon: "GraduationCap",  sortOrder: 9  },
  { type: "service", name: "بنك",              icon: "Landmark",       sortOrder: 10 },
  { type: "service", name: "سوبر ماركت",       icon: "ShoppingCart",   sortOrder: 11 },
] as const;

// ── Auto-seed on first request — detects stale v1 (emoji) data ───────────────

let seeded = false;

async function ensureSeeded() {
  if (seeded) return;
  try {
    const existing = await db.select().from(propertyFeaturesTable);

    // Detect old emoji-based seed (v1) or empty DB
    const hasNewSeed = existing.some((r) => r.icon === "Waves");
    const hasOldData = existing.length > 0 && !hasNewSeed;

    if (hasOldData) {
      // Wipe v1 data and re-seed with v2 Lucide icons
      await db.delete(propertyFeaturesTable);
      console.log("[property-features] Cleared old emoji-based seed data");
    }

    if (!hasNewSeed) {
      await db
        .insert(propertyFeaturesTable)
        .values(DEFAULT_FEATURES.map((f) => ({ ...f, status: "active" as const })));
      console.log(`[property-features] Seeded ${DEFAULT_FEATURES.length} features/services (v2 Lucide)`);
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
    // Return only active
    res.json(rows.filter((r) => r.status === "active"));
  } catch (err) {
    console.error("[property-features GET]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Helper: extract token and verify admin ────────────────────────────────────

async function requireAdmin(req: any): Promise<boolean> {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const session = await getSession(token);
  return !!(session && (session as any).role === "admin");
}

// ── Admin: all features / services (including inactive) ──────────────────────

router.get("/admin/property-features", async (req, res) => {
  await ensureSeeded();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
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
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post("/admin/property-features", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const { type, name, icon, sortOrder } = req.body;
    const [row] = await db
      .insert(propertyFeaturesTable)
      .values({ type, name, icon, sortOrder: sortOrder ?? 99, status: "active" })
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features POST]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: update ─────────────────────────────────────────────────────────────

router.put("/admin/property-features/:id", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const id = parseInt(req.params.id);
    const updates: Partial<typeof propertyFeaturesTable.$inferInsert> = {};
    if (req.body.name      !== undefined) updates.name      = req.body.name;
    if (req.body.icon      !== undefined) updates.icon      = req.body.icon;
    if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
    if (req.body.status    !== undefined) updates.status    = req.body.status;
    const [row] = await db
      .update(propertyFeaturesTable)
      .set(updates)
      .where(eq(propertyFeaturesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features PUT]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: toggle active/inactive ─────────────────────────────────────────────

router.patch("/admin/property-features/:id/toggle", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select()
      .from(propertyFeaturesTable)
      .where(eq(propertyFeaturesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    const newStatus = existing.status === "active" ? "inactive" : "active";
    const [row] = await db
      .update(propertyFeaturesTable)
      .set({ status: newStatus })
      .where(eq(propertyFeaturesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features PATCH toggle]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: reorder ────────────────────────────────────────────────────────────

router.patch("/admin/property-features/reorder", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const items: { id: number; sortOrder: number }[] = req.body.items;
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
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

router.delete("/admin/property-features/:id", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const id = parseInt(req.params.id);
    await db.delete(propertyFeaturesTable).where(eq(propertyFeaturesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/property-features DELETE]", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
