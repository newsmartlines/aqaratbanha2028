import { pgTable, serial, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  avatar: text("avatar"),
  status: text("status").notNull().default("active"),
  /** FK enforced in DB migration; kept as int here to avoid schema circular imports */
  regionId: integer("region_id"),
  cityId: integer("city_id"),
  googleId: text("google_id").unique(),
  authProvider: text("auth_provider").default("email"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("users_role_idx").on(t.role),
  index("users_status_idx").on(t.status),
  index("users_created_at_idx").on(t.createdAt),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
