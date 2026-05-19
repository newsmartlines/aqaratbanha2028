import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";

const router = Router();

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
  محل: ["محل", "محلات", "محلل"],
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

function extractNumber(text: string, ...patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const raw = m[1].replace(/,/g, "").trim();
      const n = parseFloat(raw);
      if (!isNaN(n)) return n;
    }
  }
}

function arabicToWestern(s: string): string {
  return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function parseIntent(msg: string): Intent {
  const t = arabicToWestern(msg.toLowerCase().trim());
  const intent: Intent = { missing: [] };

  // ── listing type ────────────────────────────────────────────
  if (/للإيجار|للايجار|إيجار|ايجار|أجار|اجار|يؤجر/.test(t)) intent.listingType = "rent";
  else if (/للبيع|بيع|يباع/.test(t)) intent.listingType = "sale";

  // ── sub category & main category ────────────────────────────
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

  // ── rooms ────────────────────────────────────────────────────
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

  // ── price ────────────────────────────────────────────────────
  const priceAbbrev = t
    .replace(/(\d+(?:\.\d+)?)\s*مليون/g, (_, n) => String(parseFloat(n) * 1_000_000))
    .replace(/(\d+(?:\.\d+)?)\s*الف|(\d+(?:\.\d+)?)\s*ألف/g, (_, n1, n2) => String(parseFloat(n1 ?? n2) * 1_000));

  const maxPriceMatch = priceAbbrev.match(/(?:أقل من|اقل من|تحت|حتى|ما يزيد عن|بحد أقصى|بحد اقصى|ما يتعدى|لا يتجاوز)\s*([\d,]+)/);
  if (maxPriceMatch) intent.maxPrice = parseFloat(maxPriceMatch[1].replace(/,/g, ""));

  const minPriceMatch = priceAbbrev.match(/(?:أكثر من|اكثر من|فوق|يزيد عن|من)\s*([\d,]+)/);
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

  // ── area ────────────────────────────────────────────────────
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

  // ── location ─────────────────────────────────────────────────
  for (const loc of LOCATIONS) {
    if (t.includes(loc.toLowerCase())) {
      intent.location = loc;
      break;
    }
  }

  // ── finishing ────────────────────────────────────────────────
  if (/مشطب|تشطيب كامل|تشطيب تام/.test(t)) intent.finishing = "مشطب";
  else if (/نص تشطيب|نصف تشطيب/.test(t)) intent.finishing = "نص تشطيب";
  else if (/خام|بدون تشطيب/.test(t)) intent.finishing = "خام";

  // ── furnished ────────────────────────────────────────────────
  if (/مفروش|مفروشة|مؤثث/.test(t)) intent.furnished = "مفروش";
  else if (/غير مفروش|فاضي/.test(t)) intent.furnished = "غير مفروش";

  return intent;
}

// ── Conversational response builder ────────────────────────────────────────
type BotStep = "welcome" | "collecting" | "results" | "refine";

function buildFollowUp(intent: Intent): string | null {
  if (!intent.listingType) return "هل تبحث عن عقار للبيع أم للإيجار؟";
  if (!intent.mainCategory && !intent.subCategory) return "ما نوع العقار اللي بتدور عليه؟ (شقة، فيلا، أرض، محل...)";
  if (!intent.location) return "في أي منطقة بتدور؟ (بنها، القناطر، الخانكة...)";
  return null;
}

function buildResponseText(intent: Intent, count: number): string {
  if (count === 0) {
    return "معنديش نتائج تطابق طلبك بالضبط دلوقتي. جرب توسّع البحث أو سألني بطريقة تانية.";
  }
  const typeLabel = intent.listingType === "sale" ? "للبيع" : intent.listingType === "rent" ? "للإيجار" : "";
  const catLabel = intent.subCategory ?? (intent.mainCategory === "land" ? "أرض" : intent.mainCategory === "commercial" ? "عقار تجاري" : "عقار");
  const locLabel = intent.location ? ` في ${intent.location}` : "";
  return `وجدت ${count} عقار${count > 1 ? "ات" : ""} ${catLabel} ${typeLabel}${locLabel}:`;
}

// ── POST /api/ai-chat ───────────────────────────────────────────────────────
router.post("/api/ai-chat", async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) {
      return res.json({ reply: "أرسل رسالتك وأنا هساعدك!", properties: [] });
    }

    const intent = parseIntent(message);

    // Build DB query conditions
    const conditions: any[] = [eq(propertiesTable.status, "active")];

    if (intent.listingType) {
      conditions.push(eq(propertiesTable.listingType, intent.listingType));
    }
    if (intent.mainCategory) {
      conditions.push(eq(propertiesTable.mainCategory, intent.mainCategory));
    }
    if (intent.subCategory) {
      conditions.push(ilike(propertiesTable.subCategory, `%${intent.subCategory}%`));
    }
    if (intent.minRooms !== undefined) {
      conditions.push(gte(propertiesTable.rooms, intent.minRooms));
    }
    if (intent.maxRooms !== undefined) {
      conditions.push(lte(propertiesTable.rooms, intent.maxRooms));
    }
    if (intent.minPrice !== undefined) {
      conditions.push(gte(propertiesTable.price, String(intent.minPrice)));
    }
    if (intent.maxPrice !== undefined) {
      conditions.push(lte(propertiesTable.price, String(intent.maxPrice)));
    }
    if (intent.minArea !== undefined) {
      conditions.push(gte(propertiesTable.area, String(intent.minArea)));
    }
    if (intent.maxArea !== undefined) {
      conditions.push(lte(propertiesTable.area, String(intent.maxArea)));
    }
    if (intent.location) {
      conditions.push(
        or(
          ilike(propertiesTable.address, `%${intent.location}%`),
          ilike(propertiesTable.district, `%${intent.location}%`),
          ilike(propertiesTable.title, `%${intent.location}%`)
        )
      );
    }
    if (intent.finishing) {
      conditions.push(ilike(propertiesTable.finishing, `%${intent.finishing}%`));
    }
    if (intent.furnished) {
      conditions.push(ilike(propertiesTable.furnished, `%${intent.furnished}%`));
    }

    let properties = await db
      .select()
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
      .limit(6);

    // Fallback: relax filters progressively if 0 results
    if (properties.length === 0 && conditions.length > 2) {
      const fallbackConditions: any[] = [eq(propertiesTable.status, "active")];
      if (intent.listingType) fallbackConditions.push(eq(propertiesTable.listingType, intent.listingType));
      if (intent.mainCategory) fallbackConditions.push(eq(propertiesTable.mainCategory, intent.mainCategory));
      properties = await db
        .select()
        .from(propertiesTable)
        .where(and(...fallbackConditions))
        .orderBy(sql`${propertiesTable.featured} desc, ${propertiesTable.createdAt} desc`)
        .limit(6);
    }

    const followUp = buildFollowUp(intent);
    const replyText = buildResponseText(intent, properties.length);

    const mapped = properties.map(p => {
      let imgs: string[] = [];
      try { imgs = JSON.parse(p.images ?? "[]"); } catch {}
      return {
        id: p.id,
        title: p.title,
        price: p.price ? Number(p.price).toLocaleString("ar-EG") + " ج.م" : "السعر عند التواصل",
        priceNum: p.price ? Number(p.price) : 0,
        image: imgs[0] ?? "",
        location: [p.district, p.address].filter(Boolean).join("، ") || "بنها",
        beds: p.rooms ?? 0,
        baths: p.bathrooms ?? 0,
        area: p.area ? Number(p.area) : 0,
        type: p.listingType ?? "",
        kind: p.subCategory ?? p.mainCategory ?? "",
        featured: p.featured ?? false,
      };
    });

    return res.json({
      reply: replyText,
      followUp,
      properties: mapped,
      intent,
    });
  } catch (err) {
    console.error("[ai-chat]", err);
    return res.status(500).json({ reply: "حصل خطأ، جرب تاني من فضلك.", properties: [] });
  }
});

export default router;
