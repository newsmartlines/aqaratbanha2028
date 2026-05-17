import { Router } from "express";
import { db } from "@workspace/db";
import {
  providersTable,
  usersTable,
  categoriesTable,
  subcategoriesTable,
  serviceItemsTable,
  faultsTable,
  companyPricingTable,
  requestsTable,
  servicesTable,
} from "@workspace/db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

function parseAreas(raw: string | null | undefined): number[] {
  try { return JSON.parse(raw ?? "[]"); } catch { return []; }
}

router.use("/admin", adminOnly);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/companies", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: providersTable.id,
        userId: providersTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        phone: providersTable.phone,
        logo: providersTable.logo,
        avatar: providersTable.avatar,
        city: providersTable.city,
        district: providersTable.district,
        address: providersTable.address,
        coveredAreas: providersTable.coveredAreas,
        active: providersTable.active,
        approved: providersTable.approved,
        suspended: providersTable.suspended,
        verified: providersTable.verified,
        featured: providersTable.featured,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        categoryId: providersTable.categoryId,
        categoryNameAr: categoriesTable.nameAr,
        createdAt: providersTable.createdAt,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .orderBy(desc(providersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(providersTable);
    const parsed = rows.map(r => ({ ...r, coveredAreas: parseAreas(r.coveredAreas) }));
    res.json({ success: true, data: parsed, meta: { page, limit, total: count } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch companies" });
  }
});

router.get("/admin/companies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [company] = await db
      .select({
        id: providersTable.id,
        userId: providersTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        phone: providersTable.phone,
        logo: providersTable.logo,
        avatar: providersTable.avatar,
        bio: providersTable.bio,
        city: providersTable.city,
        district: providersTable.district,
        address: providersTable.address,
        coveredAreas: providersTable.coveredAreas,
        active: providersTable.active,
        approved: providersTable.approved,
        suspended: providersTable.suspended,
        verified: providersTable.verified,
        featured: providersTable.featured,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        categoryId: providersTable.categoryId,
        latitude: providersTable.latitude,
        longitude: providersTable.longitude,
        createdAt: providersTable.createdAt,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, id));

    if (!company) return res.status(404).json({ success: false, error: "Company not found" });
    res.json({ success: true, data: { ...company, coveredAreas: parseAreas(company.coveredAreas) } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch company" });
  }
});

router.post("/admin/companies", async (req, res) => {
  try {
    const { name, email, phone, password, bio, logo, avatar, city, district, address, whatsapp, categoryId, coveredAreas, latitude, longitude } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: "name, email, and password are required" });

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      name, email, phone: phone ?? null, passwordHash, role: "provider", status: "active",
    }).returning();

    const [company] = await db.insert(providersTable).values({
      userId: user.id,
      bio: bio ?? null,
      logo: logo ?? null,
      avatar: avatar ?? null,
      city: city ?? null,
      district: district ?? null,
      address: address ?? null,
      phone: phone ?? null,
      whatsapp: whatsapp ?? null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      coveredAreas: coveredAreas ? JSON.stringify(coveredAreas) : "[]",
      active: true,
      approved: true,
      verified: false,
      featured: false,
      suspended: false,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
    }).returning();

    res.status(201).json({ success: true, data: { ...company, name: user.name, email: user.email } });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ success: false, error: "Email already exists" });
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to create company" });
  }
});

