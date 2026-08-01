import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { providersTable } from "./providers";
import { usersTable } from "./users";

export type TicketMessage = {
  role: "provider" | "admin";
  text: string;
  createdAt: string;
};

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  /** Human-facing id e.g. TK-10421 */
  publicId: text("public_id").notNull().unique(),
  providerId: integer("provider_id")
    .references(() => providersTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("Pending"),
  message: text("message").notNull(),
  adminReply: text("admin_reply"),
  messages: jsonb("messages").$type<TicketMessage[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SupportTicketRow = typeof supportTicketsTable.$inferSelect;
