import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  category: text("category").notNull().default("custom"),
  variables: text("variables").default("[]"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  templateId: text("template_id"),
  templateName: text("template_name"),
  toEmail: text("to_email").notNull(),
  toName: text("to_name"),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  metadata: text("metadata"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
export type EmailLog = typeof emailLogsTable.$inferSelect;
