import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, providersTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, and, ilike, gte, lte } from "drizzle-orm";

const router = Router();

/* ── Public: list all active services (with provider + category info) ── */
router.get("/services", async (req, res) => {
  try {
    const { search, category, city, priceMin, priceMax } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: servicesTable.id,
        title: servicesTable.title,
        description: servicesTable.description,
        price: servicesTable.price,
        subcategory: servicesTable.subcategory,
        img: servicesTable.img,
        status: servicesTable.status,
        createdAt: servicesTable.createdAt,
        providerId: servicesTable.providerId,
        providerName: usersTable.name,
        providerAvatar: providersTable.avatar,
        providerCity: providersTable.city,
        providerApproved: providersTable.approved,
        providerSuspended: providersTable.suspended,
        categoryId: categoriesTable.id,
        categoryNameAr: categoriesTable.nameAr,
      })
      .from(servicesTable)
      .leftJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(servicesTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(servicesTable.status, "active"),
          search ? ilike(servicesTable.title, `%${search}%`) : undefined,
          category && category !== "all" ? eq(servicesTable.categoryId, parseInt(category)) : undefined,
          priceMin ? gte(servicesTable.price, priceMin) : undefined,
          priceMax ? lte(servicesTable.price, priceMax) : undefined,
        )
      )
      .orderBy(servicesTable.createdAt);

    // Filter by city (on provider) if requested — done in JS since city is on provider
    const cityFiltered = city && city !== "all"
      ? rows.filter(r => r.providerCity?.toLowerCase().includes(city.toLowerCase()))
      : rows;

    // Only show services from approved, non-suspended providers
    const visible = cityFiltered.filter(r => r.providerApproved && !r.providerSuspended);

    res.json({ success: true, data: visible });
  } catch (err) {
    console.error("GET /services error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch services" });
  }
});

router.get("/providers/:providerId/services", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const services = await db.select().from(servicesTable).where(eq(servicesTable.providerId, providerId)).orderBy(servicesTable.createdAt);
    res.json({ success: true, data: services });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch services" });
  }
});

router.post("/providers/:providerId/services", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const { title, description, price, categoryId, subcategory, img, status } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "Title is required" });

    const [provider] = await db
      .select({ categoryId: providersTable.categoryId, approved: providersTable.approved, suspended: providersTable.suspended })
      .from(providersTable)
      .where(eq(providersTable.id, providerId));

    // Validate: categoryId must match provider's main categoryId
    if (categoryId && provider?.categoryId && parseInt(categoryId) !== provider.categoryId) {
      return res.status(400).json({ success: false, error: "لا يمكن إضافة خدمة خارج قسمك الرئيسي" });
    }

    // If the provider is already approved & not suspended, default new
    // services to "active" so they appear on the public profile immediately.
    const finalStatus = status ?? (provider?.approved && !provider?.suspended ? "active" : "pending");

    const [service] = await db
      .insert(servicesTable)
      .values({ providerId, title, description, price, categoryId: categoryId ? parseInt(categoryId) : null, subcategory, img, status: finalStatus })
      .returning();
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create service" });
  }
});

router.put("/providers/:providerId/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);
    const { title, description, price, categoryId, subcategory, img, status } = req.body;
    const existing = await db.select().from(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)));
    if (!existing.length) return res.status(404).json({ success: false, error: "Service not found" });

    const [provider] = await db
      .select({ categoryId: providersTable.categoryId, approved: providersTable.approved, suspended: providersTable.suspended })
      .from(providersTable)
      .where(eq(providersTable.id, providerId));

    // Validate: categoryId must match provider's main categoryId
    if (categoryId && provider?.categoryId && parseInt(categoryId) !== provider.categoryId) {
      return res.status(400).json({ success: false, error: "لا يمكن إضافة خدمة خارج قسمك الرئيسي" });
    }

    // For approved providers, ensure status stays active when not explicitly
    // changed — never silently demote a service back to "pending" on edit.
    const finalStatus = status ?? (provider?.approved && !provider?.suspended ? "active" : undefined);

    const [service] = await db
      .update(servicesTable)
      .set({ title, description, price, categoryId: categoryId ? parseInt(categoryId) : undefined, subcategory, img, status: finalStatus })
      .where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)))
      .returning();
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update service" });
  }
});

router.delete("/providers/:providerId/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);
    await db.delete(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.providerId, providerId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete service" });
  }
});

export default router;
