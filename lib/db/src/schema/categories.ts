import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").default("Grid"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  status: text("status").notNull().default("active"),
  type: text("type").notNull().default("service"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("categories_status_idx").on(t.status),
  index("categories_type_idx").on(t.type),
]);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
