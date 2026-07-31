/**
 * subscription-scheduler.ts
 * Runs periodically to:
 *  1. Warn users whose subscription expires within 7, 3, or 1 day(s)
 *  2. Mark expired subscriptions and notify users via email + in-app notification
 */

import { db } from "@workspace/db";
import {
  subscriptionsTable,
  usersTable,
  providersTable,
  notificationsTable,
  promotionPurchasesTable,
  promotionTypesTable,
  propertiesTable,
  propertyPromotionsTable,
} from "@workspace/db";
import { eq, and, lte, gte, sql, inArray, ne } from "drizzle-orm";
import { mailer } from "./mailer";
import { logger } from "./logger";

const WARN_DAYS = [7, 3, 1]; // days before expiry to send warning

function formatDate(d: Date): string {
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function sendInAppNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  link: string,
) {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      message,
      link,
      read: false,
    });
  } catch (err) {
    logger.warn({ err, userId }, "[scheduler] Failed to insert in-app notification");
  }
}

export async function runSubscriptionScheduler(): Promise<void> {
  logger.info("[scheduler] Running subscription expiry check…");

  try {
    const now = new Date();

    // ─── 1. Expire overdue active subscriptions ──────────────────────────────
    const expired = await db
      .update(subscriptionsTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(subscriptionsTable.status, "active"),
          lte(subscriptionsTable.endDate, now),
        ),
      )
      .returning({
        id: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        providerId: subscriptionsTable.providerId,
        planNameAr: subscriptionsTable.planNameAr,
        planName: subscriptionsTable.planName,
      });

    if (expired.length > 0) {
      logger.info(`[scheduler] Marked ${expired.length} subscription(s) as expired`);

      for (const sub of expired) {
        // Resolve userId: direct user subscription, or via provider owner for provider-only subs
        let resolvedUserId = sub.userId ?? null;
        if (!resolvedUserId && sub.providerId) {
          const [prov] = await db
            .select({ userId: providersTable.userId })
            .from(providersTable)
            .where(eq(providersTable.id, sub.providerId));
          resolvedUserId = prov?.userId ?? null;
        }

        // Fix 4: when a provider subscription expires, unset verified if no other active sub exists
        if (sub.providerId) {
          const [otherActive] = await db
            .select({ id: subscriptionsTable.id })
            .from(subscriptionsTable)
            .where(
              and(
                eq(subscriptionsTable.providerId, sub.providerId),
                eq(subscriptionsTable.status, "active"),
              ),
            )
            .limit(1);
          if (!otherActive) {
            await db
              .update(providersTable)
              .set({ verified: false })
              .where(eq(providersTable.id, sub.providerId))
              .catch((err) => logger.warn({ err }, "[scheduler] Failed to unset provider verified"));
          }
        }

        if (!resolvedUserId) continue;

        const [user] = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, resolvedUserId));

        if (!user) continue;

        const pkgName = sub.planNameAr || sub.planName || "الباقة";

        // Email
        await mailer.subscriptionExpired(user.email, user.name, pkgName);

        // In-app notification
        await sendInAppNotification(
          user.id,
          "انتهت مدة باقتك",
          `انتهت مدة باقة ${pkgName}. جدّد الآن للاستمرار في الاستفادة من المزايا.`,
          "warning",
          "/dashboard/packages",
        );
      }
    }

    // ─── 2. Send expiry-warning for subscriptions expiring in 7 / 3 / 1 day(s) ─
    for (const days of WARN_DAYS) {
      const windowStart = new Date(now.getTime() + days * 86_400_000 - 3_600_000); // days - 1 hour
      const windowEnd = new Date(now.getTime() + days * 86_400_000 + 3_600_000);   // days + 1 hour

      const expiring = await db
        .select({
          id: subscriptionsTable.id,
          userId: subscriptionsTable.userId,
          providerId: subscriptionsTable.providerId,
          planNameAr: subscriptionsTable.planNameAr,
          planName: subscriptionsTable.planName,
          endDate: subscriptionsTable.endDate,
        })
        .from(subscriptionsTable)
        .where(
          and(
            eq(subscriptionsTable.status, "active"),
            gte(subscriptionsTable.endDate, windowStart),
            lte(subscriptionsTable.endDate, windowEnd),
          ),
        );

      for (const sub of expiring) {
        // Resolve userId: direct user, or via provider owner for provider-only subs
        let resolvedUserId = sub.userId ?? null;
        if (!resolvedUserId && sub.providerId) {
          const [prov] = await db
            .select({ userId: providersTable.userId })
            .from(providersTable)
            .where(eq(providersTable.id, sub.providerId));
          resolvedUserId = prov?.userId ?? null;
        }
        if (!resolvedUserId) continue;

        const [user] = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, resolvedUserId));

        if (!user) continue;

        const pkgName = sub.planNameAr || sub.planName || "الباقة";
        const expiryDateStr = formatDate(new Date(sub.endDate));

        // Email warning
        await mailer.subscriptionExpiryWarning(
          user.email,
          user.name,
          pkgName,
          expiryDateStr,
          days,
        );

        // In-app notification
        await sendInAppNotification(
          user.id,
          `تنبيه: باقتك ستنتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
          `باقة ${pkgName} ستنتهي بتاريخ ${expiryDateStr}. جدّد الآن لضمان الاستمرارية.`,
          "warning",
          "/dashboard/packages",
        );

        logger.info(
          { userId: user.id, subId: sub.id, days },
          `[scheduler] Sent ${days}-day expiry warning`,
        );
      }
    }

    logger.info("[scheduler] Subscription check complete.");
  } catch (err) {
    logger.error({ err }, "[scheduler] Subscription scheduler error");
  }
}

/**
 * Promotion purchase expiry scheduler.
 * 1. Marks expired active purchases as 'expired' and deactivates the linked promotion.
 * 2. Sends 3-day and 1-day warning notifications.
 */
export async function runPromotionScheduler(): Promise<void> {
  try {
    const now = new Date();

    // ─── 1. Expire overdue active purchases ──────────────────────────────────
    const expiredPurchases = await db
      .select({
        id: promotionPurchasesTable.id,
        userId: promotionPurchasesTable.userId,
        propertyId: promotionPurchasesTable.propertyId,
        promotionId: promotionPurchasesTable.promotionId,
        promotionTypeId: promotionPurchasesTable.promotionTypeId,
      })
      .from(promotionPurchasesTable)
      .where(
        and(
          eq(promotionPurchasesTable.status, "active"),
          lte(promotionPurchasesTable.expiresAt, now),
        )
      );

    for (const purchase of expiredPurchases) {
      // Mark purchase expired
      await db.update(promotionPurchasesTable)
        .set({ status: "expired", updatedAt: now })
        .where(eq(promotionPurchasesTable.id, purchase.id));

      // Deactivate the linked property_promotions row
      if (purchase.promotionId) {
        await db.update(propertyPromotionsTable)
          .set({ isActive: false })
          .where(eq(propertyPromotionsTable.id, purchase.promotionId));
      }

      // Reset featured/urgent flags if no other active promotions of that type
      const [pType] = await db.select({ key: promotionTypesTable.key })
        .from(promotionTypesTable)
        .where(eq(promotionTypesTable.id, purchase.promotionTypeId));

      if (pType?.key === "featured_homepage") {
        const [stillActive] = await db.select({ id: propertyPromotionsTable.id })
          .from(propertyPromotionsTable)
          .where(and(
            eq(propertyPromotionsTable.propertyId, purchase.propertyId),
            eq(propertyPromotionsTable.type, "featured_homepage"),
            eq(propertyPromotionsTable.isActive, true),
          )).limit(1);
        if (!stillActive) {
          await db.update(propertiesTable).set({ featured: false }).where(eq(propertiesTable.id, purchase.propertyId));
        }
      }
      if (pType?.key === "urgent_badge") {
        const [stillActive] = await db.select({ id: propertyPromotionsTable.id })
          .from(propertyPromotionsTable)
          .where(and(
            eq(propertyPromotionsTable.propertyId, purchase.propertyId),
            eq(propertyPromotionsTable.type, "urgent_badge"),
            eq(propertyPromotionsTable.isActive, true),
          )).limit(1);
        if (!stillActive) {
          await db.update(propertiesTable).set({ urgent: false }).where(eq(propertiesTable.id, purchase.propertyId));
        }
      }

      // Notify user: promotion expired
      try {
        const [pt] = await db.select({ nameAr: promotionTypesTable.nameAr }).from(promotionTypesTable).where(eq(promotionTypesTable.id, purchase.promotionTypeId));
        const [prop] = await db.select({ title: propertiesTable.title }).from(propertiesTable).where(eq(propertiesTable.id, purchase.propertyId));
        await sendInAppNotification(
          purchase.userId,
          "⏰ انتهت مدة الترقية",
          `انتهت ترقية "${pt?.nameAr ?? "الترقية"}" على عقارك "${prop?.title ?? `#${purchase.propertyId}`}". جدّد الترقية الآن للاستمرار في الظهور.`,
          "promotion",
          "/dashboard/promotions",
        );
      } catch {}
    }

    if (expiredPurchases.length > 0) {
      logger.info(`[scheduler] Expired ${expiredPurchases.length} promotion purchase(s)`);
    }

    // ─── 2. Send expiry warnings (3 days and 1 day) ───────────────────────────
    for (const days of [3, 1]) {
      const windowStart = new Date(now.getTime() + days * 86_400_000 - 3_600_000);
      const windowEnd   = new Date(now.getTime() + days * 86_400_000 + 3_600_000);

      const expiring = await db
        .select({
          id: promotionPurchasesTable.id,
          userId: promotionPurchasesTable.userId,
          propertyId: promotionPurchasesTable.propertyId,
          promotionTypeId: promotionPurchasesTable.promotionTypeId,
          expiresAt: promotionPurchasesTable.expiresAt,
        })
        .from(promotionPurchasesTable)
        .where(
          and(
            eq(promotionPurchasesTable.status, "active"),
            gte(promotionPurchasesTable.expiresAt, windowStart),
            lte(promotionPurchasesTable.expiresAt, windowEnd),
          )
        );

      for (const purchase of expiring) {
        try {
          const [pt] = await db.select({ nameAr: promotionTypesTable.nameAr }).from(promotionTypesTable).where(eq(promotionTypesTable.id, purchase.promotionTypeId));
          const [prop] = await db.select({ title: propertiesTable.title }).from(propertiesTable).where(eq(propertiesTable.id, purchase.propertyId));
          await sendInAppNotification(
            purchase.userId,
            `تنبيه: ترقيتك ستنتهي خلال ${days} ${days === 1 ? "يوم" : "أيام"}`,
            `ترقية "${pt?.nameAr ?? "الترقية"}" على عقارك "${prop?.title ?? `#${purchase.propertyId}`}" ستنتهي قريباً. جدّد الآن للاستمرار في الظهور.`,
            "warning",
            "/dashboard/promotions",
          );
        } catch {}
      }
    }
  } catch (err) {
    logger.warn({ err }, "[scheduler] Promotion scheduler error (non-fatal)");
  }
}

/**
 * Start the subscription scheduler.
 * Runs immediately on startup, then every hour.
 */
export function startSubscriptionScheduler(): void {
  // Run immediately on server start
  runSubscriptionScheduler().catch((e) =>
    logger.error({ err: e }, "[scheduler] Initial run failed"),
  );
  runPromotionScheduler().catch(() => {});

  // Then every hour
  setInterval(() => {
    runSubscriptionScheduler().catch((e) =>
      logger.error({ err: e }, "[scheduler] Scheduled run failed"),
    );
    runPromotionScheduler().catch(() => {});
  }, 60 * 60 * 1000);

  logger.info("[scheduler] Subscription scheduler started (runs every hour)");
}
