import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userSearchHistoryTable = pgTable("user_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  keyword: text("keyword"),
  listingType: text("listing_type"),
  category: text("category"),
  city: text("city"),
  filters: text("filters"),
  resultsCount: integer("results_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserSearchHistory = typeof userSearchHistoryTable.$inferSelect;
