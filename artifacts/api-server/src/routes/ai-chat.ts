import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, chatbotQueriesTable, siteSettingsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql, desc, ne } from "drizzle-orm";

const router = Router();

// ── In-memory rate limiter (40 req / 60s per IP) ────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 40) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 300_000);

// ── Load chatbot settings from DB ─────────────────────────────────────────────
async function getChatbotSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(siteSettingsTable)
      .where(sql`${siteSettingsTable.key} LIKE 'chatbot%'`);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value ?? "";
    return map;
  } catch { return {}; }
}

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
  isGreeting?: boolean;
  isMarketQuery?: boolean;
  isPriceQuery?: boolean;
  isHelpQuery?: boolean;
  missing: string[];
};

const LOCATIONS = [
  "بنها", "القناطر الخيرية", "القناطر", "الخانكة", "شبين القناطر", "كفر شكر",
  "طوخ", "قليوب", "المرج", "أبو زعبل", "العبور", "الشروق", "العاشر من رمضان",
  "مدينة بدر", "الإسكندرية", "القاهرة", "الجيزة", "المنصورة", "الزقازيق",
  "بنها الجديدة", "وسط المدينة", "قليوبية", "شبرا", "مشتول", "الوقف",
];

const SUB_CATEGORIES: Record<string, string[]> = {
  شقة: ["شقق", "شقه", "شقتين", "شقة", "اپارتمنت", "apartment", "اپارتمنتات"],
  دوبلكس: ["دوبلكس", "duplex", "دوبليكس"],
  روف: ["روف", "رووف", "سطح", "بنتهاوس"],
  ستوديو: ["ستوديو", "studio", "غرفة وصالة"],
  فيلا: ["فيلا", "فيلل", "فيلات", "villa", "فيلتين"],
  "دور أرضي": ["دور أرضي", "دور ارضي", "ارضي", "طابق أرضي"],
  منزل: ["منزل", "بيت", "بيوت", "house"],
  "توين هاوس": ["توين هاوس", "townhouse", "تاون هاوس"],
  عمارة: ["عمارة", "عمارات", "بناية", "مبنى"],
  محل: ["محل", "محلات", "shop", "محل تجاري"],
  مكتب: ["مكتب", "مكاتب", "office", "مكتب إداري"],
  "مستودع / مخزن": ["مستودع", "مخزن", "مخازن", "ورشة", "ورش", "هنجر", "مصنع"],
  أرض: ["أرض", "قطعة أرض", "قطعه ارض", "أراضي", "اراضي", "land"],
};

const MAIN_CAT_MAP: Record<string, "residential" | "commercial" | "land"> = {
  شقة: "residential", دوبلكس: "residential", روف: "residential",
  ستوديو: "residential", فيلا: "residential", "دور أرضي": "residential",
  منزل: "residential", "توين هاوس": "residential", عمارة: "residential",
  محل: "commercial", مكتب: "commercial", "مستودع / مخزن": "commercial",
  أرض: "land",
};

const GREETING_PATTERNS = /^(أهلاً|أهلا|مرحبا|مرحباً|السلام|هلا|هلو|hi|hello|سلام|صباح الخير|مساء الخير|صباح النور|مساء النور|كيف حالك|ازيك|ازيكم|إيه الأخبار|ايه الاخبار|تمام|عامل ايه|شكر|شكراً|ممتاز|تسلم|يسلموا|باي|وداع|مع السلامة)$/i;
const MARKET_QUERY = /عندك إيه|عندكم ايه|ايه عندكم|ماعندكم|عقارات متاحة|عقارات موجودة|شوفلي|اعرض|اعرضلي|كل العقارات|جميع العقارات|إيه المتاح|ما هو متاح/;
const PRICE_QUERY = /أسعار|اسعار|تكلف كام|بكام|سعر|تكاليف|سعر الشقق|سعر الفلل|سعر الأراضي|كام المتر|ميزانية/;
const HELP_QUERY = /مساعدة|ساعدني|كيف|إزاي|ازاي|تقدر تعمل إيه|بتعمل إيه|قادر تعمل ايه|ايه اللي بتعمله/;

