import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  paymentTransactionsTable,
  packagesTable,
  providersTable,
  subscriptionsTable,
  paymentsTable,
  usersTable,
  notificationsTable,
  requestsTable,
  servicesTable,
  providerBalancesTable,
  walletTransactionsTable,
  siteSettingsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getSession } from "./auth";
import {
  createPaymentSession,
  getPaymentStatus,
  getPublicBaseUrl,
  getStcPayMode,
} from "../lib/stcpay";

const router = Router();

async function getAuthSession(req: Request) {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.session;
  if (!token) return null;
  return getSession(token);
}

async function getCommissionPercent(): Promise<number> {
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "commissionPercent"));
    const n = parseFloat(String(row?.value ?? "10"));
    if (!Number.isFinite(n) || n < 0 || n > 100) return 10;
    return n;
  } catch {
    return 10;
  }
}

/**
 * Service-request payment: create the request row, split funds between provider
 * wallet and platform commission, and append wallet ledger entries.
 */
async function activateServiceRequest(opts: {
  tx: typeof paymentTransactionsTable.$inferSelect;
}): Promise<void> {
  const { tx } = opts;
  const amount = parseFloat(String(tx.amount));
  const commissionPct = await getCommissionPercent();
  const commission = +(amount * (commissionPct / 100)).toFixed(2);
  const providerNet = +(amount - commission).toFixed(2);

  // 1) Create the request row in 'new' status, marked paid.
  const [reqRow] = await db
    .insert(requestsTable)
    .values({
      userId: tx.userId,
      providerId: tx.providerId,
      serviceId: tx.serviceId,
      status: "new",
      paymentRef: tx.refId,
      paidAmount: amount.toFixed(2),
      paidAt: new Date(),
      effectivePrice: amount.toFixed(2),
      message: "طلب خدمة مدفوع عبر STC Pay",
    })
    .returning();

  // 2) Persist commission on the transaction.
  await db
    .update(paymentTransactionsTable)
    .set({ commissionAmount: commission.toFixed(2), updatedAt: new Date() })
    .where(eq(paymentTransactionsTable.id, tx.id));

  // 3) Upsert provider balance.
  await db
    .insert(providerBalancesTable)
    .values({ providerId: tx.providerId, balance: providerNet.toFixed(2) })
    .onConflictDoUpdate({
      target: providerBalancesTable.providerId,
      set: {
        balance: sql`${providerBalancesTable.balance} + ${providerNet.toFixed(2)}`,
        updatedAt: new Date(),
      },
    });

  // 4) Ledger entries: provider credit + admin commission.
  await db.insert(walletTransactionsTable).values([
    {
      providerId: tx.providerId,
      type: "request_payment",
      amount: providerNet.toFixed(2),
      refId: tx.refId,
      note: `إيداع من طلب خدمة #${reqRow.id}`,
    },
    {
      providerId: null,
      type: "commission",
      amount: commission.toFixed(2),
      refId: tx.refId,
      note: `عمولة المنصة من طلب خدمة #${reqRow.id} (${commissionPct}%)`,
    },
  ]);

  // 5) Notifications for the provider's owner user and platform admins.
  const [providerRow] = await db
    .select({ userId: providersTable.userId, name: usersTable.name })
    .from(providersTable)
    .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
    .where(eq(providersTable.id, tx.providerId));

  try {
    if (providerRow?.userId) {
      await db.insert(notificationsTable).values({
        userId: providerRow.userId,
        type: "success",
        title: "طلب خدمة جديد مدفوع",
        message: `لديك طلب خدمة جديد بقيمة ${providerNet.toFixed(2)} ر.س (بعد العمولة) — رقم الطلب #${reqRow.id}`,
        link: "/dashboard/requests",
      });
    }
    await db.insert(notificationsTable).values({
      userId: null,
      type: "payment",
      title: "دفعة طلب خدمة جديدة",
      message: `تم استلام دفعة بقيمة ${amount.toFixed(2)} ر.س من عميل (عمولة ${commission.toFixed(2)} ر.س) للمزود ${providerRow?.name ?? "—"}`,
      link: "/admin/payments",
    });
    if (tx.userId) {
      await db.insert(notificationsTable).values({
        userId: tx.userId,
        type: "success",
        title: "تم تأكيد طلب الخدمة",
        message: `تم استلام دفعتك بنجاح وتم إنشاء طلبك رقم #${reqRow.id}`,
        link: "/profile/requests",
      });
    }
  } catch (err) {
    console.error("service request notif failed", err);
  }
}

