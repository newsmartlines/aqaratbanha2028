import { Router } from "express";
import { db } from "@workspace/db";
import {
  providersTable,
  usersTable,
  categoriesTable,
  subcategoriesTable,
} from "@workspace/db";
import { supportTicketsTable, regionsTable, citiesTable, propertiesTable } from "@workspace/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";
import { autoExportGroup } from "../lib/auto-export";

const router = Router();

function parseAreas(raw: string | null | undefined): number[] {
  try { return JSON.parse(raw ?? "[]"); } catch { return []; }
}

router.use("/admin", adminOnly);

/** Badge counts for admin sidebar (new/pending style items). */
router.get("/admin/sidebar-counts", async (_req, res) => {
  try {
    const [{ pendingProviders } = { pendingProviders: 0 }] = await db
      .select({ pendingProviders: sql<number>`count(*)::int` })
      .from(providersTable)
      .where(and(eq(providersTable.approved, false), eq(providersTable.suspended, false)));
    const [{ suspendedUsers } = { suspendedUsers: 0 }] = await db
      .select({ suspendedUsers: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.status, "suspended"));
    const [{ openTickets } = { openTickets: 0 }] = await db
      .select({ openTickets: sql<number>`count(*)::int` })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.status, "Pending"));
    const [{ pendingProperties } = { pendingProperties: 0 }] = await db
      .select({ pendingProperties: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(eq(propertiesTable.status, "pending"));
    res.json({
      success: true,
      data: {
        pendingProviders: pendingProviders ?? 0,
        suspendedUsers: suspendedUsers ?? 0,
        openTickets: openTickets ?? 0,
        pendingProperties: pendingProperties ?? 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to load sidebar counts" });
  }
});

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

// Write-through: auto-export after any admin category mutation
router.use(["/admin/categories", "/admin/subcategories"], (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400) autoExportGroup("categories");
    });
  }
  next();
});

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
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(2000, Math.max(1, parseInt(String(req.query.limit ?? "500"))));
    const offset = (page - 1) * limit;
    const regionIdQ = parseInt(String(req.query.regionId ?? ""), 10);
    const cityIdQ = parseInt(String(req.query.cityId ?? ""), 10);
    const locFilters = [];
    if (Number.isFinite(regionIdQ) && regionIdQ > 0) locFilters.push(eq(usersTable.regionId, regionIdQ));
    if (Number.isFinite(cityIdQ) && cityIdQ > 0) locFilters.push(eq(usersTable.cityId, cityIdQ));

    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        regionId: usersTable.regionId,
        cityId: usersTable.cityId,
        regionNameAr: regionsTable.nameAr,
        cityNameAr: citiesTable.nameAr,
      })
      .from(usersTable)
      .leftJoin(regionsTable, eq(usersTable.regionId, regionsTable.id))
      .leftJoin(citiesTable, eq(usersTable.cityId, citiesTable.id))
      .where(locFilters.length ? and(...locFilters) : sql`true`)
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
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        regionId: usersTable.regionId,
        cityId: usersTable.cityId,
        regionNameAr: regionsTable.nameAr,
        cityNameAr: citiesTable.nameAr,
      })
      .from(usersTable)
      .leftJoin(regionsTable, eq(usersTable.regionId, regionsTable.id))
      .leftJoin(citiesTable, eq(usersTable.cityId, citiesTable.id))
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
    const { name, email, phone, role, status, regionId, cityId } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (regionId !== undefined) updates.regionId = regionId === null || regionId === "" ? null : Number(regionId);
    if (cityId !== undefined) updates.cityId = cityId === null || cityId === "" ? null : Number(cityId);
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      status: usersTable.status,
      regionId: usersTable.regionId,
      cityId: usersTable.cityId,
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
// SUPPORT TICKETS (admin)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/support-tickets", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: supportTicketsTable.publicId,
        providerId: supportTicketsTable.providerId,
        providerName: usersTable.name,
        providerEmail: usersTable.email,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .innerJoin(providersTable, eq(supportTicketsTable.providerId, providersTable.id))
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .orderBy(desc(supportTicketsTable.createdAt));

    const data = rows.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      providerName: r.providerName,
      providerEmail: r.providerEmail,
      subject: r.subject,
      category: r.category,
      status: r.status,
      message: r.message,
      adminReply: r.adminReply ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    }));
    return res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to load support tickets" });
  }
});

router.patch("/admin/support-tickets/:publicId", async (req, res) => {
  const rawId = req.params.publicId;
  const publicId = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? "";
  if (!publicId) return res.status(400).json({ success: false, error: "Invalid ticket id" });
  const { adminReply, status } = (req.body ?? {}) as { adminReply?: string | null; status?: string };
  try {
    const hasReply = adminReply !== undefined;
    const hasStatus = status === "Open" || status === "Closed";
    if (!hasReply && !hasStatus) {
      return res.status(400).json({ success: false, error: "Send adminReply and/or status (Open|Closed)" });
    }

    const updates: { adminReply?: string | null; status?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (hasReply) {
      const t = String(adminReply).trim();
      updates.adminReply = t.length ? t : null;
    }

    if (status === "Open") updates.status = "Pending";
    else if (status === "Closed") updates.status = "Closed";
    else if (updates.adminReply && updates.adminReply.length > 0) updates.status = "Replied";

    const [updated] = await db
      .update(supportTicketsTable)
      .set(updates)
      .where(eq(supportTicketsTable.publicId, publicId))
      .returning({
        id: supportTicketsTable.publicId,
        providerId: supportTicketsTable.providerId,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });

    if (!updated) return res.status(404).json({ success: false, error: "Ticket not found" });

    const [provRow] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, updated.providerId));

    return res.json({
      success: true,
      data: {
        id: updated.id,
        providerId: updated.providerId,
        providerName: provRow?.name ?? "",
        providerEmail: provRow?.email ?? "",
        subject: updated.subject,
        category: updated.category,
        status: updated.status,
        message: updated.message,
        adminReply: updated.adminReply ?? null,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
        updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : String(updated.updatedAt),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to update ticket" });
  }
});

export default router;
