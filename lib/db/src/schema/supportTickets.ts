import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { providersTable } from "./providers";

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  /** Human-facing id e.g. TK-10421 */
  publicId: text("public_id").notNull().unique(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("Pending"),
  message: text("message").notNull(),
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SupportTicketRow = typeof supportTicketsTable.$inferSelect;
