import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { serviceItemsTable } from "./serviceItems";

export const faultsTable = pgTable("faults", {
  id: serial("id").primaryKey(),
  serviceItemId: integer("service_item_id").references(() => serviceItemsTable.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description"),
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFaultSchema = createInsertSchema(faultsTable).omit({ id: true, createdAt: true });
export type InsertFault = z.infer<typeof insertFaultSchema>;
export type Fault = typeof faultsTable.$inferSelect;
