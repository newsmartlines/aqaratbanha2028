import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { packagesTable } from "./packages";
import { usersTable } from "./users";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "restrict" }),
  billingPlanId: integer("billing_plan_id"),
  planName: text("plan_name"),
  planNameAr: text("plan_name_ar"),
  planPrice: text("plan_price"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("subscriptions_provider_id_idx").on(t.providerId),
  index("subscriptions_user_id_idx").on(t.userId),
  index("subscriptions_status_idx").on(t.status),
  index("subscriptions_end_date_idx").on(t.endDate),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
