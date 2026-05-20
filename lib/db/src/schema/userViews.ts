import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const userViewsTable = pgTable("user_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id").notNull(),
  propertyId: integer("property_id").notNull(),
  durationSec: integer("duration_sec").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserView = typeof userViewsTable.$inferSelect;
