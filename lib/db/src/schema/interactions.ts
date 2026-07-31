import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { providersTable } from "./providers";

export const interactionsTable = pgTable("interactions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "phone" | "whatsapp" | "message"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Interaction = typeof interactionsTable.$inferSelect;
