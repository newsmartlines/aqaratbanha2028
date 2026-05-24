import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const marketSnapshotsTable = pgTable("market_snapshots", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id"),
  cityId: integer("city_id"),
  district: text("district"),
  mainCategory: text("main_category").notNull(),
  subCategory: text("sub_category"),
  listingType: text("listing_type"),
  avgPricePerM2: numeric("avg_price_per_m2", { precision: 14, scale: 2 }),
  minPricePerM2: numeric("min_price_per_m2", { precision: 14, scale: 2 }),
  maxPricePerM2: numeric("max_price_per_m2", { precision: 14, scale: 2 }),
  sampleCount: integer("sample_count").default(0),
  trend1m: numeric("trend_1m", { precision: 8, scale: 2 }),
  trend3m: numeric("trend_3m", { precision: 8, scale: 2 }),
  trend6m: numeric("trend_6m", { precision: 8, scale: 2 }),
  trend12m: numeric("trend_12m", { precision: 8, scale: 2 }),
  demandScore: integer("demand_score").default(0),
  demandLevel: text("demand_level").default("متوسط"),
  priceHistory: text("price_history"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MarketSnapshot = typeof marketSnapshotsTable.$inferSelect;
