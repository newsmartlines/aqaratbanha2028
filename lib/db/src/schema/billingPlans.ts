import { pgTable, serial, text, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";

export const billingPlansTable = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("SAR"),
  durationDays: integer("duration_days").notNull().default(30),
  durationType: text("duration_type").notNull().default("monthly"),
  userType: text("user_type").notNull().default("all"),
  status: text("status").notNull().default("active"),
  isRecommended: boolean("is_recommended").default(false),
  isMostPopular: boolean("is_most_popular").default(false),
  trialDays: integer("trial_days").default(0),
  sortOrder: integer("sort_order").default(0),
  color: text("color").default("#0d9488"),
  limits: text("limits").default("{}"),
  features: text("features").default("{}"),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).default("10"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissionRulesTable = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("10"),
  isPercentage: boolean("is_percentage").default(true),
  appliesTo: text("applies_to").default("all"),
  userType: text("user_type").default("all"),
  planId: integer("plan_id"),
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  discountType: text("discount_type").notNull().default("percentage"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  minAmount: numeric("min_amount", { precision: 10, scale: 2 }),
  applicablePlans: text("applicable_plans").default("[]"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BillingPlan = typeof billingPlansTable.$inferSelect;
export type CommissionRule = typeof commissionRulesTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
