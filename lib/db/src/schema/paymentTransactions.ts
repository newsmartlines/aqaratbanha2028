import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { packagesTable } from "./packages";

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  refId: text("ref_id").notNull().unique(),
  providerId: integer("provider_id").notNull().references(() => providersTable.id, { onDelete: "cascade" }),
  packageId: integer("package_id").references(() => packagesTable.id),
  // Distinguishes subscription payments from per-service-request payments.
  kind: text("kind").notNull().default("subscription"),
  // Customer + service for service-request kind. Null for subscriptions.
  userId: integer("user_id"),
  serviceId: integer("service_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  // Platform commission deducted from amount on success (service-request kind only).
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("EGP"),
  gateway: text("gateway").notNull().default("stcpay"),
  gatewayRef: text("gateway_ref"),
  gatewayPayload: text("gateway_payload"),
  status: text("status").notNull().default("pending"),
  fromOnboarding: integer("from_onboarding").notNull().default(0),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