router.put("/admin/companies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bio, logo, avatar, city, district, address, phone, whatsapp, categoryId, coveredAreas, active, verified, featured, approved, suspended, latitude, longitude } = req.body;
    const updates: Record<string, unknown> = {};
    if (bio !== undefined) updates.bio = bio;
    if (logo !== undefined) updates.logo = logo;
    if (avatar !== undefined) updates.avatar = avatar;
    if (city !== undefined) updates.city = city;
    if (district !== undefined) updates.district = district;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (coveredAreas !== undefined) updates.coveredAreas = JSON.stringify(coveredAreas);
    if (active !== undefined) updates.active = active;
    if (verified !== undefined) updates.verified = verified;
    if (featured !== undefined) updates.featured = featured;
    if (approved !== undefined) updates.approved = approved;
    if (suspended !== undefined) updates.suspended = suspended;
    if (latitude !== undefined) updates.latitude = latitude ? String(latitude) : null;
    if (longitude !== undefined) updates.longitude = longitude ? String(longitude) : null;

    const [updated] = await db.update(providersTable).set(updates).where(eq(providersTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Company not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update company" });
  }
});

router.delete("/admin/companies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(providersTable).where(eq(providersTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete company" });
  }
});

router.patch("/admin/companies/:id/toggle-active", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ active: providersTable.active }).from(providersTable).where(eq(providersTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Company not found" });
    const [updated] = await db.update(providersTable).set({ active: !current.active }).where(eq(providersTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to toggle company status" });
  }
});

router.patch("/admin/companies/:id/covered-areas", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { areas } = req.body;
    if (!Array.isArray(areas)) return res.status(400).json({ success: false, error: "areas must be an array" });
    const [updated] = await db.update(providersTable).set({ coveredAreas: JSON.stringify(areas) }).where(eq(providersTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Company not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update covered areas" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/categories", async (_req, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.nameAr);
    res.json({ success: true, data: cats });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.post("/admin/categories", async (req, res) => {
  try {
    const { nameAr, nameEn, slug, icon, description, image, status } = req.body;
    if (!nameAr || !nameEn || !slug) return res.status(400).json({ success: false, error: "nameAr, nameEn, and slug are required" });
    const [cat] = await db.insert(categoriesTable).values({ nameAr, nameEn, slug, icon, description, image, status: status ?? "active" }).returning();
    res.status(201).json({ success: true, data: cat });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ success: false, error: "Slug already exists" });
    res.status(500).json({ success: false, error: "Failed to create category" });
  }
});

router.put("/admin/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nameAr, nameEn, slug, icon, description, image, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (nameAr !== undefined) updates.nameAr = nameAr;
    if (nameEn !== undefined) updates.nameEn = nameEn;
    if (slug !== undefined) updates.slug = slug;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (image !== undefined) updates.image = image;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Category not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update category" });
  }
});

router.patch("/admin/categories/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ status: categoriesTable.status }).from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Category not found" });
    const newStatus = current.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(categoriesTable).set({ status: newStatus }).where(eq(categoriesTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to toggle category status" });
  }
});

router.delete("/admin/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/subcategories", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const rows = categoryId
      ? await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.categoryId, parseInt(String(categoryId)))).orderBy(subcategoriesTable.nameAr)
      : await db.select().from(subcategoriesTable).orderBy(subcategoriesTable.nameAr);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch subcategories" });
  }
});

router.post("/admin/subcategories", async (req, res) => {
  try {
    const { categoryId, nameAr, nameEn, slug, icon, status } = req.body;
    if (!categoryId || !nameAr || !nameEn || !slug) return res.status(400).json({ success: false, error: "categoryId, nameAr, nameEn, and slug are required" });
    const [sub] = await db.insert(subcategoriesTable).values({ categoryId: parseInt(categoryId), nameAr, nameEn, slug, icon, status: status ?? "active" }).returning();
    res.status(201).json({ success: true, data: sub });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create subcategory" });
  }
});

router.put("/admin/subcategories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, nameAr, nameEn, slug, icon, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (categoryId !== undefined) updates.categoryId = parseInt(categoryId);
    if (nameAr !== undefined) updates.nameAr = nameAr;
    if (nameEn !== undefined) updates.nameEn = nameEn;
    if (slug !== undefined) updates.slug = slug;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(subcategoriesTable).set(updates).where(eq(subcategoriesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Subcategory not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update subcategory" });
  }
});

