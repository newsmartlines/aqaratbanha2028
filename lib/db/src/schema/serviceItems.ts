import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subcategoriesTable } from "./subcategories";

export const serviceItemsTable = pgTable("service_items", {
  id: serial("id").primaryKey(),
  subcategoryId: integer("subcategory_id").references(() => subcategoriesTable.id, { onDelete: "cascade" }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceItemSchema = createInsertSchema(serviceItemsTable).omit({ id: true, createdAt: true });
export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItemsTable.$inferSelect;
