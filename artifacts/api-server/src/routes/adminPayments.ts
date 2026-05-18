import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentTransactionsTable,
  paymentsTable,
  subscriptionsTable,
  providersTable,
  usersTable,
  packagesTable,
  servicesTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.use("/admin", adminOnly);

function parseDate(input: unknown): Date | null {
  if (typeof input !== "string" || !input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

/**
 * Unified payments view: combines paymentTransactionsTable with paymentsTable
 * (legacy subscription invoice rows). Each row has the same shape so the admin
 * UI can render them uniformly with status badges (paid / pending / failed).
 */
async function loadPayments(opts: { from?: Date | null; to?: Date | null; status?: string | null }) {
  const txConds = [];
  if (opts.from) txConds.push(gte(paymentTransactionsTable.createdAt, startOfDay(opts.from)));
  if (opts.to) txConds.push(lte(paymentTransactionsTable.createdAt, endOfDay(opts.to)));
  if (opts.status) txConds.push(eq(paymentTransactionsTable.status, opts.status));

  // 1) Payment transactions history
  const txRows = await db
    .select({
      id: paymentTransactionsTable.id,
      refId: paymentTransactionsTable.refId,
      providerId: paymentTransactionsTable.providerId,
      providerName: usersTable.name,
      providerEmail: usersTable.email,
      providerPhone: providersTable.phone,
      customerId: paymentTransactionsTable.userId,
      serviceId: paymentTransactionsTable.serviceId,
      kind: paymentTransactionsTable.kind,
      amount: paymentTransactionsTable.amount,
      commissionAmount: paymentTransactionsTable.commissionAmount,
      status: paymentTransactionsTable.status,
      gateway: paymentTransactionsTable.gateway,
      gatewayRef: paymentTransactionsTable.gatewayRef,
      paidAt: paymentTransactionsTable.paidAt,
      createdAt: paymentTransactionsTable.createdAt,
    })
    .from(paymentTransactionsTable)
    .leftJoin(providersTable, eq(paymentTransactionsTable.providerId, providersTable.id))
    .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
    .where(txConds.length ? and(...txConds) : undefined)
    .orderBy(desc(paymentTransactionsTable.createdAt));

  // Hydrate customer names + service titles in batch
  const customerIds = [...new Set(txRows.map((r) => r.customerId).filter((x): x is number => !!x))];
  const serviceIds = [...new Set(txRows.map((r) => r.serviceId).filter((x): x is number => !!x))];
  const [customerRows, serviceRows] = await Promise.all([
    customerIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(${customerIds})`)
      : Promise.resolve([] as { id: number; name: string | null; phone: string | null }[]),
    serviceIds.length
      ? db.select({ id: servicesTable.id, title: servicesTable.title })
          .from(servicesTable)
          .where(sql`${servicesTable.id} = ANY(${serviceIds})`)
      : Promise.resolve([] as { id: number; title: string | null }[]),
  ]);
  const customerMap = new Map(customerRows.map((c) => [c.id, c]));
  const serviceMap = new Map(serviceRows.map((s) => [s.id, s.title ?? null]));

  const unifiedTx = txRows.map((r) => ({
    id: `TX-${r.id}`,
    invoiceId: r.refId,
    type: r.kind === "service_request" ? "service_request" : "subscription",
    providerId: r.providerId,
    providerName: r.providerName,
    providerEmail: r.providerEmail,
    providerPhone: r.providerPhone,
    customerId: r.customerId,
    customerName: r.customerId ? customerMap.get(r.customerId)?.name ?? null : null,
    customerPhone: r.customerId ? customerMap.get(r.customerId)?.phone ?? null : null,
    serviceId: r.serviceId,
    serviceTitle: r.serviceId ? serviceMap.get(r.serviceId) ?? null : null,
    amount: r.amount,
    commissionAmount: r.commissionAmount ?? "0",
    status: r.status,
    gateway: r.gateway,
    gatewayRef: r.gatewayRef,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  // 2) Older paymentsTable rows (legacy subscription receipts not always linked
  // to a paymentTransactionsTable row) — only include rows whose invoiceId
  // wasn't already represented in the tx history above.
  const seenRefs = new Set(
    unifiedTx.map((r) => r.invoiceId).filter((x): x is string => !!x)
  );
  const payConds = [];
  if (opts.from) payConds.push(gte(paymentsTable.createdAt, startOfDay(opts.from)));
  if (opts.to) payConds.push(lte(paymentsTable.createdAt, endOfDay(opts.to)));
  if (opts.status) payConds.push(eq(paymentsTable.status, opts.status));
  const payRows = await db
    .select({
      id: paymentsTable.id,
      providerId: paymentsTable.providerId,
      providerName: usersTable.name,
      providerEmail: usersTable.email,
      providerPhone: providersTable.phone,
      type: paymentsTable.type,
      amount: paymentsTable.amount,
      status: paymentsTable.status,
      invoiceId: paymentsTable.invoiceId,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(providersTable, eq(paymentsTable.providerId, providersTable.id))
    .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
    .where(payConds.length ? and(...payConds) : undefined)
    .orderBy(desc(paymentsTable.createdAt));

  const legacyRows = payRows
    .filter((p) => !p.invoiceId || !seenRefs.has(p.invoiceId))
    .map((p) => ({
      id: `PY-${p.id}`,
      invoiceId: p.invoiceId,
      type: p.type,
      providerId: p.providerId,
      providerName: p.providerName,
      providerEmail: p.providerEmail,
      providerPhone: p.providerPhone,
      customerId: null,
      customerName: null,
      customerPhone: null,
      serviceId: null,
      serviceTitle: null,
      amount: p.amount,
      commissionAmount: "0",
      status: p.status,
      gateway: "manual",
      gatewayRef: null,
      paidAt: p.status === "paid" ? p.createdAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));

  const all = [...unifiedTx, ...legacyRows].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );

  return all;
}

router.get("/admin/payments", async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const status = typeof req.query.status === "string" ? req.query.status : null;

    const rows = await loadPayments({ from, to, status });

    const totals = {
      paid: 0,
      pending: 0,
      failed: 0,
      paidAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      totalAmount: 0,
      commissionTotal: 0,
    };
    for (const r of rows) {
      const amt = parseFloat(String(r.amount ?? "0"));
      const com = parseFloat(String(r.commissionAmount ?? "0"));
      totals.totalAmount += amt;
      if (r.status === "paid") {
        totals.paid += 1;
        totals.paidAmount += amt;
        totals.commissionTotal += com;
      } else if (r.status === "pending") {
        totals.pending += 1;
        totals.pendingAmount += amt;
      } else if (r.status === "failed") {
        totals.failed += 1;
        totals.failedAmount += amt;
      }
    }

    res.json({ success: true, data: { rows, totals } });
  } catch (e) {
    console.error("admin payments error", e);
    res.status(500).json({ success: false, error: "Failed to fetch payments" });
  }
});

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get("/admin/payments/export", async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const status = typeof req.query.status === "string" && req.query.status ? req.query.status : "paid";

    const rows = await loadPayments({ from, to, status });

    const header = [
      "Payment ID",
      "Invoice ID / Ref",
      "Type",
      "Provider ID",
      "Provider Name",
      "Provider Email",
      "Provider Phone",
      "Customer Name",
      "Customer Phone",
      "Service",
      "Amount (EGP)",
      "Commission (EGP)",
      "Status",
      "Gateway",
      "Date",
    ];

    const lines = [header.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.invoiceId ?? "",
          r.type,
          r.providerId ?? "",
          r.providerName ?? "",
          r.providerEmail ?? "",
          r.providerPhone ?? "",
          r.customerName ?? "",
          r.customerPhone ?? "",
          r.serviceTitle ?? "",
          parseFloat(String(r.amount ?? "0")).toFixed(2),
          parseFloat(String(r.commissionAmount ?? "0")).toFixed(2),
          r.status,
          r.gateway ?? "",
          new Date(r.createdAt).toISOString(),
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    const csv = "\uFEFF" + lines.join("\n");

    const fromStr = from ? from.toISOString().slice(0, 10) : "all";
    const toStr = to ? to.toISOString().slice(0, 10) : "all";
    const filename = `payments-${status}-${fromStr}_to_${toStr}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) {
    console.error("admin payments export error", e);
    res.status(500).json({ success: false, error: "Failed to export payments" });
  }
});

router.get("/admin/subscriptions", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const conditions = [];
    if (status) conditions.push(eq(subscriptionsTable.status, status));
    const rows = await db
      .select({
        id: subscriptionsTable.id,
        providerId: subscriptionsTable.providerId,
        providerName: usersTable.name,
        providerEmail: usersTable.email,
        packageId: subscriptionsTable.packageId,
        packageNameAr: packagesTable.nameAr,
        packageNameEn: packagesTable.nameEn,
        packagePrice: packagesTable.price,
        durationDays: packagesTable.durationDays,
        startDate: subscriptionsTable.startDate,
        endDate: subscriptionsTable.endDate,
        status: subscriptionsTable.status,
        createdAt: subscriptionsTable.createdAt,
      })
      .from(subscriptionsTable)
      .leftJoin(providersTable, eq(subscriptionsTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(subscriptionsTable.createdAt));

    const now = Date.now();
    const enriched = rows.map((r) => ({
      ...r,
      isActive: r.status === "active" && new Date(r.endDate).getTime() > now,
    }));

    res.json({ success: true, data: { rows: enriched } });
  } catch (e) {
    console.error("admin subs error", e);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions" });
  }
});

export default router;
