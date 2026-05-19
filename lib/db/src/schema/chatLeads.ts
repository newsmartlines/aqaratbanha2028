import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatLeadsTable = pgTable("chat_leads", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  propertyId: integer("property_id"),
  propertyTitle: text("property_title"),
  intent: text("intent"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatLeadSchema = createInsertSchema(chatLeadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatLead = z.infer<typeof insertChatLeadSchema>;
export type ChatLead = typeof chatLeadsTable.$inferSelect;
