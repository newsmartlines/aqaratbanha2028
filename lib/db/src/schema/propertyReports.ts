import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyReportsTable = pgTable("property_reports", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertyReportSchema = createInsertSchema(propertyReportsTable).omit({ id: true, createdAt: true, status: true });
export type InsertPropertyReport = z.infer<typeof insertPropertyReportSchema>;
export type PropertyReport = typeof propertyReportsTable.$inferSelect;
