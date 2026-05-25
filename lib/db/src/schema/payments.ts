import { pgTable, serial, text, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  invoiceId: text("invoice_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("payments_provider_id_idx").on(t.providerId),
  index("payments_status_idx").on(t.status),
  index("payments_created_at_idx").on(t.createdAt),
]);

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
