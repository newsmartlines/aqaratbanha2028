import { pgTable, serial, text, numeric, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bio: text("bio"),
  banner: text("banner"),
  avatar: text("avatar"),
  logo: text("logo"),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  contactMethods: text("contact_methods").default("[]"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  coveredAreas: text("covered_areas").default("[]"),
  active: boolean("active").default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  reviewsCount: integer("reviews_count").default(0),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  approved: boolean("approved").default(false),
  suspended: boolean("suspended").default(false),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("providers_user_id_idx").on(t.userId),
  index("providers_category_id_idx").on(t.categoryId),
  index("providers_approved_idx").on(t.approved),
  index("providers_featured_idx").on(t.featured),
  index("providers_suspended_idx").on(t.suspended),
]);

export const insertProviderSchema = createInsertSchema(providersTable).omit({ id: true, createdAt: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providersTable.$inferSelect;