router.patch("/admin/subcategories/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ status: subcategoriesTable.status }).from(subcategoriesTable).where(eq(subcategoriesTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Subcategory not found" });
    const newStatus = current.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(subcategoriesTable).set({ status: newStatus }).where(eq(subcategoriesTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to toggle subcategory status" });
  }
});

router.delete("/admin/subcategories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete subcategory" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES (global service catalog: category → subcategory → service → fault)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/services", async (req, res) => {
  try {
    const { subcategoryId } = req.query;
    const rows = subcategoryId
      ? await db.select().from(serviceItemsTable).where(eq(serviceItemsTable.subcategoryId, parseInt(String(subcategoryId)))).orderBy(serviceItemsTable.nameAr)
      : await db.select().from(serviceItemsTable).orderBy(serviceItemsTable.nameAr);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch services" });
  }
});

router.get("/admin/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [service] = await db.select().from(serviceItemsTable).where(eq(serviceItemsTable.id, id));
    if (!service) return res.status(404).json({ success: false, error: "Service not found" });
    res.json({ success: true, data: service });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch service" });
  }
});

router.post("/admin/services", async (req, res) => {
  try {
    const { subcategoryId, nameAr, nameEn, description, status } = req.body;
    if (!nameAr || !nameEn) return res.status(400).json({ success: false, error: "nameAr and nameEn are required" });
    const [service] = await db.insert(serviceItemsTable).values({
      subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
      nameAr,
      nameEn,
      description: description ?? null,
      status: status ?? "active",
    }).returning();
    res.status(201).json({ success: true, data: service });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create service" });
  }
});

router.put("/admin/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subcategoryId, nameAr, nameEn, description, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (subcategoryId !== undefined) updates.subcategoryId = subcategoryId ? parseInt(subcategoryId) : null;
    if (nameAr !== undefined) updates.nameAr = nameAr;
    if (nameEn !== undefined) updates.nameEn = nameEn;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(serviceItemsTable).set(updates).where(eq(serviceItemsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Service not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update service" });
  }
});

router.patch("/admin/services/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ status: serviceItemsTable.status }).from(serviceItemsTable).where(eq(serviceItemsTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Service not found" });
    const newStatus = current.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(serviceItemsTable).set({ status: newStatus }).where(eq(serviceItemsTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to toggle service status" });
  }
});

router.delete("/admin/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(serviceItemsTable).where(eq(serviceItemsTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete service" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAULTS / ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/faults", async (req, res) => {
  try {
    const { serviceItemId } = req.query;
    const rows = serviceItemId
      ? await db.select().from(faultsTable).where(eq(faultsTable.serviceItemId, parseInt(String(serviceItemId)))).orderBy(faultsTable.nameAr)
      : await db.select().from(faultsTable).orderBy(faultsTable.nameAr);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch faults" });
  }
});

router.get("/admin/faults/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [fault] = await db.select().from(faultsTable).where(eq(faultsTable.id, id));
    if (!fault) return res.status(404).json({ success: false, error: "Fault not found" });
    res.json({ success: true, data: fault });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch fault" });
  }
});

router.post("/admin/faults", async (req, res) => {
  try {
    const { serviceItemId, nameAr, nameEn, description, defaultPrice, status } = req.body;
    if (!nameAr || !nameEn) return res.status(400).json({ success: false, error: "nameAr and nameEn are required" });
    const [fault] = await db.insert(faultsTable).values({
      serviceItemId: serviceItemId ? parseInt(serviceItemId) : null,
      nameAr,
      nameEn,
      description: description ?? null,
      defaultPrice: defaultPrice ? String(defaultPrice) : null,
      status: status ?? "active",
    }).returning();
    res.status(201).json({ success: true, data: fault });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create fault" });
  }
});

