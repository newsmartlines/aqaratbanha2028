import { pgTable, serial, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { usersTable } from "./users";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => providersTable.id, { onDelete: "cascade" }),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  mainCategory: text("main_category").notNull(),
  listingType: text("listing_type").notNull(),
  subCategory: text("sub_category"),
  price: numeric("price", { precision: 14, scale: 2 }),
  area: numeric("area", { precision: 10, scale: 2 }),
  rooms: integer("rooms"),
  bathrooms: integer("bathrooms"),
  floor: integer("floor"),
  totalFloors: integer("total_floors"),
  buildYear: integer("build_year"),
  finishing: text("finishing"),
  condition: text("condition"),
  furnished: text("furnished"),
  direction: text("direction"),
  facade: text("facade"),
  paymentMethod: text("payment_method"),
  rentDuration: text("rent_duration"),
  advertiserType: text("advertiser_type"),
  compound: text("compound"),
  address: text("address"),
  regionId: integer("region_id"),
  cityId: integer("city_id"),
  district: text("district"),
  street: text("street"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  images: text("images"),
  videoUrl: text("video_url"),
  brochureUrl: text("brochure_url"),
  landType: text("land_type"),
  landWidth: numeric("land_width", { precision: 10, scale: 2 }),
  landDepth: numeric("land_depth", { precision: 10, scale: 2 }),
  buildRatio: numeric("build_ratio", { precision: 5, scale: 2 }),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  features: text("features"),
  nearbyServices: text("nearby_services"),
  contactMethods: text("contact_methods"),
  status: text("status").default("pending"),
  rejectionReason: text("rejection_reason"),
  featured: boolean("featured").default(false),
  urgent: boolean("urgent").default(false),
  viewCount: integer("view_count").default(0).notNull(),
  phoneClickCount: integer("phone_click_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
