import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentTransactionsTable,
  providersTable,
  usersTable,
  servicesTable,
  packagesTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

async function getSessionUser(req: import("express").Request) {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return getSession(token);
}

function calcTotals(rows: Array<{ status: string; amount: string }>) {
  const t = { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0 };
  for (const r of rows) {
    const amt = parseFloat(String(r.amount ?? "0")) || 0;
    if (r.status === "paid")         { t.paid++;    t.paidAmount    += amt; }
    else if (r.status === "pending") { t.pending++; t.pendingAmount += amt; }
    else                              { t.failed++;  t.failedAmount  += amt; }
  }
  return t;
}

/**
 * GET /users/me/payments
 * Returns the logged-in user's outgoing payment transactions.
 */
router.get("/users/me/payments", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const userId = session.userId;

    // 1) payment_transactions where user_id = me (service request payments)
    const txRows = await db
      .select({
        id: paymentTransactionsTable.id,
        refId: paymentTransactionsTable.refId,
        kind: paymentTransactionsTable.kind,
        providerId: paymentTransactionsTable.providerId,
        serviceId: paymentTransactionsTable.serviceId,
        amount: paymentTransactionsTable.amount,
        commissionAmount: paymentTransactionsTable.commissionAmount,
        currency: paymentTransactionsTable.currency,
        gateway: paymentTransactionsTable.gateway,
        gatewayRef: paymentTransactionsTable.gatewayRef,
        status: paymentTransactionsTable.status,
        paidAt: paymentTransactionsTable.paidAt,
        createdAt: paymentTransactionsTable.createdAt,
        providerUserId: providersTable.userId,
      })
      .from(paymentTransactionsTable)
      .leftJoin(providersTable, eq(paymentTransactionsTable.providerId, providersTable.id))
      .where(eq(paymentTransactionsTable.userId, userId))
      .orderBy(desc(paymentTransactionsTable.createdAt));

    const providerIds = [...new Set(txRows.map((r) => r.providerUserId).filter(Boolean))] as number[];
    const serviceIds = [...new Set(txRows.map((r) => r.serviceId).filter(Boolean))] as number[];

    const [providerUsers, serviceRows] = await Promise.all([
      providerIds.length
        ? db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
            .where(eq(usersTable.id, providerIds[0]))
        : Promise.resolve([]),
      serviceIds.length
        ? db.select({ id: servicesTable.id, title: servicesTable.title }).from(servicesTable)
        : Promise.resolve([]),
    ]);

    const provUserMap = new Map(providerUsers.map((u) => [u.id, u.name]));
    const svcMap = new Map(serviceRows.map((s) => [s.id, s.title]));

    const rows = txRows.map((r) => ({
      id: r.id,
      refId: r.refId,
      kind: r.kind,
      providerId: r.providerId,
      providerName: r.providerUserId ? (provUserMap.get(r.providerUserId) ?? null) : null,
      serviceId: r.serviceId,
      serviceTitle: r.serviceId ? (svcMap.get(r.serviceId) ?? null) : null,
      amount: r.amount,
      commissionAmount: r.commissionAmount,
      currency: r.currency,
      status: r.status as "pending" | "paid" | "failed" | "cancelled",
      gateway: r.gateway,
      gatewayRef: r.gatewayRef,
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    // 2) Also include subscription payments (provider subscriptions linked to this user)
    const subRows = await db
      .select({
        id: subscriptionsTable.id,
        packageId: subscriptionsTable.packageId,
        providerId: subscriptionsTable.providerId,
        startDate: subscriptionsTable.startDate,
        status: subscriptionsTable.status,
        amount: packagesTable.price,
        packageNameAr: packagesTable.nameAr,
      })
      .from(subscriptionsTable)
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .leftJoin(providersTable, eq(subscriptionsTable.providerId, providersTable.id))
      .where(eq(providersTable.userId, userId))
      .orderBy(desc(subscriptionsTable.createdAt));

    const subPaymentRows = subRows.map((s) => ({
      id: -s.id,
      refId: `SUB-${s.id}`,
      kind: "subscription",
      providerId: s.providerId,
      providerName: null,
      serviceId: null,
      serviceTitle: s.packageNameAr ?? "اشتراك",
      amount: s.amount ?? "0",
      commissionAmount: "0",
      currency: "EGP",
      status: (s.status === "active" || s.status === "expired" ? "paid" : "pending") as "pending" | "paid" | "failed" | "cancelled",
      gateway: "manual",
      gatewayRef: null,
      paidAt: s.startDate ? new Date(s.startDate).toISOString() : null,
      createdAt: s.startDate ? new Date(s.startDate).toISOString() : new Date().toISOString(),
    }));

    const allRows = [...rows, ...subPaymentRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totals = calcTotals(allRows);

    res.json({ success: true, rows: allRows, totals });
  } catch (e) {
    console.error("user payments error", e);
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

/**
 * GET /providers/me/payments
 * Returns the logged-in provider's incoming payment transactions.
 */
router.get("/providers/me/payments", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const [provRow] = await db
      .select({ id: providersTable.id })
      .from(providersTable)
      .where(eq(providersTable.userId, session.userId));

    if (!provRow) return res.status(404).json({ success: false, error: "لم يتم العثور على مزود" });

    const providerId = provRow.id;

    const txRows = await db
      .select({
        id: paymentTransactionsTable.id,
        refId: paymentTransactionsTable.refId,
        kind: paymentTransactionsTable.kind,
        userId: paymentTransactionsTable.userId,
        serviceId: paymentTransactionsTable.serviceId,
        amount: paymentTransactionsTable.amount,
        commissionAmount: paymentTransactionsTable.commissionAmount,
        currency: paymentTransactionsTable.currency,
        gateway: paymentTransactionsTable.gateway,
        status: paymentTransactionsTable.status,
        paidAt: paymentTransactionsTable.paidAt,
        createdAt: paymentTransactionsTable.createdAt,
      })
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.providerId, providerId))
      .orderBy(desc(paymentTransactionsTable.createdAt));

    const userIds = [...new Set(txRows.map((r) => r.userId).filter(Boolean))] as number[];
    const serviceIds = [...new Set(txRows.map((r) => r.serviceId).filter(Boolean))] as number[];

    const [customerRows, serviceRows] = await Promise.all([
      userIds.length
        ? db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone })
            .from(usersTable)
        : Promise.resolve([]),
      serviceIds.length
        ? db.select({ id: servicesTable.id, title: servicesTable.title }).from(servicesTable)
        : Promise.resolve([]),
    ]);

    const custMap = new Map(customerRows.map((c) => [c.id, c]));
    const svcMap = new Map(serviceRows.map((s) => [s.id, s.title]));

    const rows = txRows.map((r) => {
      const cust = r.userId ? custMap.get(r.userId) : null;
      return {
        id: r.id,
        refId: r.refId,
        kind: r.kind,
        userId: r.userId,
        customerName: cust?.name ?? null,
        customerPhone: cust?.phone ?? null,
        serviceId: r.serviceId,
        serviceTitle: r.serviceId ? (svcMap.get(r.serviceId) ?? null) : null,
        amount: r.amount,
        commissionAmount: r.commissionAmount,
        currency: r.currency,
        status: r.status as "pending" | "paid" | "failed" | "cancelled",
        gateway: r.gateway,
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const baseTotals = calcTotals(rows);
    const netEarnings = rows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + (parseFloat(String(r.amount)) || 0) - (parseFloat(String(r.commissionAmount)) || 0), 0);

    res.json({ success: true, rows, totals: { ...baseTotals, netEarnings } });
  } catch (e) {
    console.error("provider payments error", e);
    res.status(500).json({ success: false, error: "Failed to fetch provider payments" });
  }
});

export default router;
