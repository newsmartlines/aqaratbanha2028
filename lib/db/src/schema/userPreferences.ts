import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique(),
  sessionId: text("session_id"),
  preferredListingType: text("preferred_listing_type"),
  preferredCategory: text("preferred_category"),
  preferredCity: text("preferred_city"),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