function arabicToWestern(s: string): string {
  return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// Extract intent from last context message if current message is partial (e.g. just a location)
function mergeWithContext(current: Intent, prev?: Intent): Intent {
  if (!prev) return current;
  const merged = { ...current };
  if (!merged.listingType && prev.listingType) merged.listingType = prev.listingType;
  if (!merged.mainCategory && prev.mainCategory) merged.mainCategory = prev.mainCategory;
  if (!merged.subCategory && prev.subCategory) merged.subCategory = prev.subCategory;
  if (!merged.location && prev.location) merged.location = prev.location;
  if (!merged.minPrice && prev.minPrice) merged.minPrice = prev.minPrice;
  if (!merged.maxPrice && prev.maxPrice) merged.maxPrice = prev.maxPrice;
  if (!merged.minRooms && prev.minRooms) merged.minRooms = prev.minRooms;
  if (!merged.maxRooms && prev.maxRooms) merged.maxRooms = prev.maxRooms;
  return merged;
}

export function parseIntent(msg: string): Intent {
  const t = arabicToWestern(msg.toLowerCase().trim());
  const intent: Intent = { missing: [] };

  // Detect special query types
  if (GREETING_PATTERNS.test(t.trim())) { intent.isGreeting = true; return intent; }
  if (MARKET_QUERY.test(t)) { intent.isMarketQuery = true; }
  if (PRICE_QUERY.test(t) && !intent.isMarketQuery) { intent.isPriceQuery = true; }
  if (HELP_QUERY.test(t)) { intent.isHelpQuery = true; return intent; }

  // Listing type
  if (/للإيجار|للايجار|إيجار|ايجار|أجار|اجار|يؤجر|بالإيجار|بالايجار/.test(t)) intent.listingType = "rent";
  else if (/للبيع|بيع|يباع|بيعها|بيعه/.test(t)) intent.listingType = "sale";

  // Sub-category detection
  for (const [key, synonyms] of Object.entries(SUB_CATEGORIES)) {
    if (synonyms.some(s => t.includes(s)) || t.includes(key)) {
      intent.subCategory = key;
      intent.mainCategory = MAIN_CAT_MAP[key];
      break;
    }
  }
  if (!intent.mainCategory) {
    if (/سكني|شقة|سكن|سكنية/.test(t)) intent.mainCategory = "residential";
    else if (/تجاري|تجارية|تجارى/.test(t)) intent.mainCategory = "commercial";
    else if (/أرض|اراضي/.test(t)) intent.mainCategory = "land";
  }

  // Rooms
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

  // Price - replace Arabic abbreviations
  const priceAbbrev = t
    .replace(/(\d+(?:\.\d+)?)\s*مليون/g, (_, n) => String(parseFloat(n) * 1_000_000))
    .replace(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|k)/g, (_, n) => String(parseFloat(n) * 1_000));

  const maxPriceMatch = priceAbbrev.match(/(?:أقل من|اقل من|تحت|حتى|ما يزيد عن|بحد أقصى|لا يتجاوز|ميزانيتي)\s*([\d,]+)/);
  if (maxPriceMatch) intent.maxPrice = parseFloat(maxPriceMatch[1].replace(/,/g, ""));

  const minPriceMatch = priceAbbrev.match(/(?:أكثر من|اكثر من|فوق|يزيد عن|يبدأ من)\s*([\d,]+)/);
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

  // Area
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

  // Location
  for (const loc of LOCATIONS) {
    if (t.includes(loc.toLowerCase())) {
      intent.location = loc;
      break;
    }
  }

  // Finishing
  if (/مشطب|تشطيب كامل|تشطيب تام|كامل التشطيب/.test(t)) intent.finishing = "مشطب";
  else if (/نص تشطيب|نصف تشطيب/.test(t)) intent.finishing = "نص تشطيب";
  else if (/خام|بدون تشطيب|بدن تشطيب/.test(t)) intent.finishing = "خام";

  // Furnished
  if (/مفروش|مفروشة|مؤثث|فرنيتشر/.test(t)) intent.furnished = "مفروش";
  else if (/غير مفروش|فاضي|فاضية/.test(t)) intent.furnished = "غير مفروش";

  return intent;
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " مليون";
  if (n >= 1_000) return Math.round(n / 1_000) + " ألف";
  return n.toLocaleString("ar-EG");
}

