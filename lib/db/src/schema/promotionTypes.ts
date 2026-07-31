import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * promotion_types — Admin-configurable promotion catalog
 * All 6 types: bump_up, spotlight, featured_homepage, featured_category, urgent_badge, premium_listing
 * Every field is editable from the admin panel — no hardcoded values.
 */
export const promotionTypesTable = pgTable("promotion_types", {
  id:               serial("id").primaryKey(),
  key:              text("key").notNull().unique(),          // 'bump_up' | 'spotlight' | 'featured_homepage' | 'featured_category' | 'urgent_badge' | 'premium_listing'
  nameAr:           text("name_ar").notNull(),
  nameEn:           text("name_en").notNull(),
  descriptionAr:    text("description_ar"),
  isEnabled:        boolean("is_enabled").default(true),
  price:            numeric("price", { precision: 10, scale: 2 }).default("0"),
  durationDays:     integer("duration_days").default(7),
  boostScore:       integer("boost_score").default(200),     // ranking weight
  badgeText:        text("badge_text"),                      // e.g. "ترفيع", "مميز"
  badgeColor:       text("badge_color").default("#FFFFFF"),  // text hex
  badgeBgColor:     text("badge_bg_color").default("#3B82F6"),
  maxSimultaneous:  integer("max_simultaneous").default(1),  // per property
  vatPercent:       numeric("vat_percent", { precision: 5, scale: 2 }).default("0"),
  discountPercent:  numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  requiresApproval: boolean("requires_approval").default(true), // pending until admin approves
  autoExpiry:       boolean("auto_expiry").default(true),
  priority:         integer("priority").default(0),          // display order
  benefits:         text("benefits"),                        // JSON: string[]
  visibility:       text("visibility").default("all"),       // 'all' | 'homepage' | 'category' | 'search'
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
}, (t) => [
  index("pt_key_idx").on(t.key),
  index("pt_is_enabled_idx").on(t.isEnabled),
  index("pt_priority_idx").on(t.priority),
]);

export type PromotionTypeRow = typeof promotionTypesTable.$inferSelect;
export type InsertPromotionType = typeof promotionTypesTable.$inferInsert;
