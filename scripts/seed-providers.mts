/**
 * One-time script: seed providers (users + provider rows) then run seedProperties.
 * Run with: pnpm --filter @workspace/api-server exec tsx ../../scripts/seed-providers.mts
 */
import bcrypt from "bcryptjs";
import { db } from "../../lib/db/index.js";
import {
  usersTable,
  providersTable,
  subscriptionsTable,
  billingPlansTable,
} from "../../lib/db/schema.js";
import { seedProperties } from "../artifacts/api-server/src/lib/seed.js";

// Check if providers already exist
const existing = await db.select({ id: providersTable.id }).from(providersTable).limit(1);
if (existing.length > 0) {
  console.log("✓ Providers already exist, running seedProperties only...");
  await seedProperties();
  console.log("✅ Done!");
  process.exit(0);
}

console.log("⏳ Seeding providers...");

const plans = await db.select().from(billingPlansTable).limit(1);
const planId = plans[0]?.id;

const providerData = [
  { name: "أحمد عبدالله", email: "ahmed@aqaralex.com", city: "سيدي جابر", bio: "سمسار عقارات محترف بخبرة 10 سنوات في الإسكندرية", rating: "4.9", featured: true, verified: true },
  { name: "سارة الغامدي", email: "sara@aqaralex.com", city: "سموحة", bio: "خبيرة تسويق عقاري ومستشارة مبيعات في الإسكندرية", rating: "4.8", featured: true, verified: true },
  { name: "نواف العتيبي", email: "nawaf@aqaralex.com", city: "المنتزه", bio: "وسيط عقاري متخصص في عقارات الإسكندرية", rating: "4.7", featured: false, verified: true },
  { name: "أم خالد", email: "oumkhalid@aqaralex.com", city: "كليوباترا", bio: "وسيطة عقارية ومتخصصة في عقارات محافظة الإسكندرية", rating: "4.9", featured: true, verified: true },
  { name: "منى الشهري", email: "mona@aqaralex.com", city: "لوران", bio: "مستشارة عقارية ومتخصصة في الاستثمار العقاري بالإسكندرية", rating: "4.6", featured: false, verified: true },
  { name: "هنود القرني", email: "hanood@aqaralex.com", city: "الشاطبي", bio: "وسيط عقاري خبرة 7 سنوات في بيع وإيجار الشقق بالإسكندرية", rating: "4.8", featured: true, verified: true },
];

const passHash = await bcrypt.hash("provider123", 10);
for (const p of providerData) {
  const [user] = await db
    .insert(usersTable)
    .values({ name: p.name, email: p.email, passwordHash: passHash, role: "provider" })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log(`  ⚠ User ${p.email} already exists, skipping`);
    continue;
  }

  const [provider] = await db
    .insert(providersTable)
    .values({
      userId: user.id,
      bio: p.bio,
      city: p.city,
      rating: p.rating,
      reviewsCount: Math.floor(Math.random() * 80) + 10,
      verified: p.verified,
      featured: p.featured,
      approved: true,
    })
    .returning();

  if (planId) {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    await db
      .insert(subscriptionsTable)
      .values({ providerId: provider.id, planId, startDate: now, endDate: end, status: "active" })
      .onConflictDoNothing();
  }

  console.log(`  ✓ Created provider: ${p.name}`);
}

console.log("⏳ Seeding properties...");
await seedProperties();
console.log("✅ Done!");