function buildResponseText(intent: Intent, count: number, fallbackUsed = false): string {
  if (count === 0) return "";
  const typeLabel = intent.listingType === "sale" ? "للبيع" : intent.listingType === "rent" ? "للإيجار" : "";
  const catLabel = intent.subCategory ?? (
    intent.mainCategory === "land" ? "أرض" :
    intent.mainCategory === "commercial" ? "عقار تجاري" :
    intent.mainCategory === "residential" ? "عقار سكني" : "عقار"
  );
  const locLabel = intent.location ? ` في ${intent.location}` : "";
  const roomLabel = intent.minRooms && intent.minRooms === intent.maxRooms ? ` (${intent.minRooms} غرف)` : "";
  const note = fallbackUsed ? " (عرضت أقرب النتائج لبحثك)" : "";
  return `وجدت **${count}** ${catLabel} ${typeLabel}${locLabel}${roomLabel}${note}:`;
}

async function trackQuery(query: string, resultCount: number) {
  try {
    const normalized = query.trim().toLowerCase().slice(0, 200);
    if (normalized.length < 3) return;
    const existing = await db.select().from(chatbotQueriesTable)
      .where(eq(chatbotQueriesTable.query, normalized)).limit(1);
    if (existing.length > 0) {
      await db.update(chatbotQueriesTable)
        .set({ count: existing[0].count + 1, resultCount, updatedAt: new Date() })
        .where(eq(chatbotQueriesTable.id, existing[0].id));
    } else {
      await db.insert(chatbotQueriesTable).values({ query: normalized, count: 1, resultCount });
    }
  } catch {}
}

function mapProperty(p: any) {
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
}

// ── Greetings ─────────────────────────────────────────────────────────────────
const GREETING_RESPONSES = [
  "أهلاً وسهلاً! 😊\nأنا مساعدك الذكي لعقارات بنها. أخبرني بما تبحث عنه وسأجد لك أفضل الخيارات.\n\nمثال: \"شقة 3 غرف للبيع في بنها\" أو \"أرض للبيع بسعر مناسب\"",
  "مرحباً بك! 🏠\nيسعدني مساعدتك في إيجاد عقارك المثالي.\nأخبرني: ما نوع العقار الذي تبحث عنه؟",
  "أهلاً! سعيد بتواجدك معنا 😊\nيمكنني مساعدتك في البحث عن شقق، فيلات، أراضي، ومحلات تجارية.\nبماذا يمكنني خدمتك؟",
];

const HELP_RESPONSE = `يمكنني مساعدتك في:
🏠 **البحث عن عقارات** — شقق، فيلات، أراضي، محلات
📍 **البحث بالموقع** — بنها، القناطر، قليوب، طوخ، الخانكة
💰 **البحث بالسعر** — "شقة بأقل من مليون" أو "بين 500 ألف ومليون"
🛏️ **البحث بعدد الغرف** — "شقة 3 غرف"
📐 **البحث بالمساحة** — "شقة 120 متر"

جرب: "شقة 3 غرف للبيع في بنها بأقل من مليون ومية"`;

