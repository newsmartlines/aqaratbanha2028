import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { propertiesTable } from "./properties";

export const userViewsTable = pgTable("user_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  propertyId: integer("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  durationSec: integer("duration_sec").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("user_views_property_id_idx").on(t.propertyId),
  index("user_views_session_id_idx").on(t.sessionId),
  index("user_views_user_id_idx").on(t.userId),
]);

export type UserView = typeof userViewsTable.$inferSelect;
