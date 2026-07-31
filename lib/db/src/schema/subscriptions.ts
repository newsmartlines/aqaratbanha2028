import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { packagesTable } from "./packages";
import { usersTable } from "./users";
import { billingPlansTable } from "./billingPlans";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "restrict" }),
  billingPlanId: integer("billing_plan_id").references(() => billingPlansTable.id, { onDelete: "set null" }),
  planName: text("plan_name"),
  planNameAr: text("plan_name_ar"),
  planPrice: text("plan_price"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  // Statuses: pending | active | expired | cancelled | replaced
  status: text("status").notNull().default("active"),
  // Replacement / renewal tracking — set when this row is superseded
  replacedBySubscriptionId: integer("replaced_by_subscription_id"), // intentionally no FK (self-ref)
  replacedAt: timestamp("replaced_at"),
  replacementReason: text("replacement_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("subscriptions_provider_id_idx").on(t.providerId),
  index("subscriptions_user_id_idx").on(t.userId),
  index("subscriptions_status_idx").on(t.status),
  index("subscriptions_end_date_idx").on(t.endDate),
  // DB-level guarantee: only one ACTIVE subscription per provider (Fix 1)
  uniqueIndex("subscriptions_one_active_per_provider_idx")
    .on(t.providerId)
    .where(sql`status = 'active' AND provider_id IS NOT NULL`),
  // DB-level guarantee: only one ACTIVE subscription per user (Fix 1)
  uniqueIndex("subscriptions_one_active_per_user_idx")
    .on(t.userId)
    .where(sql`status = 'active' AND user_id IS NOT NULL`),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