router.put("/admin/faults/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { serviceItemId, nameAr, nameEn, description, defaultPrice, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (serviceItemId !== undefined) updates.serviceItemId = serviceItemId ? parseInt(serviceItemId) : null;
    if (nameAr !== undefined) updates.nameAr = nameAr;
    if (nameEn !== undefined) updates.nameEn = nameEn;
    if (description !== undefined) updates.description = description;
    if (defaultPrice !== undefined) updates.defaultPrice = defaultPrice ? String(defaultPrice) : null;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(faultsTable).set(updates).where(eq(faultsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Fault not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update fault" });
  }
});

router.patch("/admin/faults/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ status: faultsTable.status }).from(faultsTable).where(eq(faultsTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Fault not found" });
    const newStatus = current.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(faultsTable).set({ status: newStatus }).where(eq(faultsTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to toggle fault status" });
  }
});

router.delete("/admin/faults/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(faultsTable).where(eq(faultsTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete fault" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY PRICING
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/companies/:companyId/pricing", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const rows = await db
      .select({
        id: companyPricingTable.id,
        companyId: companyPricingTable.companyId,
        serviceItemId: companyPricingTable.serviceItemId,
        faultId: companyPricingTable.faultId,
        customPrice: companyPricingTable.customPrice,
        updatedAt: companyPricingTable.updatedAt,
        serviceNameAr: serviceItemsTable.nameAr,
        serviceNameEn: serviceItemsTable.nameEn,
        faultNameAr: faultsTable.nameAr,
        faultNameEn: faultsTable.nameEn,
        defaultPrice: faultsTable.defaultPrice,
      })
      .from(companyPricingTable)
      .leftJoin(serviceItemsTable, eq(companyPricingTable.serviceItemId, serviceItemsTable.id))
      .leftJoin(faultsTable, eq(companyPricingTable.faultId, faultsTable.id))
      .where(eq(companyPricingTable.companyId, companyId));
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch company pricing" });
  }
});

// Effective price for company + service + fault
router.get("/admin/companies/:companyId/pricing/effective", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const faultId = req.query.faultId ? parseInt(String(req.query.faultId)) : null;
    const serviceItemId = req.query.serviceItemId ? parseInt(String(req.query.serviceItemId)) : null;

    if (!faultId && !serviceItemId) return res.status(400).json({ success: false, error: "faultId or serviceItemId query param is required" });

    // Look for most specific override: company + fault first, then company + service
    let override = null;
    if (faultId) {
      const [r] = await db
        .select({ customPrice: companyPricingTable.customPrice })
        .from(companyPricingTable)
        .where(and(eq(companyPricingTable.companyId, companyId), eq(companyPricingTable.faultId, faultId)));
      override = r ?? null;
    }
    if (!override && serviceItemId) {
      const [r] = await db
        .select({ customPrice: companyPricingTable.customPrice })
        .from(companyPricingTable)
        .where(and(eq(companyPricingTable.companyId, companyId), eq(companyPricingTable.serviceItemId, serviceItemId)));
      override = r ?? null;
    }

    let defaultPrice = null;
    if (faultId) {
      const [fault] = await db.select({ defaultPrice: faultsTable.defaultPrice }).from(faultsTable).where(eq(faultsTable.id, faultId));
      defaultPrice = fault?.defaultPrice ?? null;
    }

    const effectivePrice = override?.customPrice ?? defaultPrice;
    res.json({ success: true, data: { companyId, serviceItemId, faultId, effectivePrice, isCustom: !!override, defaultPrice } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to get effective price" });
  }
});