// ── POST /api/ai-chat ─────────────────────────────────────────────────────────
router.post("/ai-chat", async (req, res) => {
  const ip = String(req.ip ?? (req.socket as any)?.remoteAddress ?? "anon");
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ reply: "أرسلت كثيراً من الرسائل. انتظر دقيقة ثم حاول مجدداً.", properties: [] });
  }

  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: Array<{ role: "user" | "bot"; text: string; intent?: Intent }>;
    };

    if (!message?.trim()) {
      return res.json({ reply: "أرسل رسالتك وأنا هساعدك!", properties: [] });
    }

    // Load settings
    const settings = await getChatbotSettings();
    const fallbackMsg = settings.chatbotFallbackMsg || "معنديش نتائج مطابقة تماماً، بس هحاول أعرضلك أقرب الخيارات.";
    const whatsapp = settings.chatbotWhatsapp || "";

    // Parse current intent
    const intent = parseIntent(message);

    // Handle greetings
    if (intent.isGreeting) {
      const reply = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
      return res.json({ reply, properties: [], intent, suggestions: ["شقة للبيع في بنها", "فيلا للبيع", "أرض للبيع", "شقة للإيجار"] });
    }

    // Handle help
    if (intent.isHelpQuery) {
      return res.json({ reply: HELP_RESPONSE, properties: [], intent });
    }

    // Extract previous intent from history for context merging
    const prevUserTurns = history.filter(h => h.role === "user" && h.intent);
    const prevIntent: Intent | undefined = prevUserTurns.length > 0
      ? prevUserTurns[prevUserTurns.length - 1].intent
      : undefined;

    // Merge context if current message adds info to previous search
    const hasStandaloneInfo = intent.listingType || intent.mainCategory || intent.subCategory ||
      intent.minPrice || intent.maxPrice || intent.minRooms;
    const enrichedIntent = (prevIntent && !hasStandaloneInfo)
      ? mergeWithContext(intent, prevIntent)
      : intent;

    // Handle market/price queries
    if (intent.isMarketQuery || intent.isPriceQuery) {
      const allProps = await db.select().from(propertiesTable)
        .where(and(
          eq(propertiesTable.status, "active"),
          ...(enrichedIntent.mainCategory ? [eq(propertiesTable.mainCategory, enrichedIntent.mainCategory) as any] : []),
          ...(enrichedIntent.listingType ? [eq(propertiesTable.listingType, enrichedIntent.listingType) as any] : []),
        ))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(50);

      if (allProps.length === 0) {
        return res.json({ reply: "مش لاقي عقارات متاحة دلوقتي. جرب تاني لاحقاً.", properties: [] });
      }

      const prices = allProps.map(p => Number(p.price)).filter(p => p > 0);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;

      const catLabel = enrichedIntent.subCategory ?? (
        enrichedIntent.mainCategory === "land" ? "الأراضي" :
        enrichedIntent.mainCategory === "commercial" ? "العقارات التجارية" : "العقارات السكنية"
      );
      const typeLabel = enrichedIntent.listingType === "sale" ? "للبيع" : enrichedIntent.listingType === "rent" ? "للإيجار" : "";

      const reply = `📊 **إحصائيات ${catLabel} ${typeLabel}:**\n\n` +
        `• إجمالي المتاح: **${allProps.length}** عقار\n` +
        `• أقل سعر: **${formatPrice(minP)} ج.م**\n` +
        `• أعلى سعر: **${formatPrice(maxP)} ج.م**\n` +
        `• متوسط السعر: **${formatPrice(Math.round(avgP))} ج.م**\n\n` +
        `اختر من أفضل العروض المتاحة:`;

      const featured = allProps.slice(0, 6).map(mapProperty);
      return res.json({ reply, properties: featured, intent: enrichedIntent });
    }

    // ── Main property search ──────────────────────────────────────────────────
    const buildConditions = (i: Intent, strict = true) => {
      const c: any[] = [eq(propertiesTable.status, "active")];
      if (i.listingType) c.push(eq(propertiesTable.listingType, i.listingType));
      if (i.mainCategory) c.push(eq(propertiesTable.mainCategory, i.mainCategory));
      if (strict && i.subCategory) c.push(ilike(propertiesTable.subCategory, `%${i.subCategory}%`));
      if (strict && i.minRooms !== undefined) c.push(gte(propertiesTable.rooms, i.minRooms));
      if (strict && i.maxRooms !== undefined) c.push(lte(propertiesTable.rooms, i.maxRooms));
      if (i.minPrice !== undefined) c.push(gte(propertiesTable.price, String(i.minPrice)));
      if (i.maxPrice !== undefined) c.push(lte(propertiesTable.price, String(i.maxPrice)));
      if (strict && i.minArea !== undefined) c.push(gte(propertiesTable.area, String(i.minArea)));
      if (strict && i.maxArea !== undefined) c.push(lte(propertiesTable.area, String(i.maxArea)));
      if (i.location) {
        c.push(or(
          ilike(propertiesTable.address, `%${i.location}%`),
          ilike(propertiesTable.district, `%${i.location}%`),
          ilike(propertiesTable.title, `%${i.location}%`),
        ) as any);
      }
      if (strict && i.finishing) c.push(ilike(propertiesTable.finishing, `%${i.finishing}%`));
      if (strict && i.furnished) c.push(ilike(propertiesTable.furnished, `%${i.furnished}%`));
      return c;
    };

    // Step 1: strict search
    let properties = await db
      .select().from(propertiesTable)
      .where(and(...buildConditions(enrichedIntent, true)))
      .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
      .limit(8);

    let fallbackUsed = false;

    // Step 2: relax area/finishing/furnished constraints
    if (properties.length === 0) {
      properties = await db
        .select().from(propertiesTable)
        .where(and(...buildConditions(enrichedIntent, false)))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(8);
      if (properties.length > 0) fallbackUsed = true;
    }

    // Step 3: relax location, keep type+category
    if (properties.length === 0) {
      const noLoc = { ...enrichedIntent, location: undefined };
      properties = await db
        .select().from(propertiesTable)
        .where(and(...buildConditions(noLoc, false)))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(8);
      if (properties.length > 0) fallbackUsed = true;
    }

    // Step 4: just listing type or category
    if (properties.length === 0) {
      const minimal: any[] = [eq(propertiesTable.status, "active")];
      if (enrichedIntent.listingType) minimal.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      else if (enrichedIntent.mainCategory) minimal.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      properties = await db
        .select().from(propertiesTable)
        .where(and(...minimal))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(6);
      if (properties.length > 0) fallbackUsed = true;
    }

    // Step 5: show featured if truly nothing found
    if (properties.length === 0) {
      properties = await db
        .select().from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.featured, true)))
        .orderBy(desc(propertiesTable.createdAt))
        .limit(4);
      fallbackUsed = true;
    }

    trackQuery(message, properties.length);

    const mapped = properties.map(mapProperty);

    let reply = "";
    let suggestions: string[] = [];

    if (properties.length === 0) {
      reply = fallbackMsg;
      suggestions = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع"];
    } else {
      reply = buildResponseText(enrichedIntent, properties.length, fallbackUsed);

      // Smart follow-up suggestions based on intent
      if (!enrichedIntent.listingType) {
        suggestions.push(
          (enrichedIntent.subCategory ?? "شقة") + " للبيع",
          (enrichedIntent.subCategory ?? "شقة") + " للإيجار",
        );
      }
      if (!enrichedIntent.location) {
        suggestions.push("في بنها", "في قليوب", "في القناطر");
      }
      if (!enrichedIntent.minRooms && enrichedIntent.mainCategory === "residential") {
        suggestions.push("غرفتين", "3 غرف", "4 غرف");
      }
    }

    return res.json({
      reply, properties: mapped, intent: enrichedIntent,
      suggestions: suggestions.slice(0, 4),
      whatsapp,
    });

  } catch (err) {
    console.error("[ai-chat]", err);
    return res.status(500).json({ reply: "حصل خطأ، جرب تاني من فضلك.", properties: [] });
  }
});