async function activateSubscription(opts: {
  providerId: number;
  packageId: number;
  amount: number;
  invoiceRef: string;
}) {
  const { providerId, packageId, amount, invoiceRef } = opts;

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, packageId));
  if (!pkg) throw new Error("الباقة غير موجودة");

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + (pkg.durationDays ?? 30) * 24 * 60 * 60 * 1000);

  const [sub] = await db
    .insert(subscriptionsTable)
    .values({ providerId, packageId, startDate, endDate, status: "active" })
    .returning();

  await db.update(providersTable).set({ verified: true }).where(eq(providersTable.id, providerId));

  const [providerRow] = await db
    .select({ name: usersTable.name, userId: providersTable.userId })
    .from(providersTable)
    .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
    .where(eq(providersTable.id, providerId));
  const providerName = providerRow?.name ?? "مزود خدمة";
  const ownerUserId = providerRow?.userId ?? null;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      providerId,
      type: "subscription",
      amount: amount.toFixed(2),
      status: "paid",
      invoiceId: invoiceRef,
    })
    .returning();

  try {
    await db.insert(notificationsTable).values({
      userId: null,
      type: "payment",
      title: "دفعة جديدة عبر STC Pay",
      message: `تم استلام دفعة بقيمة ${amount.toFixed(2)} ر.س من ${providerName} لباقة ${pkg.nameAr}`,
      link: "/admin/payments",
    });
  } catch (err) {
    console.error("admin payment notif failed", err);
  }

  if (ownerUserId) {
    try {
      await db.insert(notificationsTable).values({
        userId: ownerUserId,
        type: "success",
        title: "تم استلام دفعتك",
        message: `تم استلام دفعتك بقيمة ${amount.toFixed(2)} ر.س لباقة ${pkg.nameAr}`,
        link: "/dashboard/payments",
      });
      await db.insert(notificationsTable).values({
        userId: ownerUserId,
        type: "success",
        title: "تم تفعيل اشتراكك",
        message: `تم تفعيل اشتراك باقة ${pkg.nameAr} لمدة ${pkg.durationDays ?? 30} يوم`,
        link: "/provider/subscription",
      });
    } catch (err) {
      console.error("provider notif failed", err);
    }
  }

  return { subscription: sub, payment };
}

