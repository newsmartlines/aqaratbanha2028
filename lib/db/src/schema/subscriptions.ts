import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { packagesTable } from "./packages";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providersTable.id, { onDelete: "cascade" }),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "restrict" }),
  billingPlanId: integer("billing_plan_id"),
  planName: text("plan_name"),
  planNameAr: text("plan_name_ar"),
  planPrice: text("plan_price"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
