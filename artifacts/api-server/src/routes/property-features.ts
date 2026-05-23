import { Router } from "express";
import { db } from "@workspace/db";
import { propertyFeaturesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── Default seed data (v3 — with applicableTypes) ──────────────────────────

const DEFAULT_FEATURES = [
  // ─── مميزات سكنية (شقة، فيلا، دوبلكس...) ───────────────────────────────
  { type: "feature", name: "مسبح",            icon: "Waves",           sortOrder: 1,  applicableTypes: JSON.stringify(["فيلا","استراحة","عمارة","مجمع تجاري","فندق"]) },
  { type: "feature", name: "جراج مغطى",       icon: "Car",             sortOrder: 2,  applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","روف","عمارة","مكتب","عيادة"]) },
  { type: "feature", name: "حديقة خاصة",      icon: "TreePine",        sortOrder: 3,  applicableTypes: JSON.stringify(["فيلا","استراحة","عمارة"]) },
  { type: "feature", name: "مصعد",             icon: "ArrowUpDown",     sortOrder: 4,  applicableTypes: JSON.stringify(["شقة","دوبلكس","روف","عمارة","مكتب","عيادة","فندق"]) },
  { type: "feature", name: "شرفة / بلكونة",   icon: "Building",        sortOrder: 5,  applicableTypes: JSON.stringify(["شقة","دوبلكس","روف","استوديو","فيلا"]) },
  { type: "feature", name: "مكيف مركزي",      icon: "Wind",            sortOrder: 6,  applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","روف","استوديو","مكتب","عيادة","فندق","محل تجاري","مجمع تجاري"]) },
  { type: "feature", name: "أمن 24 ساعة",     icon: "Shield",          sortOrder: 7,  applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","عمارة","مكتب","عيادة","فندق","مجمع تجاري"]) },
  { type: "feature", name: "غرفة خادمة",      icon: "BedDouble",       sortOrder: 8,  applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","روف"]) },
  { type: "feature", name: "غرفة سائق",       icon: "BedSingle",       sortOrder: 9,  applicableTypes: JSON.stringify(["فيلا","دوبلكس"]) },
  { type: "feature", name: "بوابة ذكية",      icon: "DoorOpen",        sortOrder: 10, applicableTypes: JSON.stringify(["فيلا","عمارة","مجمع تجاري"]) },
  { type: "feature", name: "نظام منزل ذكي",   icon: "Cpu",             sortOrder: 11, applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","روف","استوديو"]) },
  { type: "feature", name: "مطبخ مجهز",       icon: "UtensilsCrossed", sortOrder: 12, applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","روف","استوديو","غرفة","استراحة","فندق"]) },
  { type: "feature", name: "طاقة شمسية",      icon: "Sun",             sortOrder: 13, applicableTypes: JSON.stringify(["فيلا","عمارة","مستودع"]) },
  { type: "feature", name: "موقف خاص",        icon: "CarFront",        sortOrder: 14, applicableTypes: JSON.stringify(["شقة","فيلا","دوبلكس","مكتب","محل تجاري","مجمع تجاري"]) },
  { type: "feature", name: "صالة رياضية",     icon: "Dumbbell",        sortOrder: 15, applicableTypes: JSON.stringify(["فيلا","عمارة","فندق","مجمع تجاري"]) },
  // ─── مميزات أراضي ────────────────────────────────────────────────────────
  { type: "feature", name: "شارع رئيسي",      icon: "MapPin",          sortOrder: 1,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض صناعية","محل تجاري","مجمع تجاري","مستودع"]) },
  { type: "feature", name: "واجهتين",          icon: "Columns2",        sortOrder: 2,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض صناعية","محل تجاري"]) },
  { type: "feature", name: "تصلح للاستثمار",  icon: "TrendingUp",      sortOrder: 3,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض صناعية","أرض زراعية"]) },
  { type: "feature", name: "تصريح بناء",       icon: "FileCheck",       sortOrder: 4,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية"]) },
  { type: "feature", name: "متصلة بالمياه",   icon: "Droplets",        sortOrder: 5,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض زراعية","أرض صناعية"]) },
  { type: "feature", name: "متصلة بالكهرباء", icon: "Zap",             sortOrder: 6,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض زراعية","أرض صناعية"]) },
  { type: "feature", name: "صرف صحي",          icon: "Pipette",         sortOrder: 7,  applicableTypes: JSON.stringify(["أرض سكنية","أرض تجارية","أرض صناعية"]) },
  // ─── مميزات تجارية ──────────────────────────────────────────────────────
  { type: "feature", name: "واجهة زجاجية",    icon: "Layers",          sortOrder: 1,  applicableTypes: JSON.stringify(["محل تجاري","مجمع تجاري","مكتب","عيادة"]) },
  { type: "feature", name: "إنترنت فايبر",    icon: "Wifi",            sortOrder: 2,  applicableTypes: JSON.stringify(["مكتب","عيادة","محل تجاري","فندق","مجمع تجاري"]) },
  { type: "feature", name: "كاميرات مراقبة",  icon: "Camera",          sortOrder: 3,  applicableTypes: JSON.stringify(["مكتب","محل تجاري","مجمع تجاري","مستودع","فندق"]) },
  { type: "feature", name: "غرفة اجتماعات",   icon: "Users",           sortOrder: 4,  applicableTypes: JSON.stringify(["مكتب","عيادة"]) },
  { type: "feature", name: "مولد كهرباء",     icon: "BatteryCharging", sortOrder: 5,  applicableTypes: JSON.stringify(["مكتب","عيادة","فندق","مجمع تجاري","مستودع"]) },
  // ─── الخدمات الطرفية القريبة (تنطبق على الكل) ───────────────────────────
  { type: "service", name: "مسجد",             icon: "Building2",       sortOrder: 1,  applicableTypes: null },
  { type: "service", name: "مدرسة",            icon: "School",          sortOrder: 2,  applicableTypes: null },
  { type: "service", name: "مستشفى",           icon: "Hospital",        sortOrder: 3,  applicableTypes: null },
  { type: "service", name: "مول تجاري",        icon: "ShoppingBag",     sortOrder: 4,  applicableTypes: null },
  { type: "service", name: "مطاعم",            icon: "Utensils",        sortOrder: 5,  applicableTypes: null },
  { type: "service", name: "كافيهات",          icon: "Coffee",          sortOrder: 6,  applicableTypes: null },
  { type: "service", name: "محطة وقود",        icon: "Fuel",            sortOrder: 7,  applicableTypes: null },
  { type: "service", name: "صيدلية",           icon: "Pill",            sortOrder: 8,  applicableTypes: null },
  { type: "service", name: "جامعة",            icon: "GraduationCap",   sortOrder: 9,  applicableTypes: null },
  { type: "service", name: "بنك",              icon: "Landmark",        sortOrder: 10, applicableTypes: null },
  { type: "service", name: "سوبر ماركت",       icon: "ShoppingCart",    sortOrder: 11, applicableTypes: null },
] as const;

// ── Auto-seed / migrate ──────────────────────────────────────────────────────

let seeded = false;

async function ensureSeeded() {
  if (seeded) return;
  try {
    const existing = await db.select().from(propertyFeaturesTable);
    const hasV3 = existing.some((r) => r.icon === "Waves" && r.applicableTypes !== undefined);
    const isV2  = existing.some((r) => r.icon === "Waves" && r.applicableTypes === null);
    const isEmpty = existing.length === 0;
    const isV1 = existing.length > 0 && !existing.some((r) => r.icon === "Waves");

    if (isV1 || isEmpty) {
      if (isV1) await db.delete(propertyFeaturesTable);
      await db.insert(propertyFeaturesTable).values(
        DEFAULT_FEATURES.map((f) => ({ ...f, status: "active" as const }))
      );
      console.log(`[property-features] Seeded v3 (${DEFAULT_FEATURES.length} entries)`);
    } else if (isV2) {
      // Migrate v2 → v3: update applicableTypes
      for (const def of DEFAULT_FEATURES) {
        await db
          .update(propertyFeaturesTable)
          .set({ applicableTypes: def.applicableTypes ?? null } as any)
          .where(eq(propertyFeaturesTable.name, def.name));
      }
      console.log("[property-features] Migrated v2 → v3 (added applicableTypes)");
    }
    seeded = true;
  } catch (err) {
    console.error("[property-features] Seed error:", err);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(req: any): Promise<boolean> {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const session = await getSession(token);
  return !!(session && (session as any).role === "admin");
}

function featureAppliesToType(applicableTypes: string | null | undefined, propertyType: string | undefined): boolean {
  if (!propertyType) return true;
  if (!applicableTypes) return true; // null = all types
  try {
    const types: string[] = JSON.parse(applicableTypes);
    return types.length === 0 || types.includes(propertyType);
  } catch {
    return true;
  }
}

// ── Public: active features / services (filtered by propertyType) ────────────

router.get("/property-features", async (req, res) => {
  await ensureSeeded();
  try {
    const type         = (req.query.type as string) || "feature";
    const propertyType = req.query.propertyType as string | undefined;
    const rows = await db
      .select()
      .from(propertyFeaturesTable)
      .where(eq(propertyFeaturesTable.type, type))
      .orderBy(asc(propertyFeaturesTable.sortOrder));
    const active = rows
      .filter((r) => r.status === "active")
      .filter((r) => featureAppliesToType(r.applicableTypes, propertyType));
    res.json(active);
  } catch (err) {
    console.error("[property-features GET]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: all features (with applicableTypes) ───────────────────────────────

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

// ── Admin: get ALL (features + services) for type-config management ──────────

router.get("/admin/property-features/all", async (req, res) => {
  await ensureSeeded();
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const rows = await db
      .select()
      .from(propertyFeaturesTable)
      .orderBy(asc(propertyFeaturesTable.type), asc(propertyFeaturesTable.sortOrder));
    res.json(rows);
  } catch (err) {
    console.error("[admin/property-features/all GET]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post("/admin/property-features", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const { type, name, icon, sortOrder, applicableTypes } = req.body;
    const [row] = await db
      .insert(propertyFeaturesTable)
      .values({ type, name, icon, sortOrder: sortOrder ?? 99, status: "active", applicableTypes: applicableTypes ?? null })
      .returning();
    res.json(row);
  } catch (err) {
    console.error("[admin/property-features POST]", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin: update (includes applicableTypes) ─────────────────────────────────

router.put("/admin/property-features/:id", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const id = parseInt(req.params.id);
    const updates: Partial<typeof propertyFeaturesTable.$inferInsert> = {};
    if (req.body.name            !== undefined) updates.name            = req.body.name;
    if (req.body.icon            !== undefined) updates.icon            = req.body.icon;
    if (req.body.sortOrder       !== undefined) updates.sortOrder       = req.body.sortOrder;
    if (req.body.status          !== undefined) updates.status          = req.body.status;
    if (req.body.applicableTypes !== undefined) updates.applicableTypes = req.body.applicableTypes;
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

// ── Admin: toggle active/inactive ────────────────────────────────────────────

router.patch("/admin/property-features/:id/toggle", async (req, res) => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(propertyFeaturesTable).where(eq(propertyFeaturesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [row] = await db
      .update(propertyFeaturesTable)
      .set({ status: existing.status === "active" ? "inactive" : "active" })
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
        db.update(propertyFeaturesTable).set({ sortOrder: item.sortOrder }).where(eq(propertyFeaturesTable.id, item.id))
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
