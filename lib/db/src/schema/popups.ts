import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const popupsTable = pgTable("popups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  ctaText: text("cta_text"),
  ctaLink: text("cta_link"),
  bgColor: text("bg_color").default("#ffffff"),
  overlayOpacity: integer("overlay_opacity").default(50),
  textColor: text("text_color").default("#111827"),
  btnColor: text("btn_color").default("#0d9488"),
  btnTextColor: text("btn_text_color").default("#ffffff"),
  borderRadius: integer("border_radius").default(12),
  size: text("size").default("md"),
  position: text("position").default("center"),
  triggerType: text("trigger_type").default("immediate"),
  triggerDelay: integer("trigger_delay").default(3),
  triggerScrollPct: integer("trigger_scroll_pct").default(50),
  pages: text("pages").default('["all"]'),
  showCloseBtn: boolean("show_close_btn").default(true),
  cookieDuration: integer("cookie_duration").default(1),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPopupSchema = createInsertSchema(popupsTable).omit({ id: true, createdAt: true });
export type InsertPopup = z.infer<typeof insertPopupSchema>;
export type Popup = typeof popupsTable.$inferSelect;
