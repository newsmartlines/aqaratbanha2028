import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const savedSearchesTable = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("بحث محفوظ"),
  email: text("email"),
  filters: text("filters").notNull().default("{}"),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifyApp: boolean("notify_app").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SavedSearch = typeof savedSearchesTable.$inferSelect;
