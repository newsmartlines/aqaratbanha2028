import { pgTable, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { providersTable } from "./providers";
import { serviceItemsTable } from "./serviceItems";
import { faultsTable } from "./faults";

export const companyPricingTable = pgTable("company_pricing", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => providersTable.id, { onDelete: "cascade" }),
  serviceItemId: integer("service_item_id").references(() => serviceItemsTable.id, { onDelete: "cascade" }),
  faultId: integer("fault_id").references(() => faultsTable.id, { onDelete: "cascade" }),
  customPrice: numeric("custom_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanyPricingSchema = createInsertSchema(companyPricingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompanyPricing = z.infer<typeof insertCompanyPricingSchema>;
export type CompanyPricing = typeof companyPricingTable.$inferSelect;
