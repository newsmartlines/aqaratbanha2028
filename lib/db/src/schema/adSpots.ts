import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const adSpotsTable = pgTable("ad_spots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  adType: text("ad_type").default("banner").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkTarget: text("link_target").default("_blank"),
  bgColor: text("bg_color").default("#0d9488"),
  textColor: text("text_color").default("#ffffff"),
  badgeText: text("badge_text"),
  buttonText: text("button_text"),
  customHtml: text("custom_html"),
  sortOrder: integer("sort_order").default(0),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AdSpot = typeof adSpotsTable.$inferSelect;
export type InsertAdSpot = typeof adSpotsTable.$inferInsert;
