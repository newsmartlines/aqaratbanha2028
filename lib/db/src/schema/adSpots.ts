import {
  pgTable, serial, text, boolean, integer, timestamp, numeric, index,
} from "drizzle-orm/pg-core";

/* ─── Ad Spots (main ad units) ─────────────────────────────────────────── */
export const adSpotsTable = pgTable("ad_spots", {
  id: serial("id").primaryKey(),

  // Basic identity
  name:       text("name").notNull(),
  position:   text("position").notNull(),
  isActive:   boolean("is_active").default(false).notNull(),
  sortOrder:  integer("sort_order").default(0),

  // Content type — what kind of ad this is
  // banner | html | adsense | admanager | javascript | internal
  contentType: text("content_type").default("banner").notNull(),

  // Display layout (visual shape regardless of content type)
  // leaderboard | box | native
  displayType: text("display_type").default("leaderboard").notNull(),

  // ── Banner / Internal fields ────────────────────────────────────────────
  title:       text("title"),
  subtitle:    text("subtitle"),
  imageUrl:    text("image_url"),
  linkUrl:     text("link_url"),
  linkTarget:  text("link_target").default("_blank"),
  bgColor:     text("bg_color").default("#0d9488"),
  textColor:   text("text_color").default("#ffffff"),
  badgeText:   text("badge_text"),
  buttonText:  text("button_text"),

  // ── Raw HTML ─────────────────────────────────────────────────────────────
  customHtml: text("custom_html"),

  // ── Custom JavaScript ────────────────────────────────────────────────────
  customJs: text("custom_js"),

  // ── Google AdSense ───────────────────────────────────────────────────────
  adsensePublisherId: text("adsense_publisher_id"),   // pub-XXXXXXXXXXXXXXXX
  adsenseSlotId:      text("adsense_slot_id"),         // slot numeric id
  adsenseFormat:      text("adsense_format").default("auto"),   // auto|rectangle|vertical|horizontal
  adsenseResponsive:  boolean("adsense_responsive").default(true),
  adsenseAutoAds:     boolean("adsense_auto_ads").default(false),

  // ── Google Ad Manager ────────────────────────────────────────────────────
  admNetworkId: text("adm_network_id"),        // /12345678
  admUnitId:    text("adm_unit_id"),           // /12345678/unit_name
  admSizes:     text("adm_sizes"),             // JSON: [[728,90],[970,250]]

  // ── Targeting (stored as JSON arrays) ───────────────────────────────────
  targetGovernorates:      text("target_governorates"),     // JSON int[]  (region ids)
  targetCities:            text("target_cities"),           // JSON int[]
  targetCategories:        text("target_categories"),       // JSON string[] (slugs)
  targetPropertyTypes:     text("target_property_types"),   // JSON string[]
  targetListingType:       text("target_listing_type").default("both"),  // sale|rent|both
  targetLanguage:          text("target_language").default("both"),       // ar|en|both
  targetDevices:           text("target_devices"),          // JSON: ["desktop","tablet","mobile"]
  targetUserType:          text("target_user_type").default("all"),       // all|logged_in|guests
  targetSubscriptionPlans: text("target_subscription_plans"), // JSON int[]

  // ── Scheduling ───────────────────────────────────────────────────────────
  scheduleStartDate:  timestamp("schedule_start_date"),
  scheduleEndDate:    timestamp("schedule_end_date"),
  scheduleTimeFrom:   text("schedule_time_from"),   // "08:00"
  scheduleTimeTo:     text("schedule_time_to"),     // "22:00"
  scheduleAutoEnable: boolean("schedule_auto_enable").default(false),

  // ── Rotation & Priority ──────────────────────────────────────────────────
  priority:            integer("priority").default(5),          // 1–10
  weight:              integer("weight").default(100),
  frequencyCap:        integer("frequency_cap"),                // max impressions
  frequencyCapPeriod:  text("frequency_cap_period").default("day"), // hour|day|week|month
  rotationType:        text("rotation_type").default("weighted"),   // weighted|random|sequential
  fallbackAdId:        integer("fallback_ad_id"),

  // ── A/B Testing ──────────────────────────────────────────────────────────
  abTestGroupId: text("ab_test_group_id"),
  abTestVariant: text("ab_test_variant"),  // A|B|C

  // ── Statistics ───────────────────────────────────────────────────────────
  impressions:     integer("impressions").default(0),
  clicks:          integer("clicks").default(0),
  revenue:         numeric("revenue", { precision: 12, scale: 4 }).default("0"),
  lastImpression:  timestamp("last_impression"),
  lastClick:       timestamp("last_click"),

  // ── Advertiser link ──────────────────────────────────────────────────────
  advertiserId: integer("advertiser_id"),
  campaignId:   integer("campaign_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("ad_spots_position_idx").on(t.position),
  index("ad_spots_is_active_idx").on(t.isActive),
  index("ad_spots_content_type_idx").on(t.contentType),
  index("ad_spots_advertiser_idx").on(t.advertiserId),
]);

/* ─── Advertiser Accounts ──────────────────────────────────────────────── */
export const adAdvertisersTable = pgTable("ad_advertisers", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  email:       text("email").notNull().unique(),
  phone:       text("phone"),
  company:     text("company"),
  website:     text("website"),
  // pending | active | suspended | rejected
  status:      text("status").default("pending").notNull(),
  balance:     numeric("balance", { precision: 12, scale: 2 }).default("0"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

/* ─── Ad Campaigns ─────────────────────────────────────────────────────── */
export const adCampaignsTable = pgTable("ad_campaigns", {
  id:           serial("id").primaryKey(),
  advertiserId: integer("advertiser_id").notNull(),
  name:         text("name").notNull(),
  description:  text("description"),
  budget:       numeric("budget", { precision: 12, scale: 2 }).default("0"),
  spent:        numeric("spent", { precision: 12, scale: 2 }).default("0"),
  // draft | pending | active | paused | completed | cancelled
  status:       text("status").default("draft").notNull(),
  startDate:    timestamp("start_date"),
  endDate:      timestamp("end_date"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("ad_campaigns_advertiser_idx").on(t.advertiserId),
  index("ad_campaigns_status_idx").on(t.status),
]);

/* ─── Ad Invoices ──────────────────────────────────────────────────────── */
export const adInvoicesTable = pgTable("ad_invoices", {
  id:           serial("id").primaryKey(),
  advertiserId: integer("advertiser_id").notNull(),
  campaignId:   integer("campaign_id"),
  invoiceNo:    text("invoice_no").notNull().unique(),
  amount:       numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:     text("currency").default("EGP").notNull(),
  // pending | paid | overdue | cancelled
  status:       text("status").default("pending").notNull(),
  dueDate:      timestamp("due_date"),
  paidAt:       timestamp("paid_at"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ad_invoices_advertiser_idx").on(t.advertiserId),
  index("ad_invoices_status_idx").on(t.status),
]);

/* ─── Ad Events (detailed tracking per impression/click) ───────────────── */
export const adEventsTable = pgTable("ad_events", {
  id:         serial("id").primaryKey(),
  adSpotId:   integer("ad_spot_id").notNull(),
  eventType:  text("event_type").notNull(),   // impression | click
  userId:     integer("user_id"),
  sessionId:  text("session_id"),
  deviceType: text("device_type"),            // desktop | tablet | mobile
  governorate: text("governorate"),
  city:       text("city"),
  userAgent:  text("user_agent"),
  ipHash:     text("ip_hash"),               // hashed IP for privacy
  revenue:    numeric("revenue", { precision: 12, scale: 4 }).default("0"),
  abVariant:  text("ab_variant"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ad_events_ad_spot_idx").on(t.adSpotId),
  index("ad_events_type_idx").on(t.eventType),
  index("ad_events_created_idx").on(t.createdAt),
]);

export type AdSpot        = typeof adSpotsTable.$inferSelect;
export type InsertAdSpot  = typeof adSpotsTable.$inferInsert;
export type AdAdvertiser  = typeof adAdvertisersTable.$inferSelect;
export type AdCampaign    = typeof adCampaignsTable.$inferSelect;
export type AdInvoice     = typeof adInvoicesTable.$inferSelect;
export type AdEvent       = typeof adEventsTable.$inferSelect;
