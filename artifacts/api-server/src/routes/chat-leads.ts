import { Router } from "express";
import { db, chatLeadsTable, notificationsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";

const router = Router();

// POST /api/chat-leads — submit a lead from chatbot
router.post("/api/chat-leads", async (req, res) => {
  try {
    const { sessionId, name, phone, whatsapp, email, propertyId, propertyTitle, intent } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const [lead] = await db.insert(chatLeadsTable).values({
      sessionId,
      name: name || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      propertyId: propertyId || null,
      propertyTitle: propertyTitle || null,
      intent: intent ? JSON.stringify(intent) : null,
      status: "new",
    }).returning();

    // Create admin notification
    await db.insert(notificationsTable).values({
      userId: null,
      type: "success",
      title: "🔥 عميل مهتم جديد من الشات بوت",
      message: `${name || "زائر"} يهتم بـ: ${propertyTitle || "عقار"} — الهاتف: ${phone || whatsapp || "غير متوفر"}`,
      link: "/admin/chatbot?tab=leads",
    } as any);

    return res.json({ ok: true, lead });
  } catch (err) {
    console.error("[chat-leads POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/chat-leads — admin list leads
router.get("/api/chat-leads", async (req, res) => {
  try {
    const leads = await db
      .select()
      .from(chatLeadsTable)
      .orderBy(desc(chatLeadsTable.createdAt))
      .limit(200);
    return res.json(leads);
  } catch (err) {
    console.error("[chat-leads GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/chat-leads/:id — update lead status
router.patch("/api/chat-leads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const [updated] = await db
      .update(chatLeadsTable)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(chatLeadsTable.id, id))
      .returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/chat-analytics — summary stats
router.get("/api/chat-analytics", async (req, res) => {
  try {
    const [leadsTotal] = await db.select({ count: count() }).from(chatLeadsTable);
    const [leadsNew] = await db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "new"));
    const [leadsContacted] = await db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "contacted"));
    const [leadsQualified] = await db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "qualified"));

    // Recent leads last 7 days
    const recentLeads = await db
      .select()
      .from(chatLeadsTable)
      .orderBy(desc(chatLeadsTable.createdAt))
      .limit(10);

    // Top requested property titles
    const topProperties = await db
      .select({
        title: chatLeadsTable.propertyTitle,
        total: count(),
      })
      .from(chatLeadsTable)
      .where(sql`${chatLeadsTable.propertyTitle} is not null`)
      .groupBy(chatLeadsTable.propertyTitle)
      .orderBy(desc(count()))
      .limit(5);

    return res.json({
      totalLeads: leadsTotal.count,
      newLeads: leadsNew.count,
      contacted: leadsContacted.count,
      qualified: leadsQualified.count,
      conversionRate: leadsTotal.count > 0
        ? Math.round((Number(leadsQualified.count) / Number(leadsTotal.count)) * 100)
        : 0,
      recentLeads,
      topProperties,
    });
  } catch (err) {
    console.error("[chat-analytics]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
