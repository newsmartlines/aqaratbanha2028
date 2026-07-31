import { pgTable, serial, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { promotionTypesTable } from "./promotionTypes";
import { propertiesTable } from "./properties";
import { usersTable } from "./users";
import { propertyPromotionsTable } from "./promotions";

/**
 * promotion_purchases — Paid promotion purchase lifecycle
 * status: pending → active (on admin approval) | rejected | cancelled | expired
 * A payment record is created for every purchase.
 * The linked property_promotions row is created only on approval.
 */
export const promotionPurchasesTable = pgTable("promotion_purchases", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  propertyId:       integer("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  promotionTypeId:  integer("promotion_type_id").notNull().references(() => promotionTypesTable.id, { onDelete: "restrict" }),
  promotionId:      integer("promotion_id").references(() => propertyPromotionsTable.id, { onDelete: "set null" }), // set on activation
  status:           text("status").notNull().default("pending"), // pending | active | expired | cancelled | rejected
  paymentMethod:    text("payment_method").notNull().default("manual_transfer"), // online | manual_transfer | wallet
  priceAtPurchase:  numeric("price_at_purchase", { precision: 10, scale: 2 }).notNull(),
  vatAmount:        numeric("vat_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount:      numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  durationDays:     integer("duration_days").notNull().default(7),  // snapshot at purchase time
  paymentReference: text("payment_reference"),       // bank transfer ref or online tx id
  adminNote:        text("admin_note"),               // rejection reason or approval note
  approvedAt:       timestamp("approved_at"),
  approvedBy:       integer("approved_by").references(() => usersTable.id, { onDelete: "set null" }),
  expiresAt:        timestamp("expires_at"),          // calculated on approval
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
}, (t) => [
  index("pp_purchases_user_id_idx").on(t.userId),
  index("pp_purchases_property_id_idx").on(t.propertyId),
  index("pp_purchases_status_idx").on(t.status),
  index("pp_purchases_created_at_idx").on(t.createdAt),
]);

export type PromotionPurchase = typeof promotionPurchasesTable.$inferSelect;
export type InsertPromotionPurchase = typeof promotionPurchasesTable.$inferInsert;
