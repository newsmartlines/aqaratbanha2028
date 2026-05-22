import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const propertyFeaturesTable = pgTable("property_features", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("feature"), // "feature" | "service"
  name: text("name").notNull(),
  icon: text("icon").default("🏠"),
  status: text("status").notNull().default("active"), // "active" | "hidden"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PropertyFeature = typeof propertyFeaturesTable.$inferSelect;
export type NewPropertyFeature = typeof propertyFeaturesTable.$inferInsert;
