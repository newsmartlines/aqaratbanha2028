import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { propertiesTable } from "./properties";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  propertyId: integer("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("messages_sender_id_idx").on(t.senderId),
  index("messages_receiver_id_idx").on(t.receiverId),
  index("messages_property_id_idx").on(t.propertyId),
  index("messages_conversation_idx").on(t.senderId, t.receiverId),
]);

export type Message = typeof messagesTable.$inferSelect;
