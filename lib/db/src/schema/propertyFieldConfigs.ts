import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const propertyFieldConfigsTable = pgTable("property_field_configs", {
  id: serial("id").primaryKey(),
  mainCategory: text("main_category").notNull(),
  fieldKey: text("field_key").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  label: text("label"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PropertyFieldConfig = typeof propertyFieldConfigsTable.$inferSelect;
export type NewPropertyFieldConfig = typeof propertyFieldConfigsTable.$inferInsert;
