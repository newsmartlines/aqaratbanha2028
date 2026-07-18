import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  icon: text("icon"),              // optional emoji/text prefix
  openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type InsertMenuItem = typeof menuItemsTable.$inferInsert;
