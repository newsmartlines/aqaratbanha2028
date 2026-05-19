import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const regionsTable = pgTable("regions", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  order: integer("order").default(0),
  enabled: boolean("enabled").default(true).notNull(),
});

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => regionsTable.id, { onDelete: "cascade" }).notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const areasTable = pgTable("areas", {
  id: serial("id").primaryKey(),
  cityId: integer("city_id").references(() => citiesTable.id, { onDelete: "cascade" }).notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const providerServiceAreasTable = pgTable("provider_service_areas", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  regionId: integer("region_id").references(() => regionsTable.id, { onDelete: "cascade" }).notNull(),
  cityId: integer("city_id").references(() => citiesTable.id, { onDelete: "cascade" }),
  areaId: integer("area_id").references(() => areasTable.id, { onDelete: "set null" }),
});

export const featuredAreasTable = pgTable("featured_areas", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  image: text("image"),
  cityName: text("city_name"),
  displayOrder: integer("display_order").default(0),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Region = typeof regionsTable.$inferSelect;
export type City = typeof citiesTable.$inferSelect;
export type Area = typeof areasTable.$inferSelect;
export type ProviderServiceArea = typeof providerServiceAreasTable.$inferSelect;
export type FeaturedArea = typeof featuredAreasTable.$inferSelect;
