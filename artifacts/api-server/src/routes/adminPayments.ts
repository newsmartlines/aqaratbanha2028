import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentTransactionsTable,
  paymentsTable,
  subscriptionsTable,
  providersTable,
  usersTable,
  packagesTable,
  billingPlansTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { adminOnly } from "../middleware/adminOnly";
import { events } from "../lib/event-service";

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
 * Unified payments view: combines paymentTransactionsTable (gateway-linked)
 * with paymentsTable (subscription receipts, including free-plan user subs).
 */
async function loadPayments(opts: { from?: Date | null; to?: Date | null; status?: string | null }) {
  const txConds = [];
  if (opts.from) txConds.push(gte(paymentTransactionsTable.createdAt, startOfDay(opts.from)));
  if (opts.to) txConds.push(lte(paymentTransactionsTable.createdAt, endOfDay(opts.to)));
  if (opts.status) txConds.push(eq(paymentTransactionsTable.status, opts.status));

  // 1) Payment transactions history (gateway payments — providers)
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

  // Hydrate customer names in batch
  const customerIds: number[] = [...new Set<number>(
    txRows.map((r: any) => r.customerId).filter((x): x is number => typeof x === "number")
  )];
  type CustomerRow = { id: number; name: string | null; phone: string | null };
  const customerRows: CustomerRow[] = customerIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(${customerIds})`)
    : [];
  const customerMap = new Map<number, CustomerRow>(customerRows.map((c) => [c.id, c]));

  const unifiedTx = txRows.map((r) => ({
    id: `TX-${r.id}`,
    invoiceId: r.refId,
    type: r.kind === "service_request" ? "service_request" : "subscription",
    subscriberType: "company" as const,
    providerId: r.providerId,
    providerName: r.providerName,
    providerEmail: r.providerEmail,
    providerPhone: r.providerPhone,
    customerId: r.customerId,
    customerName: r.customerId ? customerMap.get(r.customerId)?.name ?? null : null,
    customerPhone: r.customerId ? customerMap.get(r.customerId)?.phone ?? null : null,
    serviceId: null,
    serviceTitle: null,
    planName: null as string | null,
    amount: r.amount,
    commissionAmount: r.commissionAmount ?? "0",
    status: r.status,
    gateway: r.gateway,
    gatewayRef: r.gatewayRef,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  // 2) paymentsTable rows — subscription receipts (includes user subscriptions where userId is set)
  const directUserAlias = alias(usersTable, "direct_user");
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
      userId: paymentsTable.userId,
      providerName: usersTable.name,
      providerEmail: usersTable.email,
      providerPhone: providersTable.phone,
      directUserName: directUserAlias.name,
      directUserEmail: directUserAlias.email,
      type: paymentsTable.type,
      amount: paymentsTable.amount,
      status: paymentsTable.status,
      invoiceId: paymentsTable.invoiceId,
      planName: paymentsTable.planName,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(providersTable, eq(paymentsTable.providerId, providersTable.id))
    .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
    .leftJoin(directUserAlias, eq(paymentsTable.userId, directUserAlias.id))
    .where(payConds.length ? and(...payConds) : undefined)
    .orderBy(desc(paymentsTable.createdAt));

  const legacyRows = payRows
    .filter((p) => !p.invoiceId || !seenRefs.has(p.invoiceId))
    .map((p) => {
      // user subscription: userId set, no providerId
      const isUserSub = !p.providerId && !!p.userId;
      return {
        id: `PY-${p.id}`,
        invoiceId: p.invoiceId,
        type: p.type,
        subscriberType: isUserSub ? ("user" as const) : ("company" as const),
        providerId: p.providerId,
        providerName: isUserSub ? p.directUserName : p.providerName,
        providerEmail: isUserSub ? p.directUserEmail : p.providerEmail,
        providerPhone: isUserSub ? null : p.providerPhone,
        customerId: null,
        customerName: null,
        customerPhone: null,
        serviceId: null,
        serviceTitle: null,
        planName: p.planName,
        amount: p.amount,
        commissionAmount: "0",
        status: p.status,
        gateway: isUserSub ? "free" : "manual",
        gatewayRef: null,
        paidAt: p.status === "paid" ? p.createdAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      };
    });

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
    };
    for (const r of rows) {
      const amt = parseFloat(String(r.amount ?? "0"));
      totals.totalAmount += amt;
      if (r.status === "paid") {
        totals.paid += 1;
        totals.paidAmount += amt;
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
      "Payment ID", "Invoice ID / Ref", "Type", "Subscriber Type",
      "Name", "Email", "Phone", "Plan",
      "Amount (EGP)", "Status", "Gateway", "Date",
    ];

    const lines = [header.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id, r.invoiceId ?? "", r.type, r.subscriberType ?? "",
          r.providerName ?? "", r.providerEmail ?? "", r.providerPhone ?? "",
          r.planName ?? "",
          parseFloat(String(r.amount ?? "0")).toFixed(2),
          r.status, r.gateway ?? "", new Date(r.createdAt).toISOString(),
        ].map(csvEscape).join(","),
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
    const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
    const typeFilter = typeof req.query.type === "string" ? req.query.type : null;
    const conditions = [];
    if (statusFilter && statusFilter !== "all") conditions.push(eq(subscriptionsTable.status, statusFilter));

    const directUsersTable = alias(usersTable, "direct_user");

    const rows = await db
      .select({
        id: subscriptionsTable.id,
        providerId: subscriptionsTable.providerId,
        userId: subscriptionsTable.userId,
        providerName: usersTable.name,
        providerEmail: usersTable.email,
        directUserName: directUsersTable.name,
        directUserEmail: directUsersTable.email,
        packageId: subscriptionsTable.packageId,
        packageNameAr: packagesTable.nameAr,
        packageNameEn: packagesTable.nameEn,
        packagePrice: packagesTable.price,
        planNameAr: subscriptionsTable.planNameAr,
        planName: subscriptionsTable.planName,
        planPrice: subscriptionsTable.planPrice,
        billingPlanId: subscriptionsTable.billingPlanId,
        bpNameAr: billingPlansTable.nameAr,
        bpNameEn: billingPlansTable.name,
        bpPrice: billingPlansTable.price,
        bpDurationDays: billingPlansTable.durationDays,
        pkgDurationDays: packagesTable.durationDays,
        startDate: subscriptionsTable.startDate,
        endDate: subscriptionsTable.endDate,
        status: subscriptionsTable.status,
        createdAt: subscriptionsTable.createdAt,
      })
      .from(subscriptionsTable)
      .leftJoin(providersTable, eq(subscriptionsTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(directUsersTable, eq(subscriptionsTable.userId, directUsersTable.id))
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(subscriptionsTable.createdAt));

    const now = Date.now();
    const pastDueIds: number[] = [];
    let enriched = rows.map((r) => {
      const isCompany = !!r.providerId;
      const resolvedName = isCompany
        ? (r.providerName ?? "شركة غير معروفة")
        : (r.directUserName ?? "مستخدم غير معروف");
      const resolvedEmail = isCompany ? r.providerEmail : r.directUserEmail;
      const resolvedPrice = r.billingPlanId ? (r.bpPrice ?? r.planPrice) : (r.packagePrice ?? r.planPrice);
      const resolvedNameAr = r.billingPlanId
        ? (r.bpNameAr ?? r.planNameAr)
        : (r.packageNameAr ?? r.planNameAr);
      const resolvedNameEn = r.billingPlanId ? r.bpNameEn : r.packageNameEn;
      const resolvedDuration = r.billingPlanId ? r.bpDurationDays : r.pkgDurationDays;
      const endTime = new Date(r.endDate).getTime();
      const isActive = r.status === "active" && endTime > now;
      const isPastDue = r.status === "active" && endTime <= now;
      if (isPastDue) pastDueIds.push(r.id);
      const daysLeft = isActive ? Math.ceil((endTime - now) / 86400000) : 0;
      return {
        id: r.id,
        providerId: r.providerId,
        userId: r.userId,
        subscriberType: isCompany ? "company" : "user",
        subscriberName: resolvedName,
        subscriberEmail: resolvedEmail ?? null,
        packageNameAr: resolvedNameAr,
        packageNameEn: resolvedNameEn,
        packagePrice: resolvedPrice,
        durationDays: resolvedDuration,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        isActive,
        isPastDue,
        daysLeft,
        createdAt: r.createdAt,
      };
    });

    // Filter by type after enrichment
    if (typeFilter === "user") enriched = enriched.filter(r => r.subscriberType === "user");
    if (typeFilter === "company") enriched = enriched.filter(r => r.subscriberType === "company");

    // Background: expire past-due subscriptions (non-blocking)
    if (pastDueIds.length > 0) {
      db.update(subscriptionsTable)
        .set({ status: "expired" })
        .where(sql`${subscriptionsTable.id} = ANY(${pastDueIds})`)
        .catch(() => {});
    }

    const activeRows = enriched.filter(r => r.isActive);
    const pendingRows = enriched.filter(r => r.status === "pending");
    const premiumActive = activeRows.filter(r => parseFloat(String(r.packagePrice ?? "0")) >= 200).length;
    const bronzeActive = activeRows.filter(r => {
      const p = parseFloat(String(r.packagePrice ?? "0"));
      return p > 0 && p < 200;
    }).length;
    const freeActive = activeRows.filter(r => parseFloat(String(r.packagePrice ?? "0")) === 0).length;
    const monthlyRecurring = activeRows.reduce((sum, r) => sum + parseFloat(String(r.packagePrice ?? "0")), 0);
    const totalActive = activeRows.length;
    const userActive = activeRows.filter(r => r.subscriberType === "user").length;
    const companyActive = activeRows.filter(r => r.subscriberType === "company").length;
    const pendingCount = pendingRows.length;

    res.json({
      success: true,
      data: {
        rows: enriched,
        totals: { premiumActive, bronzeActive, freeActive, monthlyRecurring, totalActive, userActive, companyActive, pendingCount },
      },
    });
  } catch (e) {
    console.error("admin subs error", e);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions" });
  }
});

// POST /admin/payments/:paymentId/approve-subscription
// Approves a pending subscription payment and activates the linked subscription.
//
// Fix 2 — Auto-replacement: if the provider/user already has an active subscription,
//   it is marked as "replaced" before the new one is activated.
// Fix 3 — Renewal: if the new subscription is for the SAME plan as the current active,
//   the existing subscription's endDate is extended instead of creating a duplicate row.
router.post("/admin/payments/:paymentId/approve-subscription", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!Number.isFinite(paymentId) || paymentId < 1)
      return res.status(400).json({ success: false, error: "معرّف الدفعة غير صالح" });

    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId));
    if (!payment) return res.status(404).json({ success: false, error: "الدفعة غير موجودة" });
    if (payment.status !== "pending")
      return res.status(400).json({ success: false, error: "الدفعة ليست في حالة معلقة" });

    const match = payment.invoiceId?.match(/^SUB-REQ-(\d+)$/);
    if (!match) return res.status(400).json({ success: false, error: "لا يمكن تحديد الاشتراك المرتبط بهذه الدفعة" });

    const subscriptionId = parseInt(match[1], 10);
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId));
    if (!sub) return res.status(404).json({ success: false, error: "الاشتراك المرتبط غير موجود" });

    const now = new Date();
    const originalDuration = new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime();
    const durationDays = Math.ceil(originalDuration / 86400000);

    // ── Find existing active subscription for same provider/user ─────────────
    let existingActiveSub: typeof sub | null = null;
    if (sub.providerId) {
      const [row] = await db.select().from(subscriptionsTable)
        .where(and(
          eq(subscriptionsTable.providerId, sub.providerId),
          eq(subscriptionsTable.status, "active"),
          sql`${subscriptionsTable.endDate} > NOW()`,
        ))
        .limit(1);
      existingActiveSub = row ?? null;
    } else if (sub.userId) {
      const [row] = await db.select().from(subscriptionsTable)
        .where(and(
          eq(subscriptionsTable.userId, sub.userId),
          eq(subscriptionsTable.status, "active"),
          sql`${subscriptionsTable.endDate} > NOW()`,
        ))
        .limit(1);
      existingActiveSub = row ?? null;
    }

    // ── Detect renewal: same billing plan or same legacy package ─────────────
    const isRenewal = existingActiveSub != null && (
      (sub.billingPlanId != null && sub.billingPlanId === existingActiveSub.billingPlanId) ||
      (sub.packageId != null && sub.packageId === existingActiveSub.packageId)
    );

    // ── Resolve owner userId for notifications ────────────────────────────────
    let notifyUserId: number | null = sub.userId ?? null;
    if (!notifyUserId && sub.providerId) {
      const [prov] = await db.select({ userId: providersTable.userId })
        .from(providersTable).where(eq(providersTable.id, sub.providerId));
      if (prov?.userId) notifyUserId = prov.userId;
    }

    const planLabel = sub.planNameAr ?? sub.planName ?? "الباقة";

    if (isRenewal && existingActiveSub) {
      // ── Fix 3: RENEWAL — extend existing subscription, cancel the pending row ─
      const currentEnd = new Date(existingActiveSub.endDate);
      // Extend from the later of (current endDate, now) so no time is lost
      const extendFrom = currentEnd > now ? currentEnd : now;
      const renewedEndDate = new Date(extendFrom.getTime() + originalDuration);

      await db.update(subscriptionsTable)
        .set({ endDate: renewedEndDate })
        .where(eq(subscriptionsTable.id, existingActiveSub.id));

      // Cancel the pending subscription — it was just the renewal payment request
      await db.update(subscriptionsTable)
        .set({
          status: "cancelled",
          replacedBySubscriptionId: existingActiveSub.id,
          replacedAt: now,
          replacementReason: "تجديد — تم تمديد الاشتراك الحالي",
        })
        .where(eq(subscriptionsTable.id, subscriptionId));

      await db.update(paymentsTable)
        .set({ status: "paid" })
        .where(eq(paymentsTable.id, paymentId));

      if (notifyUserId) {
        await db.insert(notificationsTable).values({
          userId: notifyUserId,
          title: "🔄 تم تجديد اشتراكك بنجاح",
          message: `تم تجديد باقة ${planLabel} لمدة ${durationDays} يوم إضافية. تاريخ الانتهاء الجديد: ${renewedEndDate.toLocaleDateString("ar-EG")}.`,
          type: "subscription",
          link: "/dashboard/packages",
        }).catch(() => {});
        events.onPackagePurchased(notifyUserId, planLabel, renewedEndDate.toLocaleDateString("ar-EG")).catch(() => {});
      }

      return res.json({ success: true, renewed: true });
    }

    // ── Fix 2: NEW PLAN / REPLACEMENT — expire old active, activate new ───────
    if (existingActiveSub) {
      // Mark the old subscription as replaced (preserves history + traceability)
      await db.update(subscriptionsTable)
        .set({
          status: "replaced",
          replacedBySubscriptionId: subscriptionId,
          replacedAt: now,
          replacementReason: "استبدل بباقة جديدة",
        })
        .where(eq(subscriptionsTable.id, existingActiveSub.id));
    }

    // Activate new subscription — reset dates from now
    const startDate = now;
    const endDate = new Date(startDate.getTime() + originalDuration);

    await db.update(subscriptionsTable)
      .set({ status: "active", startDate, endDate })
      .where(eq(subscriptionsTable.id, subscriptionId));

    await db.update(paymentsTable)
      .set({ status: "paid" })
      .where(eq(paymentsTable.id, paymentId));

    // Mark provider as verified on any paid activation
    if (sub.providerId) {
      await db.update(providersTable)
        .set({ verified: true })
        .where(eq(providersTable.id, sub.providerId))
        .catch(() => {});
    }

    if (notifyUserId) {
      await db.insert(notificationsTable).values({
        userId: notifyUserId,
        title: "🎉 تم تفعيل اشتراكك بنجاح",
        message: `تمت الموافقة على دفعتك وتفعيل باقة ${planLabel} بنجاح. مدة الاشتراك ${durationDays} يوم.`,
        type: "subscription",
        link: "/dashboard/packages",
      }).catch(() => {});
      events.onPackagePurchased(notifyUserId, planLabel, endDate.toLocaleDateString("ar-EG")).catch(() => {});
    }

    res.json({ success: true, renewed: false });
  } catch (e) {
    console.error("approve subscription error", e);
    res.status(500).json({ success: false, error: "فشل الموافقة على الاشتراك" });
  }
});

// POST /admin/payments/:paymentId/reject-subscription
// Rejects a pending subscription payment.
//
// Fix 4 — Notification always reaches the real owner:
//   Resolves the notify userId from payment.userId first, then falls back to
//   the subscription's providerId owner — so provider subscriptions never miss
//   their rejection notification.
router.post("/admin/payments/:paymentId/reject-subscription", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!Number.isFinite(paymentId) || paymentId < 1)
      return res.status(400).json({ success: false, error: "معرّف الدفعة غير صالح" });

    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId));
    if (!payment) return res.status(404).json({ success: false, error: "الدفعة غير موجودة" });
    if (payment.status !== "pending")
      return res.status(400).json({ success: false, error: "الدفعة ليست في حالة معلقة" });

    // Cancel the linked subscription (if SUB-REQ pattern)
    const match = payment.invoiceId?.match(/^SUB-REQ-(\d+)$/);
    let subProviderId: number | null = null;
    let subUserId: number | null = null;
    if (match) {
      const subscriptionId = parseInt(match[1], 10);
      const [subRow] = await db
        .select({ providerId: subscriptionsTable.providerId, userId: subscriptionsTable.userId })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, subscriptionId));
      subProviderId = subRow?.providerId ?? null;
      subUserId = subRow?.userId ?? null;

      await db.update(subscriptionsTable)
        .set({ status: "cancelled" })
        .where(eq(subscriptionsTable.id, subscriptionId));
    }

    await db.update(paymentsTable)
      .set({ status: "failed" })
      .where(eq(paymentsTable.id, paymentId));

    const reason = typeof req.body?.reason === "string" && req.body.reason.trim()
      ? req.body.reason.trim()
      : null;

    // Fix 4: Resolve the notification recipient correctly.
    // Priority: payment.userId → subscription.userId → provider owner lookup
    let notifyUserId: number | null = payment.userId ?? null;

    if (!notifyUserId && payment.providerId) {
      // Provider subscription via payment.providerId
      const [prov] = await db.select({ userId: providersTable.userId })
        .from(providersTable).where(eq(providersTable.id, payment.providerId));
      notifyUserId = prov?.userId ?? null;
    }

    if (!notifyUserId && subUserId) {
      notifyUserId = subUserId;
    }

    if (!notifyUserId && subProviderId) {
      // Last resort: look up via the subscription's providerId
      const [prov] = await db.select({ userId: providersTable.userId })
        .from(providersTable).where(eq(providersTable.id, subProviderId));
      notifyUserId = prov?.userId ?? null;
    }

    if (notifyUserId) {
      await db.insert(notificationsTable).values({
        userId: notifyUserId,
        title: "تم رفض طلب الاشتراك",
        message: reason
          ? `عذراً، لم يتم قبول دفعة الاشتراك. السبب: ${reason}`
          : `عذراً، لم يتم قبول دفعة الاشتراك. يرجى التواصل مع الدعم أو إعادة المحاولة.`,
        type: "subscription",
        link: "/dashboard/packages",
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error("reject subscription error", e);
    res.status(500).json({ success: false, error: "فشل رفض الاشتراك" });
  }
});

export default router;
