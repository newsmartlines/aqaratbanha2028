/**
 * event-service.ts — Unified Event Orchestration
 * 
 * Central hub for all platform events:
 * - Sends professional emails via mailer.ts
 * - Creates in-app notifications  
 * - Broadcasts real-time SSE events
 * 
 * All methods are fire-and-forget (never throw).
 */

import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mailer } from "./mailer";
import { sseManager } from "./sse-manager";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUser(userId: number): Promise<{ name: string; email: string } | null> {
  try {
    const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, userId));
    return user ?? null;
  } catch { return null; }
}

async function createNotif(opts: {
  userId: number | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  try {
    await db.insert(notificationsTable).values({
      userId: opts.userId as any,
      title: opts.title,
      message: opts.message,
      type: opts.type ?? "info",
      link: opts.link ?? null,
      read: false,
    });
  } catch { /* ignore */ }
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

export const events = {

  /**
   * User registered (normal or Google)
   */
  async onUserRegistered(user: { id: number; name: string; email: string; role: string }) {
    // Welcome email
    mailer.welcome(user.email, user.name).catch(() => {});

    // Admin notification (userId=null = global admin notification)
    const roleLabel = user.role === "provider" ? "شركة عقارية" : "مستخدم عادي";
    createNotif({
      userId: null,
      title: `👤 تسجيل جديد: ${user.name}`,
      message: `نوع الحساب: ${roleLabel} — ${new Date().toLocaleString("ar-EG")}`,
      type: "info",
      link: "/admin/users",
    });

    // SSE: notify all admins
    sseManager.sendToAdmins("user.registered", {
      id: user.id, name: user.name, role: user.role, timestamp: Date.now(),
    });
  },

  /**
   * User requested password reset
   */
  async onForgotPassword(email: string, name: string, resetToken: string) {
    mailer.forgotPassword(email, name, resetToken).catch(() => {});
  },

  /**
   * Property created (submitted for review)
   */
  async onPropertySubmitted(property: {
    id: number; title: string; ownerUserId?: number | null; providerId?: number | null;
    mainCategory?: string | null; listingType?: string | null; price?: string | null;
  }) {
    // Find owner
    const ownerId = property.ownerUserId;
    if (ownerId) {
      const owner = await getUser(ownerId);
      if (owner) {
        // Email to owner
        mailer.propertySubmitted(owner.email, owner.name, property.title, property.id).catch(() => {});

        // In-app notification to owner
        createNotif({
          userId: ownerId,
          title: "📋 تم استلام إعلانك",
          message: `إعلانك "${property.title}" قيد المراجعة. سنخطرك عند المراجعة.`,
          type: "info",
          link: "/user/my-properties",
        });
      }
    }

    // Admin notification
    createNotif({
      userId: null,
      title: "🏠 عقار جديد يحتاج مراجعة",
      message: `"${property.title}" — بانتظار الموافقة`,
      type: "info",
      link: "/admin/properties",
    });

    // SSE: notify all admins
    sseManager.sendToAdmins("property.submitted", {
      id: property.id,
      title: property.title,
      category: property.mainCategory,
      listingType: property.listingType,
      timestamp: Date.now(),
    });
  },

  /**
   * Property approved by admin
   */
  async onPropertyApproved(property: {
    id: number; title: string; ownerUserId?: number | null;
  }) {
    const ownerId = property.ownerUserId;
    if (ownerId) {
      const owner = await getUser(ownerId);
      if (owner) {
        // Email to owner
        mailer.propertyApproved(owner.email, owner.name, property.title, property.id).catch(() => {});
      }

      // In-app notification to owner
      createNotif({
        userId: ownerId,
        title: "✅ تمت الموافقة على إعلانك!",
        message: `إعلانك "${property.title}" الآن ظاهر للجمهور في نتائج البحث.`,
        type: "success",
        link: `/property/${property.id}`,
      });

      // SSE: notify owner
      sseManager.sendToUser(ownerId, "property.approved", {
        id: property.id, title: property.title, timestamp: Date.now(),
      });
    }

    // SSE: broadcast to all (frontend can refresh listings)
    sseManager.broadcast("listings.updated", {
      action: "approved", propertyId: property.id, timestamp: Date.now(),
    });
  },

  /**
   * Property rejected by admin
   */
  async onPropertyRejected(property: {
    id: number; title: string; ownerUserId?: number | null;
  }, rejectionReason: string) {
    const ownerId = property.ownerUserId;
    if (ownerId) {
      const owner = await getUser(ownerId);
      if (owner) {
        // Email to owner with rejection reason
        mailer.propertyRejected(owner.email, owner.name, property.title, rejectionReason).catch(() => {});
      }

      // In-app notification to owner
      createNotif({
        userId: ownerId,
        title: "❌ تم رفض إعلانك",
        message: `إعلانك "${property.title}" تم رفضه. السبب: ${rejectionReason || "لا يتوافق مع شروط النشر"}. يمكنك التعديل وإعادة التقديم.`,
        type: "warning",
        link: "/user/my-properties",
      });

      // SSE: notify owner
      if (ownerId) {
        sseManager.sendToUser(ownerId, "property.rejected", {
          id: property.id, title: property.title, reason: rejectionReason, timestamp: Date.now(),
        });
      }
    }

    // SSE: broadcast (frontend removes from listings)
    sseManager.broadcast("listings.updated", {
      action: "rejected", propertyId: property.id, timestamp: Date.now(),
    });
  },

  /**
   * Property deleted
   */
  async onPropertyDeleted(property: {
    id: number; title: string; ownerUserId?: number | null;
  }, deletedByAdmin = false) {
    const ownerId = property.ownerUserId;

    if (ownerId && deletedByAdmin) {
      createNotif({
        userId: ownerId,
        title: "🗑️ تم حذف إعلانك",
        message: `إعلانك "${property.title}" تم حذفه من قِبَل الإدارة.`,
        type: "warning",
        link: "/user/my-properties",
      });
      sseManager.sendToUser(ownerId, "property.deleted", {
        id: property.id, timestamp: Date.now(),
      });
    }

    // SSE: broadcast (frontend removes from listings)
    sseManager.broadcast("listings.updated", {
      action: "deleted", propertyId: property.id, timestamp: Date.now(),
    });
  },

  /**
   * Property edited (reset to pending)
   */
  async onPropertyEdited(property: {
    id: number; title: string; ownerUserId?: number | null;
  }) {
    // SSE: notify admins (new pending item)
    sseManager.sendToAdmins("property.edited", {
      id: property.id, title: property.title, timestamp: Date.now(),
    });

    // SSE: broadcast (frontend updates listing state)
    sseManager.broadcast("listings.updated", {
      action: "edited", propertyId: property.id, timestamp: Date.now(),
    });
  },

  /**
   * New message received
   */
  async onNewMessage(toUserId: number, fromName: string, messagePreview: string) {
    const user = await getUser(toUserId);
    if (user) {
      mailer.newMessage(user.email, user.name, fromName, messagePreview).catch(() => {});
    }
    // SSE: notify recipient
    sseManager.sendToUser(toUserId, "message.new", {
      from: fromName, preview: messagePreview, timestamp: Date.now(),
    });
  },

  /**
   * New notification created — push via SSE
   */
  async onNewNotification(userId: number, notification: {
    title: string; message: string; type?: string; link?: string;
  }) {
    await createNotif({ userId, ...notification });
    sseManager.sendToUser(userId, "notification.new", {
      ...notification, timestamp: Date.now(),
    });
  },

  /**
   * Package purchased
   */
  async onPackagePurchased(userId: number, packageName: string, expiryDate: string) {
    const user = await getUser(userId);
    if (user) {
      mailer.packagePurchased(user.email, user.name, packageName, expiryDate).catch(() => {});
    }
    createNotif({
      userId,
      title: `🌟 تم تفعيل باقة ${packageName}`,
      message: `باقتك فعّالة حتى ${expiryDate}. استمتع بجميع المزايا.`,
      type: "success",
      link: "/dashboard/packages",
    });
    sseManager.sendToUser(userId, "package.activated", {
      packageName, expiryDate, timestamp: Date.now(),
    });
  },

  /**
   * Sidebar counts changed — push to admins
   */
  async notifyAdminSidebarUpdate() {
    sseManager.sendToAdmins("admin.sidebar_update", { timestamp: Date.now() });
  },
};
