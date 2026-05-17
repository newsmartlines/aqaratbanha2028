import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { providersTable } from "./providers";
import { servicesTable } from "./services";
import { faultsTable } from "./faults";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "set null" }),
  assignedCompanyId: integer("assigned_company_id").references(() => providersTable.id, { onDelete: "set null" }),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  faultId: integer("fault_id").references(() => faultsTable.id, { onDelete: "set null" }),
  effectivePrice: numeric("effective_price", { precision: 10, scale: 2 }),
  message: text("message"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  // Payment linkage when the request was created via paid checkout.
  paymentRef: text("payment_ref"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, createdAt: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
