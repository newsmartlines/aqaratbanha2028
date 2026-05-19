import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, chatbotQueriesTable, siteSettingsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql, desc, ne, asc } from "drizzle-orm";

const router = Router();

// ── In-memory rate limiter (50 req / 60s per IP) ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 50) return false;
  entry.count++;
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of rateLimitMap.entries()) if (now > v.resetAt) rateLimitMap.delete(k); }, 300_000);

// ── Load chatbot settings ─────────────────────────────────────────────────────
async function getChatbotSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(siteSettingsTable).where(sql`${siteSettingsTable.key} LIKE 'chatbot%'`);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value ?? "";
    return map;
  } catch { return {}; }
}

// ── Intent type ───────────────────────────────────────────────────────────────
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
  isCheapestQuery?: boolean;
  isNewestQuery?: boolean;
  isPricePerMeterQuery?: boolean;
  isContactQuery?: boolean;
  isAreaQuery?: boolean;
  isThankYou?: boolean;
  isCompareQuery?: boolean;
  pendingQuestion?: string;
  missing: string[];
};

const LOCATIONS = [
  "بنها", "القناطر الخيرية", "القناطر", "الخانكة", "شبين القناطر", "كفر شكر",
  "طوخ", "قليوب", "المرج", "أبو زعبل", "العبور", "الشروق", "العاشر من رمضان",
  "مدينة بدر", "الإسكندرية", "القاهرة", "الجيزة", "المنصورة", "الزقازيق",
  "بنها الجديدة", "وسط المدينة", "قليوبية", "شبرا", "مشتول", "الوقف",
  "الحي الراقي", "الحديقة", "المحطة", "شارع الجمهورية", "الحمراء",
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

// ── Pattern groups ────────────────────────────────────────────────────────────
const GREETING_PAT = /^(أهلاً|أهلا|مرحبا|مرحباً|السلام|هلا|هلو|hi|hello|سلام|صباح الخير|مساء الخير|صباح النور|مساء النور|كيف حالك|ازيك|ازيكم|إيه الأخبار|ايه الاخبار|تمام|عامل ايه|كويس|نورت|تشرفنا)$/i;
const THANKYOU_PAT = /^(شكر|شكراً|شكرا|ممتاز|تسلم|يسلموا|تمام|عظيم|برافو|مشكور|جميل|أحسنت|احسنت|جزاك الله|باي|مع السلامة|وداع|سلامة)$/i;
const MARKET_PAT = /عندك إيه|عندكم ايه|ايه عندكم|ماعندكم|عقارات متاحة|عقارات موجودة|شوفلي|اعرض|اعرضلي|كل العقارات|جميع العقارات|إيه المتاح|ما هو متاح/;
const PRICE_PAT = /أسعار|اسعار|تكلف كام|بكام|سعر|تكاليف|سعر الشقق|سعر الفلل|سعر الأراضي|ميزانية/;
const HELP_PAT = /مساعدة|ساعدني|كيف|إزاي|ازاي|تقدر تعمل إيه|بتعمل إيه|قادر تعمل ايه|ايه اللي بتعمله|قدراتك|وظيفتك/;
const CHEAPEST_PAT = /أرخص|ارخص|أقل سعر|اقل سعر|أوفر|اقتصادي|أقل ثمن|رخيص|رخيصة|أقل تكلفة|اقل تكلفه|بأقل سعر/;
const NEWEST_PAT = /أحدث|احدث|جديد|جديدة|آخر إعلانات|آخر عقارات|لسه|توه|حديث|تو اتضاف|للتو|أضيف حديثاً/;
const PRICE_METER_PAT = /سعر المتر|المتر بكام|كام للمتر|سعر المتر المربع|متر بكام|تمن المتر|ثمن المتر/;
const CONTACT_PAT = /رقمكم|تلفونكم|كلمني|اتصل بي|تواصل معايا|واتساب|إزاي أتواصل|بكيفية التواصل|عايز اتكلم|رقم التواصل|بيانات التواصل|رقم الهاتف/;
const AREA_PAT = /معلومات عن|إيه رأيك في|أنهى منطقة|أحسن منطقة|أفضل منطقة|الحياة في|السكن في|بتنصحني بإيه|نصيحة/;
const YES_PAT = /^(أيوه|ايوه|نعم|أه|آه|اه|yes|يس|أكيد|بالتأكيد|طبعاً|طبعا|صح|زبط|اوكيه|okay|ok|هيه|إيه|ايه)$/i;
const NO_PAT = /^(لأ|لا|la|no|نو|مش|مش عارف|مش محدد)$/i;

// ── Area knowledge base ───────────────────────────────────────────────────────
const AREA_KNOWLEDGE: Record<string, string> = {
  "بنها": "**بنها** عاصمة القليوبية، تبعد 45 كم شمال القاهرة 🏙️\n• من أرقى مناطقها: الحي الراقي، الحديقة، المحطة الجديدة\n• خدمات ممتازة: مستشفيات، جامعات، مراكز تجارية\n• الأسعار معقولة مقارنة بالقاهرة وأسهل وصول",
  "القناطر": "**القناطر الخيرية** طبيعة خلابة على ضفاف النيل 🌿\n• هادئة ومناسبة للعائلات التي تفضل البعد عن صخب المدينة\n• أسعارها في متناول اليد وبها عقارات واسعة\n• قريبة من بنها (حوالي 15 كم)",
  "الخانكة": "**الخانكة** منطقة نابضة بالحياة 🏘️\n• بها سوق كبير وخدمات كاملة\n• أسعار متوسطة ومناسبة للشباب والعائلات\n• سهلة الوصول من القاهرة والإسكندرية",
  "قليوب": "**قليوب** مركز تجاري وصناعي مهم 🏭\n• ينصح بها للراغبين في الاستثمار التجاري\n• بها مناطق سكنية هادئة ومناطق تجارية نشطة\n• أسعارها مناسبة جداً",
  "طوخ": "**طوخ** منطقة هادئة بطابع ريفي جميل 🌾\n• مناسبة للراغبين في الهدوء بعيداً عن الزحام\n• الأسعار منخفضة نسبياً\n• بها مشاريع سكنية جديدة ومتطورة",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function arabicToWestern(s: string): string {
  return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " مليون";
  if (n >= 1_000) return Math.round(n / 1_000) + " ألف";
  return n.toLocaleString("ar-EG");
}

function mapProperty(p: any) {
  let imgs: string[] = [];
  try { imgs = JSON.parse(p.images ?? "[]"); } catch {}
  return {
    id: p.id, title: p.title,
    price: p.price ? Number(p.price).toLocaleString("ar-EG") + " ج.م" : "السعر عند التواصل",
    priceNum: p.price ? Number(p.price) : 0,
    image: imgs[0] ?? "",
    gallery: imgs.slice(0, 3),
    location: [p.district, p.address].filter(Boolean).join("، ") || "بنها",
    beds: p.rooms ?? 0, baths: p.bathrooms ?? 0,
    area: p.area ? Number(p.area) : 0,
    type: p.listingType ?? "", kind: p.subCategory ?? p.mainCategory ?? "",
    featured: p.featured ?? false,
    finishing: p.finishing ?? "",
    floor: p.floor ?? null,
    createdAt: p.createdAt,
  };
}

async function trackQuery(query: string, resultCount: number) {
  try {
    const normalized = query.trim().toLowerCase().slice(0, 200);
    if (normalized.length < 3) return;
    const existing = await db.select().from(chatbotQueriesTable).where(eq(chatbotQueriesTable.query, normalized)).limit(1);
    if (existing.length > 0) {
      await db.update(chatbotQueriesTable).set({ count: existing[0].count + 1, resultCount, updatedAt: new Date() }).where(eq(chatbotQueriesTable.id, existing[0].id));
    } else {
      await db.insert(chatbotQueriesTable).values({ query: normalized, count: 1, resultCount });
    }
  } catch {}
}

// ── Time-based greeting ───────────────────────────────────────────────────────
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "صباح الخير ☀️";
  if (h >= 12 && h < 17) return "مساء النور 🌤️";
  if (h >= 17 && h < 21) return "مساء الخير 🌇";
  return "أهلاً بك 🌙";
}

// ── Follow-up question for partial intents ────────────────────────────────────
function getFollowUpQuestion(intent: Intent): string | null {
  if ((intent.subCategory || intent.mainCategory) && !intent.listingType) {
    const label = intent.subCategory ?? (
      intent.mainCategory === "residential" ? "عقار سكني" :
      intent.mainCategory === "commercial" ? "عقار تجاري" : "أرض"
    );
    return `هل تبحث عن **${label}** للبيع أم للإيجار؟ 🤔`;
  }
  if (intent.listingType && !intent.mainCategory) {
    const t = intent.listingType === "sale" ? "للبيع" : "للإيجار";
    return `ممتاز! ما نوع العقار ${t} الذي تبحث عنه؟\n**شقة** — **فيلا** — **أرض** — **دوبلكس** — **محل تجاري**`;
  }
  return null;
}

// ── Intent parser ─────────────────────────────────────────────────────────────
export function parseIntent(msg: string): Intent {
  const t = arabicToWestern(msg.toLowerCase().trim());
  const intent: Intent = { missing: [] };

  if (GREETING_PAT.test(t.trim())) { intent.isGreeting = true; return intent; }
  if (THANKYOU_PAT.test(t.trim())) { intent.isThankYou = true; return intent; }
  if (HELP_PAT.test(t)) { intent.isHelpQuery = true; return intent; }
  if (PRICE_METER_PAT.test(t)) { intent.isPricePerMeterQuery = true; }
  if (CONTACT_PAT.test(t)) { intent.isContactQuery = true; return intent; }
  if (AREA_PAT.test(t)) { intent.isAreaQuery = true; }
  if (CHEAPEST_PAT.test(t)) { intent.isCheapestQuery = true; }
  if (NEWEST_PAT.test(t)) { intent.isNewestQuery = true; }
  if (MARKET_PAT.test(t)) { intent.isMarketQuery = true; }
  if (PRICE_PAT.test(t) && !intent.isMarketQuery) { intent.isPriceQuery = true; }

  // Listing type
  if (/للإيجار|للايجار|إيجار|ايجار|أجار|اجار|يؤجر|بالإيجار|بالايجار/.test(t)) intent.listingType = "rent";
  else if (/للبيع|بيع|يباع|بيعها|بيعه/.test(t)) intent.listingType = "sale";

  // Sub-category
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
  if (roomMatch) { const r = parseInt(roomMatch[1]); intent.minRooms = r; intent.maxRooms = r; }
  const roomRangeMatch = t.match(/(\d+)\s*(?:إلى|الى|ل|to|-)\s*(\d+)\s*(?:غرف|أوض)/);
  if (roomRangeMatch) { intent.minRooms = parseInt(roomRangeMatch[1]); intent.maxRooms = parseInt(roomRangeMatch[2]); }

  // Price
  const priceAbbrev = t
    .replace(/(\d+(?:\.\d+)?)\s*مليون/g, (_, n) => String(parseFloat(n) * 1_000_000))
    .replace(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|k)/g, (_, n) => String(parseFloat(n) * 1_000));
  const maxPriceMatch = priceAbbrev.match(/(?:أقل من|اقل من|تحت|حتى|ما يزيد عن|بحد أقصى|لا يتجاوز|ميزانيتي)\s*([\d,]+)/);
  if (maxPriceMatch) intent.maxPrice = parseFloat(maxPriceMatch[1].replace(/,/g, ""));
  const minPriceMatch = priceAbbrev.match(/(?:أكثر من|اكثر من|فوق|يزيد عن|يبدأ من)\s*([\d,]+)/);
  if (minPriceMatch) intent.minPrice = parseFloat(minPriceMatch[1].replace(/,/g, ""));
  const betweenMatch = priceAbbrev.match(/(?:بين|من)\s*([\d,]+)\s*(?:و|الى|إلى|-|to)\s*([\d,]+)/);
  if (betweenMatch) { intent.minPrice = parseFloat(betweenMatch[1].replace(/,/g, "")); intent.maxPrice = parseFloat(betweenMatch[2].replace(/,/g, "")); }
  const plainPrice = priceAbbrev.match(/(?:بسعر|سعره|سعرها|يكلف|تكلف|ب)\s*([\d,]+)/);
  if (plainPrice) { const p = parseFloat(plainPrice[1].replace(/,/g, "")); intent.minPrice = p * 0.8; intent.maxPrice = p * 1.2; }

  // Area
  const areaMatch = t.match(/(\d+)\s*(?:متر|م²|م2|مترمربع|sqm)/);
  if (areaMatch) { const a = parseInt(areaMatch[1]); intent.minArea = a * 0.7; intent.maxArea = a * 1.3; }
  const areaRangeMatch = t.match(/(?:من|بين)\s*(\d+)\s*(?:الى|إلى|-)\s*(\d+)\s*(?:متر|م)/);
  if (areaRangeMatch) { intent.minArea = parseInt(areaRangeMatch[1]); intent.maxArea = parseInt(areaRangeMatch[2]); }

  // Location
  for (const loc of LOCATIONS) {
    if (t.includes(loc.toLowerCase())) { intent.location = loc; break; }
  }

  // Finishing
  if (/سوبر لوكس|super lux/.test(t)) intent.finishing = "سوبر لوكس";
  else if (/لوكس|lux/.test(t)) intent.finishing = "لوكس";
  else if (/مشطب|تشطيب كامل|تشطيب تام|كامل التشطيب/.test(t)) intent.finishing = "مشطب";
  else if (/نص تشطيب|نصف تشطيب/.test(t)) intent.finishing = "نص تشطيب";
  else if (/خام|بدون تشطيب/.test(t)) intent.finishing = "خام";

  // Furnished
  if (/مفروش|مفروشة|مؤثث|فرنيتشر/.test(t)) intent.furnished = "مفروش";
  else if (/غير مفروش|فاضي|فاضية/.test(t)) intent.furnished = "غير مفروش";

  return intent;
}

