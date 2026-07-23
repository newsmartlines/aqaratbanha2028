import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";

export const propertyReportsTable = pgTable("property_reports", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("property_reports_property_id_idx").on(t.propertyId),
  index("property_reports_status_idx").on(t.status),
]);

export const insertPropertyReportSchema = createInsertSchema(propertyReportsTable).omit({ id: true, createdAt: true, status: true });
export type InsertPropertyReport = z.infer<typeof insertPropertyReportSchema>;
export type PropertyReport = typeof propertyReportsTable.$inferSelect;
