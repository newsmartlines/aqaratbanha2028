import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable } from "@workspace/db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

async function requireAuth(req: any): Promise<{ userId: number; providerId?: number } | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session as any;
}

router.get("/properties", async (req, res) => {
  try {
    const { providerId, mainCategory, listingType, status, search, limit = "50", offset = "0" } = req.query as Record<string, string>;

    let query = db.select().from(propertiesTable).$dynamic();
    const conds: any[] = [];
    if (providerId) conds.push(eq(propertiesTable.providerId, parseInt(providerId)));
    if (mainCategory) conds.push(eq(propertiesTable.mainCategory, mainCategory));
    if (listingType) conds.push(eq(propertiesTable.listingType, listingType));
    if (status) conds.push(eq(propertiesTable.status, status));
    if (search) conds.push(or(ilike(propertiesTable.title, `%${search}%`), ilike(propertiesTable.description, `%${search}%`)));
    if (conds.length) query = query.where(and(...conds));

    const rows = await query
      .orderBy(desc(propertiesTable.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch properties" });
  }
});

router.get("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!row) return res.status(404).json({ success: false, error: "Property not found" });
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch property" });
  }
});

router.post("/properties", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const {
      providerId, title, description, mainCategory, listingType, subCategory,
      price, area, rooms, bathrooms, floor, totalFloors, buildYear,
      finishing, condition, furnished, direction, paymentMethod,
      address, regionId, cityId, district, latitude, longitude,
      images, videoUrl, brochureUrl, logoUrl, phone, whatsapp,
      features, nearbyServices, contactMethods,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "العنوان مطلوب" });
    if (!mainCategory) return res.status(400).json({ success: false, error: "التصنيف الرئيسي مطلوب" });
    if (!listingType) return res.status(400).json({ success: false, error: "نوع القائمة مطلوب" });
    if (!providerId) return res.status(400).json({ success: false, error: "معرّف المزود مطلوب" });

    const [property] = await db.insert(propertiesTable).values({
      providerId: parseInt(providerId),
      title,
      description,
      mainCategory,
      listingType,
      subCategory,
      price: price ? String(price) : null,
      area: area ? String(area) : null,
      rooms: rooms ? parseInt(rooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      floor: floor != null ? parseInt(floor) : null,
      totalFloors: totalFloors ? parseInt(totalFloors) : null,
      buildYear: buildYear ? parseInt(buildYear) : null,
      finishing,
      condition,
      furnished,
      direction,
      paymentMethod,
      address,
      regionId: regionId ? parseInt(regionId) : null,
      cityId: cityId ? parseInt(cityId) : null,
      district,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      images: Array.isArray(images) ? JSON.stringify(images) : images,
      videoUrl,
      brochureUrl,
      logoUrl,
      phone,
      whatsapp,
      features: Array.isArray(features) ? JSON.stringify(features) : features,
      nearbyServices: Array.isArray(nearbyServices) ? JSON.stringify(nearbyServices) : nearbyServices,
      contactMethods: Array.isArray(contactMethods) ? JSON.stringify(contactMethods) : contactMethods,
      status: "pending",
    }).returning();

    res.json({ success: true, data: property });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to create property" });
  }
});

router.put("/properties/:id", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Property not found" });

    const updateData: any = { ...req.body };
    if (Array.isArray(updateData.images)) updateData.images = JSON.stringify(updateData.images);
    if (Array.isArray(updateData.features)) updateData.features = JSON.stringify(updateData.features);
    if (Array.isArray(updateData.nearbyServices)) updateData.nearbyServices = JSON.stringify(updateData.nearbyServices);
    if (Array.isArray(updateData.contactMethods)) updateData.contactMethods = JSON.stringify(updateData.contactMethods);

    const [updated] = await db.update(propertiesTable).set(updateData).where(eq(propertiesTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to update property" });
  }
});

router.delete("/properties/:id", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const id = parseInt(req.params.id);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to delete property" });
  }
});

router.patch("/properties/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [updated] = await db.update(propertiesTable).set({ status }).where(eq(propertiesTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to update status" });
  }
});

export default router;
