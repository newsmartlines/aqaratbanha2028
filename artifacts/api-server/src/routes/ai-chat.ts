import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, chatbotQueriesTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql, desc } from "drizzle-orm";

const router = Router();

// ── In-memory rate limiter (30 req / 60s per IP) ────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 300_000);

// ── Arabic NLP Intent Extractor ─────────────────────────────────────────────
type Intent = {
  listingType?: "sale" | "rent";
  mainCategory?: "residential" | "commercial" | "land";
  subCategory?: string;
  minRooms?: number;
  maxRooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  location?: string;
  finishing?: string;
  furnished?: string;
  missing: string[];
};

const LOCATIONS = [
  "بنها", "القناطر الخيرية", "القناطر", "الخانكة", "شبين القناطر", "كفر شكر",
  "طوخ", "قليوب", "المرج", "أبو زعبل", "العبور", "الشروق", "العاشر من رمضان",
  "مدينة بدر", "الإسكندرية", "القاهرة", "الجيزة", "المنصورة", "الزقازيق",
  "بنها الجديدة", "وسط المدينة", "قليوبية",
];

const SUB_CATEGORIES: Record<string, string[]> = {
  شقة: ["شقق", "شقه", "اپارتمنت", "apartment"],
  دوبلكس: ["دوبلكس", "duplex"],
  روف: ["روف", "رووف", "سطح"],
  ستوديو: ["ستوديو", "studio"],
  فيلا: ["فيلا", "فيلل", "villa"],
  "دور أرضي": ["دور أرضي", "دور ارضي", "ارضي"],
  منزل: ["منزل", "بيت", "بيوت"],
  "توين هاوس": ["توين هاوس", "townhouse"],
  عمارة: ["عمارة", "عمارات", "بناية"],
  محل: ["محل", "محلات"],
  مكتب: ["مكتب", "مكاتب", "office"],
  "مستودع / مخزن": ["مستودع", "مخزن", "مخازن", "ورشة", "ورش", "هنجر"],
  أرض: ["أرض", "قطعة أرض", "قطعه ارض", "أراضي", "اراضي"],
};

const MAIN_CAT_MAP: Record<string, "residential" | "commercial" | "land"> = {
  شقة: "residential", دوبلكس: "residential", روف: "residential",
  ستوديو: "residential", فيلا: "residential", "دور أرضي": "residential",
  منزل: "residential", "توين هاوس": "residential", عمارة: "residential",
  محل: "commercial", مكتب: "commercial", "مستودع / مخزن": "commercial",
  أرض: "land",
};

