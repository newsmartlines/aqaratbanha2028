import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const propertyFeaturesTable = pgTable("property_features", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("feature"), // "feature" | "service"
  name: text("name").notNull(),
  icon: text("icon").default("🏠"),
  status: text("status").notNull().default("active"), // "active" | "inactive"
  sortOrder: integer("sort_order").notNull().default(0),
  applicableTypes: text("applicable_types"), // JSON array of mainCategory strings; null = all types
  // ── Dynamic Filters Engine (v4) ──────────────────────────────────────────
  filterType: text("filter_type").notNull().default("checkbox"), // checkbox|bool|select|range
  filterOptions: text("filter_options"), // JSON [{value,label}] for select; null for others
  filterGroup: text("filter_group").notNull().default("all"), // all|residential|commercial|land
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PropertyFeature = typeof propertyFeaturesTable.$inferSelect;
export type NewPropertyFeature = typeof propertyFeaturesTable.$inferInsert;
