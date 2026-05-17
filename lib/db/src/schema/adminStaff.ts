import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminStaffTable = pgTable("admin_staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("moderator"),
  permissions: text("permissions").default("{}"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminStaff = typeof adminStaffTable.$inferSelect;
