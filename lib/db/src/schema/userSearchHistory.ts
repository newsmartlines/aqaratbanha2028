import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

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
}, (t) => [
  index("user_search_history_user_id_idx").on(t.userId),
  index("user_search_history_session_id_idx").on(t.sessionId),
]);

export type UserSearchHistory = typeof userSearchHistoryTable.$inferSelect;