// ── GET /api/ai-autocomplete?q= ──────────────────────────────────────────────
router.get("/ai-autocomplete", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      const top = await db.select().from(chatbotQueriesTable)
        .where(gte(chatbotQueriesTable.count, 1))
        .orderBy(desc(chatbotQueriesTable.count))
        .limit(8);
      return res.json(top.map(r => r.query));
    }
    const results = await db.select().from(chatbotQueriesTable)
      .where(ilike(chatbotQueriesTable.query, `%${q}%`))
      .orderBy(desc(chatbotQueriesTable.count))
      .limit(6);

    // Also add static suggestions that match
    const staticSuggestions = [
      "شقة للبيع في بنها", "شقة للإيجار في بنها", "فيلا للبيع",
      "أرض للبيع في بنها", "شقة 3 غرف للبيع", "شقة 2 غرف للإيجار",
      "محل تجاري للإيجار", "مستودع للإيجار", "دوبلكس للبيع",
      "شقة مفروشة للإيجار", "أرض سكنية للبيع", "مكتب للإيجار",
    ].filter(s => s.includes(q));

    const dbResults = results.map(r => r.query);
    const combined = [...new Set([...dbResults, ...staticSuggestions])].slice(0, 8);
    return res.json(combined);
  } catch {
    return res.json([]);
  }
});