function arabicToWestern(s: string): string {
  return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function parseIntent(msg: string): Intent {
  const t = arabicToWestern(msg.toLowerCase().trim());
  const intent: Intent = { missing: [] };

  if (/للإيجار|للايجار|إيجار|ايجار|أجار|اجار|يؤجر/.test(t)) intent.listingType = "rent";
  else if (/للبيع|بيع|يباع/.test(t)) intent.listingType = "sale";

  for (const [key, synonyms] of Object.entries(SUB_CATEGORIES)) {
    if (synonyms.some(s => t.includes(s)) || t.includes(key)) {
      intent.subCategory = key;
      intent.mainCategory = MAIN_CAT_MAP[key];
      break;
    }
  }
  if (!intent.mainCategory) {
    if (/سكني|شقة|سكن/.test(t)) intent.mainCategory = "residential";
    else if (/تجاري|تجارية/.test(t)) intent.mainCategory = "commercial";
    else if (/أرض|اراضي/.test(t)) intent.mainCategory = "land";
  }

  const roomMatch = t.match(/(\d+)\s*(?:غرف|أوضة|أوض|أوضه|غرفة|روم|rooms?)/);
  if (roomMatch) {
    const r = parseInt(roomMatch[1]);
    intent.minRooms = r;
    intent.maxRooms = r;
  }
  const roomRangeMatch = t.match(/(\d+)\s*(?:إلى|الى|ل|to|-)\s*(\d+)\s*(?:غرف|أوض)/);
  if (roomRangeMatch) {
    intent.minRooms = parseInt(roomRangeMatch[1]);
    intent.maxRooms = parseInt(roomRangeMatch[2]);
  }

  const priceAbbrev = t
    .replace(/(\d+(?:\.\d+)?)\s*مليون/g, (_, n) => String(parseFloat(n) * 1_000_000))
    .replace(/(\d+(?:\.\d+)?)\s*(?:الف|ألف)/g, (_, n) => String(parseFloat(n) * 1_000));

  const maxPriceMatch = priceAbbrev.match(/(?:أقل من|اقل من|تحت|حتى|ما يزيد عن|بحد أقصى|بحد اقصى|لا يتجاوز)\s*([\d,]+)/);
  if (maxPriceMatch) intent.maxPrice = parseFloat(maxPriceMatch[1].replace(/,/g, ""));

  const minPriceMatch = priceAbbrev.match(/(?:أكثر من|اكثر من|فوق|يزيد عن)\s*([\d,]+)/);
  if (minPriceMatch) intent.minPrice = parseFloat(minPriceMatch[1].replace(/,/g, ""));

  const betweenMatch = priceAbbrev.match(/(?:بين|من)\s*([\d,]+)\s*(?:و|الى|إلى|-|to)\s*([\d,]+)/);
  if (betweenMatch) {
    intent.minPrice = parseFloat(betweenMatch[1].replace(/,/g, ""));
    intent.maxPrice = parseFloat(betweenMatch[2].replace(/,/g, ""));
  }

  const plainPrice = priceAbbrev.match(/(?:بسعر|سعره|سعرها|يكلف|تكلف|ب)\s*([\d,]+)/);
  if (plainPrice) {
    const p = parseFloat(plainPrice[1].replace(/,/g, ""));
    intent.minPrice = p * 0.8;
    intent.maxPrice = p * 1.2;
  }

  const areaMatch = t.match(/(\d+)\s*(?:متر|م²|م2|مترمربع|sqm)/);
  if (areaMatch) {
    const a = parseInt(areaMatch[1]);
    intent.minArea = a * 0.7;
    intent.maxArea = a * 1.3;
  }
  const areaRangeMatch = t.match(/(?:من|بين)\s*(\d+)\s*(?:الى|إلى|-)\s*(\d+)\s*(?:متر|م)/);
  if (areaRangeMatch) {
    intent.minArea = parseInt(areaRangeMatch[1]);
    intent.maxArea = parseInt(areaRangeMatch[2]);
  }

  for (const loc of LOCATIONS) {
    if (t.includes(loc.toLowerCase())) {
      intent.location = loc;
      break;
    }
  }

  if (/مشطب|تشطيب كامل|تشطيب تام/.test(t)) intent.finishing = "مشطب";
  else if (/نص تشطيب|نصف تشطيب/.test(t)) intent.finishing = "نص تشطيب";
  else if (/خام|بدون تشطيب/.test(t)) intent.finishing = "خام";

  if (/مفروش|مفروشة|مؤثث/.test(t)) intent.furnished = "مفروش";
  else if (/غير مفروش|فاضي/.test(t)) intent.furnished = "غير مفروش";

  return intent;
}

function buildResponseText(intent: Intent, count: number): string {
  if (count === 0) {
    return "معنديش نتائج بالضبط. جرب توسّع نطاق البحث أو اسألني بطريقة مختلفة.";
  }
  const typeLabel = intent.listingType === "sale" ? "للبيع" : intent.listingType === "rent" ? "للإيجار" : "";
  const catLabel = intent.subCategory ?? (intent.mainCategory === "land" ? "أرض" : intent.mainCategory === "commercial" ? "عقار تجاري" : "عقار");
  const locLabel = intent.location ? ` في ${intent.location}` : "";
  return `وجدت ${count} ${catLabel} ${typeLabel}${locLabel}:`;
}

async function trackQuery(query: string, resultCount: number) {
  try {
    const normalized = query.trim().toLowerCase().slice(0, 200);
    const existing = await db.select().from(chatbotQueriesTable).where(eq(chatbotQueriesTable.query, normalized)).limit(1);
    if (existing.length > 0) {
      await db.update(chatbotQueriesTable)
        .set({ count: existing[0].count + 1, resultCount, updatedAt: new Date() })
        .where(eq(chatbotQueriesTable.id, existing[0].id));
    } else {
      await db.insert(chatbotQueriesTable).values({ query: normalized, count: 1, resultCount });
    }
  } catch {}
}

// ── POST /api/ai-chat ───────────────────────────────────────────────────────
router.post("/ai-chat", async (req, res) => {
  const ip = String(req.ip ?? (req.socket as any)?.remoteAddress ?? "anon");
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ reply: "أرسلت كثيراً من الرسائل. انتظر دقيقة ثم حاول مجدداً.", properties: [] });
  }

  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) {
      return res.json({ reply: "أرسل رسالتك وأنا هساعدك!", properties: [] });
    }

    const intent = parseIntent(message);

    const conditions: ReturnType<typeof eq>[] = [eq(propertiesTable.status, "active") as any];
    if (intent.listingType) conditions.push(eq(propertiesTable.listingType, intent.listingType) as any);
    if (intent.mainCategory) conditions.push(eq(propertiesTable.mainCategory, intent.mainCategory) as any);
    if (intent.subCategory) conditions.push(ilike(propertiesTable.subCategory, `%${intent.subCategory}%`) as any);
    if (intent.minRooms !== undefined) conditions.push(gte(propertiesTable.rooms, intent.minRooms) as any);
    if (intent.maxRooms !== undefined) conditions.push(lte(propertiesTable.rooms, intent.maxRooms) as any);
    if (intent.minPrice !== undefined) conditions.push(gte(propertiesTable.price, String(intent.minPrice)) as any);
    if (intent.maxPrice !== undefined) conditions.push(lte(propertiesTable.price, String(intent.maxPrice)) as any);
    if (intent.minArea !== undefined) conditions.push(gte(propertiesTable.area, String(intent.minArea)) as any);
    if (intent.maxArea !== undefined) conditions.push(lte(propertiesTable.area, String(intent.maxArea)) as any);
    if (intent.location) {
      conditions.push(or(
        ilike(propertiesTable.address, `%${intent.location}%`),
        ilike(propertiesTable.district, `%${intent.location}%`),
        ilike(propertiesTable.title, `%${intent.location}%`),
      ) as any);
    }
    if (intent.finishing) conditions.push(ilike(propertiesTable.finishing, `%${intent.finishing}%`) as any);
    if (intent.furnished) conditions.push(ilike(propertiesTable.furnished, `%${intent.furnished}%`) as any);

    let properties = await db
      .select()
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
      .limit(6);

    if (properties.length === 0 && conditions.length > 2) {
      const fallback: any[] = [eq(propertiesTable.status, "active")];
      if (intent.listingType) fallback.push(eq(propertiesTable.listingType, intent.listingType));
      if (intent.mainCategory) fallback.push(eq(propertiesTable.mainCategory, intent.mainCategory));
      properties = await db
        .select()
        .from(propertiesTable)
        .where(and(...fallback))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(6);
    }

    trackQuery(message, properties.length);

    const mapped = properties.map(p => {
      let imgs: string[] = [];
      try { imgs = JSON.parse(p.images ?? "[]"); } catch {}
      return {
        id: p.id, title: p.title,
        price: p.price ? Number(p.price).toLocaleString("ar-EG") + " ج.م" : "السعر عند التواصل",
        priceNum: p.price ? Number(p.price) : 0,
        image: imgs[0] ?? "",
        location: [p.district, p.address].filter(Boolean).join("، ") || "بنها",
        beds: p.rooms ?? 0, baths: p.bathrooms ?? 0,
        area: p.area ? Number(p.area) : 0,
        type: p.listingType ?? "", kind: p.subCategory ?? p.mainCategory ?? "",
        featured: p.featured ?? false,
      };
    });

    return res.json({ reply: buildResponseText(intent, properties.length), properties: mapped, intent });
  } catch (err) {
    console.error("[ai-chat]", err);
    return res.status(500).json({ reply: "حصل خطأ، جرب تاني من فضلك.", properties: [] });
  }
});

