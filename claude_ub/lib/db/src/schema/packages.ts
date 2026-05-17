import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  durationDays: integer("duration_days").notNull().default(30),
  maxListings: integer("max_listings").default(3),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("15"),
  featuredAllowed: integer("featured_allowed").default(0),
  topBadge: boolean("top_badge").default(false),
  priorityRank: integer("priority_rank").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ id: true, createdAt: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
