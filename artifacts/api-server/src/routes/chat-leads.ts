import { Router } from "express";
import { db, chatLeadsTable, notificationsTable, chatSessionsTable, chatbotQueriesTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";

const router = Router();

// POST /api/chat-leads — submit a lead from chatbot
router.post("/chat-leads", async (req, res) => {
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
router.get("/chat-leads", async (req, res) => {
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
router.patch("/chat-leads/:id", async (req, res) => {
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
router.get("/chat-analytics", async (req, res) => {
  try {
    const [
      [leadsTotal], [leadsNew], [leadsContacted], [leadsQualified],
      [sessionsTotal], recentLeads, topProperties, popularQueries,
    ] = await Promise.all([
      db.select({ count: count() }).from(chatLeadsTable),
      db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "new")),
      db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "contacted")),
      db.select({ count: count() }).from(chatLeadsTable).where(eq(chatLeadsTable.status, "qualified")),
      db.select({ count: count() }).from(chatSessionsTable),
      db.select().from(chatLeadsTable).orderBy(desc(chatLeadsTable.createdAt)).limit(10),
      db.select({ title: chatLeadsTable.propertyTitle, total: count() })
        .from(chatLeadsTable)
        .where(sql`${chatLeadsTable.propertyTitle} is not null`)
        .groupBy(chatLeadsTable.propertyTitle)
        .orderBy(desc(count()))
        .limit(5),
      db.select().from(chatbotQueriesTable).orderBy(desc(chatbotQueriesTable.count)).limit(10),
    ]);

    return res.json({
      totalLeads: leadsTotal.count,
      newLeads: leadsNew.count,
      contacted: leadsContacted.count,
      qualified: leadsQualified.count,
      totalSessions: sessionsTotal.count,
      conversionRate: leadsTotal.count > 0
        ? Math.round((Number(leadsQualified.count) / Number(leadsTotal.count)) * 100)
        : 0,
      recentLeads,
      topProperties,
      popularQueries,
    });
  } catch (err) {
    console.error("[chat-analytics]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