// ── GET /api/ai-autocomplete?q= ─────────────────────────────────────────────
router.get("/ai-autocomplete", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      const top = await db.select().from(chatbotQueriesTable).orderBy(desc(chatbotQueriesTable.count)).limit(8);
      return res.json(top.map(r => r.query));
    }
    const results = await db.select().from(chatbotQueriesTable)
      .where(ilike(chatbotQueriesTable.query, `%${q}%`))
      .orderBy(desc(chatbotQueriesTable.count))
      .limit(6);
    return res.json(results.map(r => r.query));
  } catch {
    return res.json([]);
  }
});

// ── GET /api/chatbot-trending ────────────────────────────────────────────────
router.get("/chatbot-trending", async (req, res) => {
  try {
    const [queries, featuredProps] = await Promise.all([
      db.select().from(chatbotQueriesTable).orderBy(desc(chatbotQueriesTable.count)).limit(6),
      db.select().from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.featured, true)))
        .orderBy(desc(propertiesTable.viewCount))
        .limit(4),
    ]);

    const mappedProps = featuredProps.map(p => {
      let imgs: string[] = [];
      try { imgs = JSON.parse(p.images ?? "[]"); } catch {}
      return {
        id: p.id, title: p.title,
        price: p.price ? Number(p.price).toLocaleString("ar-EG") + " ج.م" : "السعر عند التواصل",
        image: imgs[0] ?? "",
        location: [p.district, p.address].filter(Boolean).join("، ") || "بنها",
        beds: p.rooms ?? 0, baths: p.bathrooms ?? 0,
        area: p.area ? Number(p.area) : 0,
        type: p.listingType ?? "", kind: p.subCategory ?? p.mainCategory ?? "",
        featured: p.featured ?? false,
      };
    });

    return res.json({ popularQueries: queries.map(q => q.query), featuredProperties: mappedProps });
  } catch {
    return res.json({ popularQueries: [], featuredProperties: [] });
  }
});

export default router;