// ---------------------------------------------------------------------------
// POST /api/stcpay/create-session
// Creates a pending transaction and returns a redirect URL to STC Pay (or the
// internal simulator in test mode).
// ---------------------------------------------------------------------------
router.post("/stcpay/create-session", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    if (session.role !== "provider") {
      return res.status(403).json({ success: false, error: "هذه الخدمة لمقدمي الخدمات فقط" });
    }
    const providerId = session.providerId;
    if (!providerId) return res.status(400).json({ success: false, error: "ملف مقدم الخدمة غير مكتمل" });

    const packageId = parseInt(String(req.body?.packageId ?? ""), 10);
    if (!Number.isFinite(packageId) || packageId < 1) {
      return res.status(400).json({ success: false, error: "معرّف الباقة غير صالح" });
    }
    const fromOnboarding = req.body?.fromOnboarding === true || req.body?.fromOnboarding === "true";

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, packageId));
    if (!pkg) return res.status(404).json({ success: false, error: "الباقة غير موجودة" });
    const amount = parseFloat(String(pkg.price));
    if (!(amount > 0)) {
      return res.status(400).json({ success: false, error: "هذه الباقة مجانية، لا تحتاج لدفع" });
    }

    const [providerRow] = await db
      .select({ name: usersTable.name, phone: providersTable.phone })
      .from(providersTable)
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, providerId));

    const refId = `STC-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const [tx] = await db
      .insert(paymentTransactionsTable)
      .values({
        refId,
        providerId,
        packageId,
        amount: amount.toFixed(2),
        currency: "SAR",
        gateway: "stcpay",
        status: "pending",
        fromOnboarding: fromOnboarding ? 1 : 0,
      })
      .returning();

    const base = getPublicBaseUrl(req);
    const returnUrl = `${base}/api/stcpay/return?refId=${encodeURIComponent(refId)}`;
    const callbackUrl = `${base}/api/stcpay/webhook`;

    let gw;
    try {
      gw = await createPaymentSession({
        refId,
        amount,
        currency: "SAR",
        description: `اشتراك باقة ${pkg.nameAr}`,
        returnUrl,
        callbackUrl,
        customerName: providerRow?.name ?? undefined,
        customerPhone: providerRow?.phone ?? undefined,
        publicBaseUrl: base,
      });
    } catch (err: unknown) {
      await db
        .update(paymentTransactionsTable)
        .set({
          status: "failed",
          gatewayPayload: JSON.stringify({ error: (err as Error).message }),
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactionsTable.id, tx.id));
      return res.status(502).json({ success: false, error: `تعذر بدء الدفع: ${(err as Error).message}` });
    }

    await db
      .update(paymentTransactionsTable)
      .set({
        gatewayRef: gw.gatewayRef,
        gatewayPayload: JSON.stringify(gw.raw),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactionsTable.id, tx.id));

    res.json({
      success: true,
      data: {
        refId,
        redirectUrl: gw.redirectUrl,
        amount,
        currency: "SAR",
        mode: getStcPayMode(),
      },
    });
  } catch (err) {
    console.error("stcpay create-session error", err);
    const detail = err instanceof Error ? err.message : String(err);
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      success: false,
      error: isDev ? `تعذر إنشاء جلسة الدفع: ${detail}` : "تعذر إنشاء جلسة الدفع",
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stcpay/return
// STC Pay (or simulator) redirects the user here after payment. Resolves the
// transaction, activates the subscription on success, and bounces the user
// to the frontend result page.
// ---------------------------------------------------------------------------
router.get("/stcpay/return", async (req, res) => {
  const refId = String(req.query.refId ?? "");
  const reportedStatus = String(req.query.status ?? "").toLowerCase();
  if (!refId) return res.status(400).send("Missing refId");

  const [tx] = await db
    .select()
    .from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.refId, refId));

  if (!tx) return res.status(404).send("Transaction not found");

  let finalStatus: "paid" | "failed" | "cancelled" = "failed";
  if (reportedStatus === "success" || reportedStatus === "paid") finalStatus = "paid";
  else if (reportedStatus === "cancelled" || reportedStatus === "canceled") finalStatus = "cancelled";
  else if (reportedStatus === "failed") finalStatus = "failed";

  // For live mode, double-check status with STC Pay before trusting URL params.
  if (getStcPayMode() === "live" && tx.gatewayRef) {
    try {
      const verified = await getPaymentStatus(tx.gatewayRef);
      if (verified.status !== "pending") finalStatus = verified.status as typeof finalStatus;
    } catch (err) {
      console.error("stcpay verify error", err);
    }
  }

  // Idempotency: only act if still pending.
  if (tx.status === "pending") {
    if (finalStatus === "paid") {
      try {
        if (tx.kind === "service_request") {
          await activateServiceRequest({ tx });
        } else if (tx.packageId) {
          await activateSubscription({
            providerId: tx.providerId,
            packageId: tx.packageId,
            amount: parseFloat(String(tx.amount)),
            invoiceRef: tx.refId,
          });
        }
      } catch (err) {
        console.error("stcpay activation failed", err);
        finalStatus = "failed";
      }
    }

    await db
      .update(paymentTransactionsTable)
      .set({
        status: finalStatus,
        paidAt: finalStatus === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactionsTable.id, tx.id));
  }

  const base = getPublicBaseUrl(req);
  const dest = new URL(`${base}/dashboard/checkout/result`);
  dest.searchParams.set("refId", refId);
  dest.searchParams.set("status", finalStatus);
  dest.searchParams.set("kind", tx.kind);
  if (tx.fromOnboarding === 1) dest.searchParams.set("from", "onboarding");
  res.redirect(dest.toString());
});

// ---------------------------------------------------------------------------
// POST /api/stcpay/webhook
// Async server-to-server notifications. Used as a fallback in case the user
// closes the browser before being redirected back.
// ---------------------------------------------------------------------------
router.post("/stcpay/webhook", async (req, res) => {
  try {
    const refId = String(req.body?.BillNumber ?? req.body?.refId ?? "");
    const reported = String(req.body?.PaymentStatus ?? req.body?.Status ?? "").toLowerCase();
    if (!refId) return res.status(400).json({ success: false, error: "Missing refId" });

    const [tx] = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.refId, refId));
    if (!tx) return res.status(404).json({ success: false, error: "Unknown refId" });

    let mapped: "paid" | "failed" | "cancelled" | "pending" = "pending";
    if (["paid", "completed", "success", "successful"].includes(reported)) mapped = "paid";
    else if (["failed", "declined", "rejected"].includes(reported)) mapped = "failed";
    else if (["cancelled", "canceled", "voided"].includes(reported)) mapped = "cancelled";

    if (tx.status === "pending" && mapped !== "pending") {
      if (mapped === "paid") {
        try {
          if (tx.kind === "service_request") {
            await activateServiceRequest({ tx });
          } else if (tx.packageId) {
            await activateSubscription({
              providerId: tx.providerId,
              packageId: tx.packageId,
              amount: parseFloat(String(tx.amount)),
              invoiceRef: tx.refId,
            });
          }
        } catch (err) {
          console.error("webhook activation failed", err);
          mapped = "failed";
        }
      }
      await db
        .update(paymentTransactionsTable)
        .set({
          status: mapped,
          paidAt: mapped === "paid" ? new Date() : null,
          gatewayPayload: JSON.stringify(req.body ?? {}),
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactionsTable.id, tx.id));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("stcpay webhook error", err);
    res.status(500).json({ success: false, error: "webhook handler failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stcpay/status/:refId
// Lets the frontend poll a transaction's status (used by result page).
// ---------------------------------------------------------------------------
router.get("/stcpay/status/:refId", async (req, res) => {
  const session = await getAuthSession(req);
  if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
  const [tx] = await db
    .select()
    .from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.refId, req.params.refId));
  if (!tx) return res.status(404).json({ success: false, error: "Transaction not found" });
  // Allow access by the paying provider, the customer (for service requests),
  // or any admin.
  const allowed =
    tx.providerId === session.providerId ||
    (tx.userId != null && tx.userId === session.userId) ||
    session.role === "admin";
  if (!allowed) {
    return res.status(403).json({ success: false, error: "غير مصرح" });
  }
  const pkg = tx.packageId
    ? (await db.select().from(packagesTable).where(eq(packagesTable.id, tx.packageId)))[0]
    : null;
  res.json({
    success: true,
    data: {
      refId: tx.refId,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      kind: tx.kind,
      packageId: tx.packageId,
      packageName: pkg?.nameAr ?? null,
      providerId: tx.providerId,
      serviceId: tx.serviceId,
      commissionAmount: tx.commissionAmount,
      paidAt: tx.paidAt,
      createdAt: tx.createdAt,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/stcpay/create-request-session
// Customer-initiated service-request payment. Creates a `service_request`
// payment_transaction tied to a provider/service and returns the redirect URL.
// ---------------------------------------------------------------------------
router.post("/stcpay/create-request-session", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول لطلب الخدمة" });

    const providerId = parseInt(String(req.body?.providerId ?? ""), 10);
    if (!Number.isFinite(providerId) || providerId < 1) {
      return res.status(400).json({ success: false, error: "معرّف مقدم الخدمة غير صالح" });
    }

    const [provider] = await db
      .select({
        id: providersTable.id,
        approved: providersTable.approved,
        suspended: providersTable.suspended,
        name: usersTable.name,
        ownerUserId: providersTable.userId,
      })
      .from(providersTable)
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, providerId));
    if (!provider) return res.status(404).json({ success: false, error: "مقدم الخدمة غير موجود" });
    if (!provider.approved || provider.suspended) {
      return res.status(400).json({ success: false, error: "مقدم الخدمة غير متاح حالياً" });
    }
    if (provider.ownerUserId === session.userId) {
      return res.status(400).json({ success: false, error: "لا يمكنك طلب خدمة من نفسك" });
    }

    let serviceId: number | null = null;
    let resolvedAmount: number | null = null;
    let serviceTitle = "خدمة";
    if (req.body?.serviceId !== undefined && req.body?.serviceId !== null && req.body?.serviceId !== "") {
      serviceId = parseInt(String(req.body.serviceId), 10);
      if (!Number.isFinite(serviceId)) return res.status(400).json({ success: false, error: "معرّف الخدمة غير صالح" });
      const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
      if (!svc || svc.providerId !== providerId) {
        return res.status(404).json({ success: false, error: "الخدمة غير موجودة" });
      }
      const svcPrice = parseFloat(String(svc.price ?? "0"));
      if (svcPrice > 0) resolvedAmount = svcPrice;
      serviceTitle = svc.title ?? "خدمة";
    }
    // Allow client to override (or supply) amount when service has no price.
    const bodyAmount = parseFloat(String(req.body?.amount ?? ""));
    if (Number.isFinite(bodyAmount) && bodyAmount > 0) resolvedAmount = bodyAmount;
    if (!resolvedAmount || resolvedAmount <= 0) {
      return res.status(400).json({ success: false, error: "يجب تحديد قيمة الطلب" });
    }
    if (resolvedAmount > 100000) {
      return res.status(400).json({ success: false, error: "قيمة الطلب تتجاوز الحد المسموح" });
    }

    const refId = `STC-REQ-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const [tx] = await db
      .insert(paymentTransactionsTable)
      .values({
        refId,
        providerId,
        packageId: null,
        kind: "service_request",
        userId: session.userId ?? null,
        serviceId,
        amount: resolvedAmount.toFixed(2),
        currency: "SAR",
        gateway: "stcpay",
        status: "pending",
        fromOnboarding: 0,
      })
      .returning();

    const base = getPublicBaseUrl(req);
    const returnUrl = `${base}/api/stcpay/return?refId=${encodeURIComponent(refId)}`;
    const callbackUrl = `${base}/api/stcpay/webhook`;

    let gw;
    try {
      gw = await createPaymentSession({
        refId,
        amount: resolvedAmount,
        currency: "SAR",
        description: `طلب خدمة: ${serviceTitle} – ${provider.name ?? ""}`.trim(),
        returnUrl,
        callbackUrl,
        publicBaseUrl: base,
      });
    } catch (err: unknown) {
      await db
        .update(paymentTransactionsTable)
        .set({
          status: "failed",
          gatewayPayload: JSON.stringify({ error: (err as Error).message }),
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactionsTable.id, tx.id));
      return res.status(502).json({ success: false, error: `تعذر بدء الدفع: ${(err as Error).message}` });
    }

    await db
      .update(paymentTransactionsTable)
      .set({
        gatewayRef: gw.gatewayRef,
        gatewayPayload: JSON.stringify(gw.raw),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactionsTable.id, tx.id));

    res.json({
      success: true,
      data: {
        refId,
        redirectUrl: gw.redirectUrl,
        amount: resolvedAmount,
        currency: "SAR",
        kind: "service_request",
        mode: getStcPayMode(),
      },
    });
  } catch (err) {
    console.error("stcpay create-request-session error", err);
    const detail = err instanceof Error ? err.message : String(err);
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      success: false,
      error: isDev ? `تعذر إنشاء جلسة الدفع: ${detail}` : "تعذر إنشاء جلسة الدفع",
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stcpay/_simulator
// Test-mode only: a minimal HTML page that mimics the STC Pay merchant
// hosted page. Has Pay/Cancel buttons that POST back to /return with the
// chosen outcome. NEVER served when STCPAY_TEST_MODE=false.
// ---------------------------------------------------------------------------
router.get("/stcpay/_simulator", (req: Request, res: Response) => {
  if (getStcPayMode() !== "test") {
    return res.status(404).send("Not available in live mode");
  }
  const refId = String(req.query.refId ?? "");
  const amount = String(req.query.amount ?? "");
  const description = String(req.query.description ?? "");
  if (!refId) return res.status(400).send("Missing refId");
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>STC Pay – بيئة تجريبية</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; background: linear-gradient(135deg,#4a148c 0%,#6a1b9a 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #1a1a1a; }
  .card { background: #fff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.25); width: 100%; max-width: 420px; overflow: hidden; }
  .head { background: #4a148c; color: #fff; padding: 24px; text-align: center; }
  .logo { font-size: 22px; font-weight: 800; letter-spacing: .5px; }
  .badge { display: inline-block; margin-top: 6px; font-size: 11px; background: rgba(255,255,255,.15); padding: 4px 10px; border-radius: 999px; }
  .body { padding: 28px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
  .row:last-child { border-bottom: none; font-size: 18px; font-weight: 700; padding-top: 16px; }
  .muted { color: #777; }
  .btns { display: flex; gap: 10px; margin-top: 22px; }
  button { flex: 1; padding: 14px; border-radius: 12px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .2s; }
  button:hover { opacity: .9; }
  .pay { background: #4a148c; color: #fff; }
  .fail { background: #fff3f3; color: #c62828; }
  .cancel { background: #f4f4f4; color: #555; width: 100%; margin-top: 10px; }
  .note { margin-top: 16px; font-size: 11px; color: #888; text-align: center; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="logo">stc pay</div>
      <div class="badge">SANDBOX • بيئة تجريبية</div>
    </div>
    <div class="body">
      <div class="row"><span class="muted">المرجع</span><span>${refId.replace(/[<>]/g, "")}</span></div>
      <div class="row"><span class="muted">الوصف</span><span>${description.replace(/[<>]/g, "")}</span></div>
      <div class="row"><span class="muted">الإجمالي</span><span>${amount.replace(/[<>]/g, "")} ر.س</span></div>
      <form method="GET" action="/api/stcpay/return">
        <input type="hidden" name="refId" value="${refId.replace(/"/g, "&quot;")}" />
        <div class="btns">
          <button class="pay" type="submit" name="status" value="success">تأكيد الدفع</button>
          <button class="fail" type="submit" name="status" value="failed">محاكاة فشل</button>
        </div>
        <button class="cancel" type="submit" name="status" value="cancelled">إلغاء العملية</button>
      </form>
      <p class="note">هذه شاشة محاكاة لبوابة STC Pay لاختبار الدمج. لن يتم خصم أي مبلغ حقيقي.</p>
    </div>
  </div>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// GET /api/wallet/me — provider's own wallet (balance + last 50 ledger entries)
// ---------------------------------------------------------------------------
router.get("/wallet/me", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    if (session.role !== "provider" || !session.providerId) {
      return res.status(403).json({ success: false, error: "هذه الخدمة لمقدمي الخدمات فقط" });
    }
    const providerId = session.providerId;
    const [bal] = await db
      .select()
      .from(providerBalancesTable)
      .where(eq(providerBalancesTable.providerId, providerId));
    const txns = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.providerId, providerId))
      .orderBy(sql`${walletTransactionsTable.createdAt} DESC`)
      .limit(50);
    res.json({
      success: true,
      data: {
        balance: bal?.balance ?? "0.00",
        currency: "SAR",
        transactions: txns,
      },
    });
  } catch (err) {
    console.error("wallet/me error", err);
    res.status(500).json({ success: false, error: "تعذر جلب المحفظة" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/wallet — platform commission summary + recent commission txns
// ---------------------------------------------------------------------------
router.get("/admin/wallet", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session || session.role !== "admin") {
      return res.status(403).json({ success: false, error: "صلاحيات المسؤول مطلوبة" });
    }
    const [{ total = "0" } = { total: "0" }] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)::text` })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.type, "commission"));
    const txns = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.type, "commission"))
      .orderBy(sql`${walletTransactionsTable.createdAt} DESC`)
      .limit(50);
    res.json({
      success: true,
      data: { totalCommission: total, currency: "SAR", transactions: txns },
    });
  } catch (err) {
    console.error("admin/wallet error", err);
    res.status(500).json({ success: false, error: "تعذر جلب محفظة المنصة" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/me/payments — current user's payment transaction history
// (subscriptions + service-request payments they initiated)
// ---------------------------------------------------------------------------
router.get("/users/me/payments", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session?.userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const rows = await db
      .select({
        id: paymentTransactionsTable.id,
        refId: paymentTransactionsTable.refId,
        kind: paymentTransactionsTable.kind,
        providerId: paymentTransactionsTable.providerId,
        providerName: usersTable.name,
        serviceId: paymentTransactionsTable.serviceId,
        amount: paymentTransactionsTable.amount,
        commissionAmount: paymentTransactionsTable.commissionAmount,
        currency: paymentTransactionsTable.currency,
        status: paymentTransactionsTable.status,
        gateway: paymentTransactionsTable.gateway,
        gatewayRef: paymentTransactionsTable.gatewayRef,
        paidAt: paymentTransactionsTable.paidAt,
        createdAt: paymentTransactionsTable.createdAt,
      })
      .from(paymentTransactionsTable)
      .leftJoin(providersTable, eq(paymentTransactionsTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(paymentTransactionsTable.userId, session.userId))
      .orderBy(sql`${paymentTransactionsTable.createdAt} DESC`)
      .limit(200);

    // Hydrate optional service titles
    const serviceIds = [...new Set(rows.map((r) => r.serviceId).filter((x): x is number => !!x))];
    const services = serviceIds.length
      ? await db.select({ id: servicesTable.id, title: servicesTable.title })
          .from(servicesTable)
          .where(sql`${servicesTable.id} = ANY(${serviceIds})`)
      : [];
    const serviceMap = new Map(services.map((s) => [s.id, s.title]));

    const totals = { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0 };
    for (const r of rows) {
      const amt = parseFloat(String(r.amount ?? "0"));
      if (r.status === "paid") { totals.paid++; totals.paidAmount += amt; }
      else if (r.status === "pending") { totals.pending++; totals.pendingAmount += amt; }
      else if (r.status === "failed") { totals.failed++; totals.failedAmount += amt; }
    }

    res.json({
      success: true,
      data: {
        rows: rows.map((r) => ({
          ...r,
          serviceTitle: r.serviceId ? serviceMap.get(r.serviceId) ?? null : null,
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        })),
        totals,
      },
    });
  } catch (err) {
    console.error("user payments error", err);
    res.status(500).json({ success: false, error: "تعذر جلب سجل المدفوعات" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/providers/me/payments — current provider's incoming service-request
// payments + subscription payments
// ---------------------------------------------------------------------------
router.get("/providers/me/payments", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session?.providerId) {
      return res.status(403).json({ success: false, error: "هذه الخدمة لمقدمي الخدمات فقط" });
    }
    const providerId = session.providerId;

    const rows = await db
      .select({
        id: paymentTransactionsTable.id,
        refId: paymentTransactionsTable.refId,
        kind: paymentTransactionsTable.kind,
        userId: paymentTransactionsTable.userId,
        customerName: usersTable.name,
        customerPhone: usersTable.phone,
        serviceId: paymentTransactionsTable.serviceId,
        amount: paymentTransactionsTable.amount,
        commissionAmount: paymentTransactionsTable.commissionAmount,
        currency: paymentTransactionsTable.currency,
        status: paymentTransactionsTable.status,
        gateway: paymentTransactionsTable.gateway,
        paidAt: paymentTransactionsTable.paidAt,
        createdAt: paymentTransactionsTable.createdAt,
      })
      .from(paymentTransactionsTable)
      .leftJoin(usersTable, eq(paymentTransactionsTable.userId, usersTable.id))
      .where(eq(paymentTransactionsTable.providerId, providerId))
      .orderBy(sql`${paymentTransactionsTable.createdAt} DESC`)
      .limit(200);

    const serviceIds = [...new Set(rows.map((r) => r.serviceId).filter((x): x is number => !!x))];
    const services = serviceIds.length
      ? await db.select({ id: servicesTable.id, title: servicesTable.title })
          .from(servicesTable)
          .where(sql`${servicesTable.id} = ANY(${serviceIds})`)
      : [];
    const serviceMap = new Map(services.map((s) => [s.id, s.title]));

    const totals = { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, netEarnings: 0 };
    for (const r of rows) {
      const amt = parseFloat(String(r.amount ?? "0"));
      const com = parseFloat(String(r.commissionAmount ?? "0"));
      if (r.status === "paid") {
        totals.paid++;
        totals.paidAmount += amt;
        totals.netEarnings += amt - com;
      } else if (r.status === "pending") { totals.pending++; totals.pendingAmount += amt; }
      else if (r.status === "failed") { totals.failed++; totals.failedAmount += amt; }
    }

    res.json({
      success: true,
      data: {
        rows: rows.map((r) => ({
          ...r,
          serviceTitle: r.serviceId ? serviceMap.get(r.serviceId) ?? null : null,
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        })),
        totals,
      },
    });
  } catch (err) {
    console.error("provider payments error", err);
    res.status(500).json({ success: false, error: "تعذر جلب سجل المدفوعات" });
  }
});

export default router;