// ── Context merger ─────────────────────────────────────────────────────────────
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

// ── Query builder ─────────────────────────────────────────────────────────────
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
  if (i.location) c.push(or(ilike(propertiesTable.address, `%${i.location}%`), ilike(propertiesTable.district, `%${i.location}%`), ilike(propertiesTable.title, `%${i.location}%`)) as any);
  if (strict && i.finishing) c.push(ilike(propertiesTable.finishing, `%${i.finishing}%`));
  if (strict && i.furnished) c.push(ilike(propertiesTable.furnished, `%${i.furnished}%`));
  return c;
};

// ── Response text builder ─────────────────────────────────────────────────────
const FOUND_OPENERS = [
  "لقيت لك", "وجدت لك", "تفضل عندنا", "آخذ", "عندي",
];
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function buildResponseText(intent: Intent, count: number, fallbackUsed = false): string {
  if (count === 0) return "";
  const opener = pick(FOUND_OPENERS);
  const typeLabel = intent.listingType === "sale" ? "للبيع" : intent.listingType === "rent" ? "للإيجار" : "";
  const catLabel = intent.subCategory ?? (
    intent.mainCategory === "land" ? "أرض" :
    intent.mainCategory === "commercial" ? "عقار تجاري" :
    intent.mainCategory === "residential" ? "عقار سكني" : "عقار"
  );
  const locLabel = intent.location ? ` في **${intent.location}**` : "";
  const roomLabel = intent.minRooms && intent.minRooms === intent.maxRooms ? ` بـ ${intent.minRooms} غرف` : "";
  const priceLabel = intent.maxPrice ? ` بأقل من **${formatPrice(intent.maxPrice)}**` : intent.minPrice ? ` فوق **${formatPrice(intent.minPrice)}**` : "";
  const fallbackNote = fallbackUsed ? "\n_(عرضت أقرب الخيارات لبحثك)_" : "";
  return `${opener} **${count}** ${catLabel} ${typeLabel}${locLabel}${roomLabel}${priceLabel} 🏠${fallbackNote}`;
}