router.put("/admin/companies/:companyId/pricing", async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { serviceItemId, faultId, customPrice } = req.body;
    if (customPrice === undefined) return res.status(400).json({ success: false, error: "customPrice is required" });
    if (!serviceItemId && !faultId) return res.status(400).json({ success: false, error: "serviceItemId or faultId is required" });

    const conditions = [eq(companyPricingTable.companyId, companyId)];
    if (faultId) conditions.push(eq(companyPricingTable.faultId, parseInt(faultId)));
    if (serviceItemId) conditions.push(eq(companyPricingTable.serviceItemId, parseInt(serviceItemId)));

    const [existing] = await db.select({ id: companyPricingTable.id }).from(companyPricingTable).where(and(...conditions));

    let result;
    if (existing) {
      [result] = await db.update(companyPricingTable).set({ customPrice: String(customPrice), updatedAt: new Date() }).where(eq(companyPricingTable.id, existing.id)).returning();
    } else {
      [result] = await db.insert(companyPricingTable).values({
        companyId,
        serviceItemId: serviceItemId ? parseInt(serviceItemId) : null,
        faultId: faultId ? parseInt(faultId) : null,
        customPrice: String(customPrice),
      }).returning();
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to set company pricing" });
  }
});

router.delete("/admin/companies/:companyId/pricing/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const companyId = parseInt(req.params.companyId);
    await db.delete(companyPricingTable).where(and(eq(companyPricingTable.id, id), eq(companyPricingTable.companyId, companyId)));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete pricing override" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/orders", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const baseQuery = db
      .select({
        id: requestsTable.id,
        status: requestsTable.status,
        message: requestsTable.message,
        notes: requestsTable.notes,
        effectivePrice: requestsTable.effectivePrice,
        faultId: requestsTable.faultId,
        serviceId: requestsTable.serviceId,
        userId: requestsTable.userId,
        providerId: requestsTable.providerId,
        assignedCompanyId: requestsTable.assignedCompanyId,
        createdAt: requestsTable.createdAt,
        customerName: usersTable.name,
        customerPhone: usersTable.phone,
        faultNameAr: faultsTable.nameAr,
        faultNameEn: faultsTable.nameEn,
        defaultPrice: faultsTable.defaultPrice,
        serviceTitle: servicesTable.title,
      })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
      .leftJoin(faultsTable, eq(requestsTable.faultId, faultsTable.id))
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .orderBy(desc(requestsTable.createdAt));

    const rows = status
      ? await baseQuery.where(eq(requestsTable.status, String(status))).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    const allProviders = await db
      .select({ id: providersTable.id, name: usersTable.name })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id));
    const companyMap = new Map(allProviders.map(c => [c.id, c.name]));

    const result = rows.map(r => ({
      ...r,
      assignedCompanyName: r.assignedCompanyId ? (companyMap.get(r.assignedCompanyId) ?? null) : null,
      providerName: r.providerId ? (companyMap.get(r.providerId) ?? null) : null,
    }));

    const countRows = status
      ? await db.select({ count: sql<number>`count(*)::int` }).from(requestsTable).where(eq(requestsTable.status, String(status)))
      : await db.select({ count: sql<number>`count(*)::int` }).from(requestsTable);

    res.json({ success: true, data: result, meta: { page, limit, total: countRows[0].count } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

router.get("/admin/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db
      .select({
        id: requestsTable.id,
        status: requestsTable.status,
        message: requestsTable.message,
        notes: requestsTable.notes,
        effectivePrice: requestsTable.effectivePrice,
        faultId: requestsTable.faultId,
        serviceId: requestsTable.serviceId,
        userId: requestsTable.userId,
        providerId: requestsTable.providerId,
        assignedCompanyId: requestsTable.assignedCompanyId,
        createdAt: requestsTable.createdAt,
        customerName: usersTable.name,
        customerPhone: usersTable.phone,
        faultNameAr: faultsTable.nameAr,
        faultNameEn: faultsTable.nameEn,
        defaultPrice: faultsTable.defaultPrice,
        serviceTitle: servicesTable.title,
      })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
      .leftJoin(faultsTable, eq(requestsTable.faultId, faultsTable.id))
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .where(eq(requestsTable.id, id));

    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const companyId = order.assignedCompanyId ?? order.providerId;
    let assignedCompanyName = null;
    if (companyId) {
      const [company] = await db
        .select({ name: usersTable.name })
        .from(providersTable)
        .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
        .where(eq(providersTable.id, companyId));
      assignedCompanyName = company?.name ?? null;
    }

    res.json({ success: true, data: { ...order, assignedCompanyName } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
});

router.post("/admin/orders", async (req, res) => {
  try {
    const { userId, providerId, assignedCompanyId, serviceId, faultId, effectivePrice, message, notes, status } = req.body;
    const [order] = await db.insert(requestsTable).values({
      userId: userId ?? null,
      providerId: providerId ?? null,
      assignedCompanyId: assignedCompanyId ?? null,
      serviceId: serviceId ?? null,
      faultId: faultId ?? null,
      effectivePrice: effectivePrice ? String(effectivePrice) : null,
      message: message ?? null,
      notes: notes ?? null,
      status: status ?? "new",
    }).returning();
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create order" });
  }
});

router.patch("/admin/orders/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ["new", "pending", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: `Invalid status. Allowed: ${allowed.join(", ")}` });
    const [updated] = await db.update(requestsTable).set({ status }).where(eq(requestsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update order status" });
  }
});

router.patch("/admin/orders/:id/assign-company", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ success: false, error: "companyId is required" });
    const [updated] = await db.update(requestsTable).set({ assignedCompanyId: parseInt(companyId) }).where(eq(requestsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to reassign company" });
  }
});

router.patch("/admin/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes, effectivePrice, assignedCompanyId } = req.body;
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (effectivePrice !== undefined) updates.effectivePrice = effectivePrice ? String(effectivePrice) : null;
    if (assignedCompanyId !== undefined) updates.assignedCompanyId = assignedCompanyId;
    const [updated] = await db.update(requestsTable).set(updates).where(eq(requestsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update order" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    res.json({ success: true, data: rows, meta: { page, limit, total: count } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.get("/admin/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

router.put("/admin/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, role, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
      id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, status: usersTable.status,
    });
    if (!updated) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

router.delete("/admin/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/analytics", async (_req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [totalOrders] = await db.select({ count: sql<number>`count(*)::int` }).from(requestsTable);
    const [totalRevenue] = await db.select({ sum: sql<number>`coalesce(sum(effective_price::numeric), 0)::float` }).from(requestsTable).where(eq(requestsTable.status, "completed"));
    const [activeCompanies] = await db.select({ count: sql<number>`count(*)::int` }).from(providersTable).where(and(eq(providersTable.active, true), eq(providersTable.approved, true)));
    const [newUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(gte(usersTable.createdAt, thirtyDaysAgo));

    // Top 5 services by order volume (via serviceId on requests, joined to servicesTable)
    const topServices = await db
      .select({
        serviceId: requestsTable.serviceId,
        serviceTitle: servicesTable.title,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(requestsTable)
      .leftJoin(servicesTable, eq(requestsTable.serviceId, servicesTable.id))
      .groupBy(requestsTable.serviceId, servicesTable.title)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    const dailyStats = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        orderCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(case when status = 'completed' then effective_price::numeric else 0 end), 0)::float`,
      })
      .from(requestsTable)
      .where(gte(requestsTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`);

    const monthlyStats = await db
      .select({
        month: sql<string>`date_trunc('month', created_at)::date::text`,
        orderCount: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(case when status = 'completed' then effective_price::numeric else 0 end), 0)::float`,
      })
      .from(requestsTable)
      .where(gte(requestsTable.createdAt, oneYearAgo))
      .groupBy(sql`date_trunc('month', created_at)`)
      .orderBy(sql`date_trunc('month', created_at)`);

    res.json({
      success: true,
      data: {
        totals: {
          orders: totalOrders.count,
          revenue: totalRevenue.sum,
          activeCompanies: activeCompanies.count,
          newUsersLast30Days: newUsers.count,
        },
        topServices,
        dailyStats,
        monthlyStats,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch analytics" });
  }
});

export default router;
