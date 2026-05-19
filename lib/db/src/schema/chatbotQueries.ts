import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const chatbotQueriesTable = pgTable("chatbot_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  count: integer("count").notNull().default(1),
  resultCount: integer("result_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChatbotQuery = typeof chatbotQueriesTable.$inferSelect;