// ── Smart suggestions ─────────────────────────────────────────────────────────
function buildSuggestions(intent: Intent, resultCount: number): string[] {
  const s: string[] = [];
  if (resultCount > 0) {
    if (!intent.listingType) {
      const prop = intent.subCategory ?? "شقة";
      s.push(`${prop} للبيع`, `${prop} للإيجار`);
    } else if (!intent.location) {
      s.push("في بنها", "في القناطر", "في قليوب");
    } else if (!intent.minRooms && intent.mainCategory === "residential") {
      s.push("2 غرفة", "3 غرف", "4 غرف فأكثر");
    } else if (!intent.maxPrice) {
      s.push("بأقل من مليون", "من مليون لـ 2 مليون", "أكثر من 2 مليون");
    }
  } else {
    s.push("شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع");
  }
  if (!s.includes("أحدث العقارات")) s.push("أحدث العقارات");
  return s.slice(0, 4);
}

// ── MAIN ROUTE POST /api/ai-chat ──────────────────────────────────────────────
router.post("/ai-chat", async (req, res) => {
  const ip = String(req.ip ?? (req.socket as any)?.remoteAddress ?? "anon");
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ reply: "أرسلت كثيراً من الرسائل. انتظر دقيقة ثم حاول مجدداً. ⏳", properties: [] });
  }

  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: Array<{ role: "user" | "bot"; text: string; intent?: Intent; pendingQuestion?: string }>;
    };

    if (!message?.trim()) return res.json({ reply: "أرسل رسالتك وأنا هساعدك! 💬", properties: [] });

    const settings = await getChatbotSettings();
    const fallbackMsg = settings.chatbotFallbackMsg || "معنديش نتائج مطابقة تماماً، بس هحاول أعرضلك أقرب الخيارات. 🔍";
    const whatsapp = settings.chatbotWhatsapp || "";

    const intent = parseIntent(message);

    // ── Thank you ──────────────────────────────────────────────────────────────
    if (intent.isThankYou) {
      const responses = [
        "العفو! 😊 أنا هنا لو احتجت أي حاجة تانية.",
        "يسعدني خدمتك! 🙏 لو محتاج مساعدة في أي وقت أنا موجود.",
        "تسلم! أتمنى تلاقي عقارك المثالي قريباً. 🏠✨",
        "وأنت أهلاً! 😊 لو عندك أي استفسار تاني لا تتردد.",
      ];
      return res.json({ reply: pick(responses), properties: [], suggestions: ["شقة للبيع في بنها", "أرض للبيع", "فيلا للبيع"] });
    }

    // ── Greeting ───────────────────────────────────────────────────────────────
    if (intent.isGreeting) {
      const timeGreet = getTimeGreeting();
      const greetings = [
        `${timeGreet} 😊\nأنا **مساعد عقارات بنها الذكي** — يسعدني أساعدك تلاقي عقارك المثالي!\n\nأخبرني إيه اللي بتدور عليه:\n_مثلاً: "شقة 3 غرف للبيع في بنها" أو "أرض للبيع بأقل من مليون"_`,
        `${timeGreet}! أهلاً وسهلاً 🏠\nأنا هنا أساعدك في البحث عن العقار المناسب في بنها والقليوبية.\n\nما الذي تبحث عنه؟`,
      ];
      return res.json({
        reply: pick(greetings), properties: [],
        suggestions: ["شقة للبيع في بنها", "فيلا للبيع", "أرض للبيع", "شقة للإيجار"],
      });
    }

    // ── Help ───────────────────────────────────────────────────────────────────
    if (intent.isHelpQuery) {
      return res.json({
        reply: `أنا **مساعد عقارات بنها الذكي** ويمكنني:\n\n🏠 **البحث عن عقارات** — شقق، فيلات، أراضي، محلات، مكاتب\n📍 **البحث بالموقع** — بنها، القناطر، قليوب، طوخ، الخانكة وأكثر\n💰 **البحث بالسعر** — "شقة بأقل من مليون" أو "بين 500 ألف ومليون"\n🛏️ **البحث بعدد الغرف** — "شقة 3 غرف"\n📐 **البحث بالمساحة** — "شقة 120 متر"\n✨ **البحث بالتشطيب** — سوبر لوكس، لوكس، بدون تشطيب\n📊 **إحصائيات السوق** — "ما أسعار الشقق؟"\n🆕 **أحدث الإعلانات** — "أحدث العقارات"\n💎 **الأرخص** — "أرخص شقة موجودة"\n\nجرب الآن: _"شقة 3 غرف للبيع في بنها بأقل من مليون"_`,
        properties: [],
        suggestions: ["شقة للبيع في بنها", "أرض للبيع", "إحصائيات السوق", "أحدث العقارات"],
      });
    }

    // ── Contact request ────────────────────────────────────────────────────────
    if (intent.isContactQuery) {
      const wa = whatsapp || settings.contactWhatsapp || "";
      const waLink = wa ? `\n📱 **واتساب:** ${wa}` : "";
      return res.json({
        reply: `يسعدنا التواصل معك! 😊${waLink}\n\nأو اترك رقمك وهيتواصل معاك فريقنا في أقرب وقت. 🤝`,
        properties: [],
        showLead: true,
        suggestions: ["شقة للبيع", "أرض للبيع", "فيلا للبيع"],
      });
    }

    // ── Context history ────────────────────────────────────────────────────────
    const prevUserTurns = history.filter(h => h.role === "user" && h.intent);
    const prevIntent: Intent | undefined = prevUserTurns.length > 0 ? prevUserTurns[prevUserTurns.length - 1].intent : undefined;
    const lastBotMsg = [...history].reverse().find(h => h.role === "bot");
    const pendingQ = lastBotMsg?.pendingQuestion;

    // Handle yes/no to pending question
    if (pendingQ && YES_PAT.test(message.trim())) {
      if (pendingQ.includes("تفاصيل") || pendingQ.includes("مزيد")) {
        return res.json({ reply: "ممتاز! اكتب اسمك ورقمك وهيتواصل معاك مستشارنا. 📞", properties: [], showLead: true });
      }
    }

    const hasStandaloneInfo = intent.listingType || intent.mainCategory || intent.subCategory || intent.minPrice || intent.maxPrice || intent.minRooms || intent.isCheapestQuery || intent.isNewestQuery;
    const enrichedIntent = (prevIntent && !hasStandaloneInfo)
      ? mergeWithContext(intent, prevIntent)
      : hasStandaloneInfo && prevIntent
        ? mergeWithContext(intent, prevIntent)
        : intent;

    // ── Area query ─────────────────────────────────────────────────────────────
    if (intent.isAreaQuery) {
      const matchedArea = Object.keys(AREA_KNOWLEDGE).find(a => message.includes(a));
      if (matchedArea) {
        const info = AREA_KNOWLEDGE[matchedArea];
        const props = await db.select().from(propertiesTable)
          .where(and(eq(propertiesTable.status, "active"), or(ilike(propertiesTable.address, `%${matchedArea}%`), ilike(propertiesTable.district, `%${matchedArea}%`)) as any))
          .orderBy(sql`${propertiesTable.featured} desc`).limit(4);
        return res.json({
          reply: info + (props.length > 0 ? `\n\nوهنا بعض العقارات المتاحة في **${matchedArea}**:` : "\n\nمش عندي عقارات متاحة في هذه المنطقة حالياً."),
          properties: props.map(mapProperty),
          suggestions: [`شقة في ${matchedArea}`, `أرض في ${matchedArea}`, "مناطق أخرى", "إحصائيات السوق"],
        });
      }
      return res.json({
        reply: "عن أي منطقة تريد معلومات؟ 🗺️\n\nأغطي معلومات عن:\n**بنها** — **القناطر** — **قليوب** — **الخانكة** — **طوخ**",
        properties: [],
        suggestions: ["معلومات عن بنها", "معلومات عن القناطر", "معلومات عن قليوب"],
      });
    }

    // ── Price per meter query ──────────────────────────────────────────────────
    if (intent.isPricePerMeterQuery) {
      const conditions: any[] = [eq(propertiesTable.status, "active"), sql`${propertiesTable.area} IS NOT NULL AND ${propertiesTable.price} IS NOT NULL AND CAST(${propertiesTable.area} AS FLOAT) > 0`];
      if (enrichedIntent.mainCategory) conditions.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      if (enrichedIntent.listingType) conditions.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      const props = await db.select().from(propertiesTable).where(and(...conditions)).limit(50);
      const ppm = props.map(p => Number(p.price) / Number(p.area)).filter(v => v > 0 && v < 1_000_000);
      if (ppm.length === 0) return res.json({ reply: "مش قادر أحسب سعر المتر دلوقتي، جرب تاني. 😅", properties: [] });
      const avg = ppm.reduce((a, b) => a + b, 0) / ppm.length;
      const min = Math.min(...ppm);
      const max = Math.max(...ppm);
      const catLabel = enrichedIntent.subCategory ?? (enrichedIntent.mainCategory === "land" ? "الأراضي" : enrichedIntent.mainCategory === "commercial" ? "العقارات التجارية" : "العقارات السكنية");
      return res.json({
        reply: `📐 **سعر المتر لـ${catLabel}:**\n\n• أقل سعر: **${formatPrice(Math.round(min))} ج.م/م²**\n• متوسط: **${formatPrice(Math.round(avg))} ج.م/م²**\n• أعلى سعر: **${formatPrice(Math.round(max))} ج.م/م²**\n\n_بناءً على ${ppm.length} عقار في قاعدة البيانات_`,
        properties: [],
        suggestions: [`أرخص ${catLabel}`, `أحدث ${catLabel}`, "إحصائيات كاملة"],
      });
    }

    // ── Market / price stats ───────────────────────────────────────────────────
    if (intent.isMarketQuery || intent.isPriceQuery) {
      const conditions: any[] = [eq(propertiesTable.status, "active")];
      if (enrichedIntent.mainCategory) conditions.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      if (enrichedIntent.listingType) conditions.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      if (enrichedIntent.location) conditions.push(or(ilike(propertiesTable.address, `%${enrichedIntent.location}%`), ilike(propertiesTable.district, `%${enrichedIntent.location}%`)) as any);

      const allProps = await db.select().from(propertiesTable).where(and(...conditions))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`).limit(50);

      if (allProps.length === 0) return res.json({ reply: "مش لاقي عقارات متاحة دلوقتي. جرب تاني لاحقاً. 😊", properties: [] });

      const prices = allProps.map(p => Number(p.price)).filter(p => p > 0);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;
      const catLabel = enrichedIntent.subCategory ?? (
        enrichedIntent.mainCategory === "land" ? "الأراضي" :
        enrichedIntent.mainCategory === "commercial" ? "العقارات التجارية" : "العقارات السكنية"
      );
      const typeLabel = enrichedIntent.listingType === "sale" ? "للبيع" : enrichedIntent.listingType === "rent" ? "للإيجار" : "";
      const locLabel = enrichedIntent.location ? ` في ${enrichedIntent.location}` : "";
      const reply = `📊 **إحصائيات ${catLabel} ${typeLabel}${locLabel}:**\n\n• إجمالي المتاح: **${allProps.length}** عقار\n• أقل سعر: **${formatPrice(minP)} ج.م**\n• أعلى سعر: **${formatPrice(maxP)} ج.م**\n• متوسط السعر: **${formatPrice(Math.round(avgP))} ج.م**\n\nهنا أفضل الخيارات المتاحة: 👇`;
      return res.json({ reply, properties: allProps.slice(0, 6).map(mapProperty), intent: enrichedIntent, suggestions: [`أرخص ${catLabel}`, `${catLabel} للبيع`, "إيجار الشقق"] });
    }

    // ── Cheapest query ─────────────────────────────────────────────────────────
    if (intent.isCheapestQuery) {
      const conditions: any[] = [eq(propertiesTable.status, "active"), sql`${propertiesTable.price} IS NOT NULL`];
      if (enrichedIntent.listingType) conditions.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      if (enrichedIntent.mainCategory) conditions.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      if (enrichedIntent.subCategory) conditions.push(ilike(propertiesTable.subCategory, `%${enrichedIntent.subCategory}%`));
      if (enrichedIntent.location) conditions.push(or(ilike(propertiesTable.address, `%${enrichedIntent.location}%`), ilike(propertiesTable.district, `%${enrichedIntent.location}%`)) as any);
      const props = await db.select().from(propertiesTable).where(and(...conditions)).orderBy(asc(propertiesTable.price)).limit(6);
      const catLabel = enrichedIntent.subCategory ?? (enrichedIntent.mainCategory ? { residential: "عقار سكني", commercial: "عقار تجاري", land: "أرض" }[enrichedIntent.mainCategory] : "عقار");
      if (props.length === 0) return res.json({ reply: `مش لاقي ${catLabel} حالياً. جرب بحث مختلف؟ 🔍`, properties: [], suggestions: ["شقة للبيع في بنها", "أرض للبيع"] });
      return res.json({
        reply: `💎 **أرخص ${props.length} ${catLabel} متاحين دلوقتي:**\nمرتبين من الأقل للأعلى سعراً 👇`,
        properties: props.map(mapProperty), intent: enrichedIntent,
        suggestions: [`أحدث ${catLabel}`, "إحصائيات السوق", "شقة للإيجار"],
      });
    }

    // ── Newest query ───────────────────────────────────────────────────────────
    if (intent.isNewestQuery) {
      const conditions: any[] = [eq(propertiesTable.status, "active")];
      if (enrichedIntent.listingType) conditions.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      if (enrichedIntent.mainCategory) conditions.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      if (enrichedIntent.location) conditions.push(or(ilike(propertiesTable.address, `%${enrichedIntent.location}%`), ilike(propertiesTable.district, `%${enrichedIntent.location}%`)) as any);
      const props = await db.select().from(propertiesTable).where(and(...conditions)).orderBy(desc(propertiesTable.createdAt)).limit(6);
      if (props.length === 0) return res.json({ reply: "مش لاقي عقارات جديدة حالياً. 😊", properties: [], suggestions: ["شقة للبيع", "أرض للبيع"] });
      return res.json({
        reply: `🆕 **أحدث ${props.length} عقارات أُضيفت للموقع:**\nطازة وحديثة التسجيل! 👇`,
        properties: props.map(mapProperty), intent: enrichedIntent,
        suggestions: ["أرخص العقارات", "عقارات مميزة", "شقق للإيجار"],
      });
    }

    // ── Follow-up question for partial intent ──────────────────────────────────
    const followUp = getFollowUpQuestion(enrichedIntent);
    if (followUp && !enrichedIntent.isMarketQuery && !enrichedIntent.isPriceQuery && !intent.isCheapestQuery && !intent.isNewestQuery) {
      const hasEnoughToSearch = enrichedIntent.listingType && enrichedIntent.mainCategory;
      if (!hasEnoughToSearch) {
        return res.json({
          reply: followUp,
          properties: [],
          intent: enrichedIntent,
          pendingQuestion: followUp,
          suggestions: enrichedIntent.listingType
            ? ["شقة", "فيلا", "أرض", "دوبلكس", "محل تجاري"]
            : [
              (enrichedIntent.subCategory ?? "شقة") + " للبيع",
              (enrichedIntent.subCategory ?? "شقة") + " للإيجار",
            ],
        });
      }
    }

    // ── Main property search ───────────────────────────────────────────────────
    let properties = await db.select().from(propertiesTable)
      .where(and(...buildConditions(enrichedIntent, true)))
      .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`).limit(8);

    let fallbackUsed = false;

    if (properties.length === 0) {
      properties = await db.select().from(propertiesTable)
        .where(and(...buildConditions(enrichedIntent, false)))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`).limit(8);
      if (properties.length > 0) fallbackUsed = true;
    }

    if (properties.length === 0) {
      const noLoc = { ...enrichedIntent, location: undefined };
      properties = await db.select().from(propertiesTable)
        .where(and(...buildConditions(noLoc, false)))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`).limit(8);
      if (properties.length > 0) fallbackUsed = true;
    }

    if (properties.length === 0) {
      const minimal: any[] = [eq(propertiesTable.status, "active")];
      if (enrichedIntent.listingType) minimal.push(eq(propertiesTable.listingType, enrichedIntent.listingType));
      else if (enrichedIntent.mainCategory) minimal.push(eq(propertiesTable.mainCategory, enrichedIntent.mainCategory));
      properties = await db.select().from(propertiesTable).where(and(...minimal))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`).limit(6);
      if (properties.length > 0) fallbackUsed = true;
    }

    if (properties.length === 0) {
      properties = await db.select().from(propertiesTable)
        .where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.featured, true)))
        .orderBy(desc(propertiesTable.createdAt)).limit(4);
      fallbackUsed = true;
    }

    trackQuery(message, properties.length);
    const mapped = properties.map(mapProperty);

    let reply = "";
    let suggestions: string[] = [];

    if (properties.length === 0) {
      reply = `${fallbackMsg}\n\nجرب تعديل معايير البحث، أو استفسر عن منطقة أو نوع عقار تاني. 🔍`;
      suggestions = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع"];
    } else {
      reply = buildResponseText(enrichedIntent, properties.length, fallbackUsed);

      // Smart follow-up after results
      const pendingQuestion = !enrichedIntent.location
        ? `هل تريد تضييق النتائج بمنطقة معينة؟ 📍`
        : !enrichedIntent.maxPrice && properties.length > 3
          ? `هل عندك ميزانية محددة؟ 💰`
          : null;

      suggestions = buildSuggestions(enrichedIntent, properties.length);
      return res.json({ reply, properties: mapped, intent: enrichedIntent, suggestions, whatsapp, pendingQuestion });
    }

    return res.json({ reply, properties: mapped, intent: enrichedIntent, suggestions, whatsapp });

  } catch (err) {
    console.error("[ai-chat]", err);
    return res.status(500).json({ reply: "حصل خطأ، جرب تاني من فضلك. 😊", properties: [] });
  }
});

// ── GET /api/ai-autocomplete ──────────────────────────────────────────────────
router.get("/ai-autocomplete", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      const top = await db.select().from(chatbotQueriesTable).where(gte(chatbotQueriesTable.count, 1)).orderBy(desc(chatbotQueriesTable.count)).limit(8);
      return res.json(top.map(r => r.query));
    }
    const results = await db.select().from(chatbotQueriesTable).where(ilike(chatbotQueriesTable.query, `%${q}%`)).orderBy(desc(chatbotQueriesTable.count)).limit(5);
    const statics = [
      "شقة للبيع في بنها", "شقة للإيجار في بنها", "فيلا للبيع", "أرض للبيع في بنها",
      "شقة 3 غرف للبيع", "شقة 2 غرف للإيجار", "محل تجاري للإيجار", "دوبلكس للبيع",
      "شقة مفروشة للإيجار", "أرض سكنية للبيع", "مكتب للإيجار", "أرخص شقة",
      "أحدث العقارات", "إحصائيات السوق", "معلومات عن بنها",
    ].filter(s => s.includes(q));
    return res.json([...new Set([...results.map(r => r.query), ...statics])].slice(0, 8));
  } catch { return res.json([]); }
});

// ── GET /api/chatbot-trending ─────────────────────────────────────────────────
router.get("/chatbot-trending", async (_req, res) => {
  try {
    const settings = await getChatbotSettings();
    const [queries, featuredProps, recentProps] = await Promise.all([
      db.select().from(chatbotQueriesTable).where(gte(chatbotQueriesTable.count, 1)).orderBy(desc(chatbotQueriesTable.count)).limit(8),
      db.select().from(propertiesTable).where(and(eq(propertiesTable.status, "active"), eq(propertiesTable.featured, true))).orderBy(desc(propertiesTable.viewCount)).limit(4),
      db.select().from(propertiesTable).where(eq(propertiesTable.status, "active")).orderBy(desc(propertiesTable.createdAt)).limit(4),
    ]);
    const allFeatured = [...featuredProps];
    for (const p of recentProps) { if (!allFeatured.find(f => f.id === p.id)) allFeatured.push(p); if (allFeatured.length >= 4) break; }
    const dbQueries = queries.map(q => q.query);
    const staticQueries = ["شقة للبيع في بنها", "شقة للإيجار", "فيلا للبيع", "أرض للبيع", "أرخص العقارات", "أحدث العقارات"];
    const popular = [...new Set([...dbQueries, ...staticQueries])].slice(0, 8);
    return res.json({
      popularQueries: popular, featuredProperties: allFeatured.slice(0, 4).map(mapProperty),
      whatsapp: settings.chatbotWhatsapp || "", botName: settings.chatbotBotName || "مساعد عقارات بنها",
      welcomeMsg: settings.chatbotWelcomeMessage || "",
    });
  } catch { return res.json({ popularQueries: [], featuredProperties: [], whatsapp: "" }); }
});

// ── DELETE /api/chatbot-queries/:id ──────────────────────────────────────────
router.delete("/chatbot-queries/:id", async (req, res) => {
  try {
    await db.delete(chatbotQueriesTable).where(eq(chatbotQueriesTable.id, parseInt(req.params.id)));
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "فشل الحذف" }); }
});

// ── GET /api/chatbot-queries ──────────────────────────────────────────────────
router.get("/chatbot-queries", async (_req, res) => {
  try {
    const queries = await db.select().from(chatbotQueriesTable).orderBy(desc(chatbotQueriesTable.count)).limit(100);
    return res.json(queries);
  } catch { return res.status(500).json([]); }
});

export default router;