// ── GET /api/chatbot-trending ─────────────────────────────────────────────────
router.get("/chatbot-trending", async (req, res) => {
  try {
    const settings = await getChatbotSettings();
    const [queries, featuredProps, recentProps] = await Promise.all([
      db.select().from(chatbotQueriesTable)
        .where(gte(chatbotQueriesTable.count, 1))
        .orderBy(desc(chatbotQueriesTable.count))
        .limit(8),
      db.select().from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.featured, true)))
        .orderBy(desc(propertiesTable.viewCount))
        .limit(4),
      db.select().from(propertiesTable)
        .where(eq(propertiesTable.status, "active"))
        .orderBy(desc(propertiesTable.createdAt))
        .limit(4),
    ]);

    const allFeatured = [...featuredProps];
    for (const p of recentProps) {
      if (!allFeatured.find(f => f.id === p.id)) allFeatured.push(p);
      if (allFeatured.length >= 4) break;
    }

    // Merge with static suggestions if DB has few queries
    const dbQueries = queries.map(q => q.query);
    const staticQueries = [
      "شقة للبيع في بنها", "شقة للإيجار", "فيلا للبيع",
      "أرض للبيع", "شقة 3 غرف", "محل تجاري",
    ];
    const popular = [...new Set([...dbQueries, ...staticQueries])].slice(0, 8);

    return res.json({
      popularQueries: popular,
      featuredProperties: allFeatured.slice(0, 4).map(mapProperty),
      whatsapp: settings.chatbotWhatsapp || "",
      botName: settings.chatbotBotName || "مساعد عقارات بنها",
      welcomeMsg: settings.chatbotWelcomeMessage || "",
    });
  } catch {
    return res.json({ popularQueries: [], featuredProperties: [], whatsapp: "" });
  }
});

// ── DELETE /api/chatbot-queries/:id ──────────────────────────────────────────
router.delete("/chatbot-queries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(chatbotQueriesTable).where(eq(chatbotQueriesTable.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "فشل الحذف" });
  }
});

// ── GET /api/chatbot-queries ──────────────────────────────────────────────────
router.get("/chatbot-queries", async (_req, res) => {
  try {
    const queries = await db.select().from(chatbotQueriesTable)
      .orderBy(desc(chatbotQueriesTable.count))
      .limit(100);
    return res.json(queries);
  } catch {
    return res.status(500).json([]);
  }
});

export default router;
