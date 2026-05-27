import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { propertiesTable } from "./properties";
import { usersTable } from "./users";
import { billingPlansTable } from "./billingPlans";

// ── property_promotions ──────────────────────────────────────────────────────
// Tracks every active or historical promotion for a specific property.
// source=plan → consumed from subscription quota
// source=addon → consumed from addon_boosts purchase
// source=manual → set by admin directly
export const propertyPromotionsTable = pgTable("property_promotions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => propertiesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),                     // bump | featured | spotlight
  source: text("source").notNull().default("plan"),  // plan | addon | manual
  boostScore: integer("boost_score").default(0),    // computed weight for ranking
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("pp_property_id_idx").on(t.propertyId),
  index("pp_user_id_idx").on(t.userId),
  index("pp_is_active_idx").on(t.isActive),
  index("pp_type_idx").on(t.type),
  index("pp_expires_at_idx").on(t.expiresAt),
]);

// ── promotion_quotas ─────────────────────────────────────────────────────────
// Monthly usage counters per user, tied to their active billing plan.
// One row per (userId, month) — upserted on every promotion action.
export const promotionQuotasTable = pgTable("promotion_quotas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  billingPlanId: integer("billing_plan_id").references(() => billingPlansTable.id, { onDelete: "set null" }),
  month: text("month").notNull(),         // YYYY-MM (UTC)
  bumpUpsUsed: integer("bump_ups_used").default(0),
  featuredUsed: integer("featured_used").default(0),
  spotlightUsed: integer("spotlight_used").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("pq_user_month_idx").on(t.userId, t.month),
]);

// ── addon_boosts ─────────────────────────────────────────────────────────────
// Extra promotion credits the user purchased or was granted by admin.
// These stack on top of the plan's monthly quota.
export const addonBoostsTable = pgTable("addon_boosts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),           // bump | featured | spotlight
  quantity: integer("quantity").notNull(),
  remaining: integer("remaining").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  note: text("note"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("ab_user_id_idx").on(t.userId),
  index("ab_type_idx").on(t.type),
]);

export type PropertyPromotion = typeof propertyPromotionsTable.$inferSelect;
export type PromotionQuota = typeof promotionQuotasTable.$inferSelect;
export type AddonBoost = typeof addonBoostsTable.$inferSelect;
