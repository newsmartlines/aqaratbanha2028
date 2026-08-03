/**
 * Intelligent Property Information Extraction Engine v2
 * Supports Arabic, English, mixed text, abbreviations, typos, Arabic/English numbers.
 * Features: full location DB, all phones, WhatsApp, nearby landmarks, geocoding-ready.
 */

/* ─── Arabic-Indic → ASCII digit normalisation ────────────────────────────── */
const AR_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN  = "۰۱۲۳۴۵۶۷۸۹";
function normaliseDigits(text: string): string {
  return text.split("").map(c => {
    const ai = AR_INDIC.indexOf(c);
    if (ai !== -1) return String(ai);
    const pe = PERSIAN.indexOf(c);
    if (pe !== -1) return String(pe);
    return c;
  }).join("");
}

/* ─── Arabic word-number map ──────────────────────────────────────────────── */
const AR_NUMS: Record<string, number> = {
  "واحد": 1, "واحده": 1, "واحدة": 1,
  "اثنين": 2, "اتنين": 2, "اثنتين": 2, "اتنتين": 2, "اتنان": 2,
  "ثلاثة": 3, "ثلاثه": 3, "تلاتة": 3, "تلاته": 3, "ثلاث": 3, "تلات": 3, "تلاتا": 3,
  "أربعة": 4, "اربعة": 4, "أربعه": 4, "اربعه": 4, "أربع": 4, "اربع": 4,
  "خمسة": 5, "خمسه": 5, "خمس": 5,
  "ستة": 6, "سته": 6, "ست": 6,
  "سبعة": 7, "سبعه": 7, "سبع": 7,
  "ثمانية": 8, "تمانية": 8, "ثمانيه": 8, "تمانيه": 8, "ثماني": 8, "تماني": 8,
  "تسعة": 9, "تسعه": 9, "تسع": 9,
  "عشرة": 10, "عشره": 10, "عشر": 10,
};

/* ─── Floor name map ──────────────────────────────────────────────────────── */
const AR_FLOORS: Record<string, number | "ground" | "last"> = {
  "أرضي": "ground", "ارضي": "ground", "أرضى": "ground", "ارضى": "ground", "ground": "ground",
  "أول": 1, "اول": 1, "أولى": 1, "اولى": 1, "first": 1,
  "ثاني": 2, "تاني": 2, "ثانى": 2, "تانى": 2, "second": 2,
  "ثالث": 3, "تالت": 3, "third": 3,
  "رابع": 4, "fourth": 4,
  "خامس": 5, "fifth": 5,
  "سادس": 6,
  "سابع": 7,
  "ثامن": 8, "تامن": 8,
  "تاسع": 9,
  "عاشر": 10,
  "أخير": "last", "اخير": "last", "اخيرة": "last", "أخيرة": "last", "top": "last", "last": "last",
};

function resolveNum(s: string): number | null {
  const t = s.trim();
  if (AR_NUMS[t] !== undefined) return AR_NUMS[t];
  const n = parseFloat(t.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

/* ─── Property type dictionaries ──────────────────────────────────────────── */
interface TypeEntry { ar: string; category: "residential" | "commercial" | "land" | "industrial"; }

const PROPERTY_TYPES: { patterns: RegExp; entry: TypeEntry }[] = [
  { patterns: /\bشق[هة]\b|\bشقق\b|\bapartment\b|\bflat\b/i,             entry: { ar: "شقة",         category: "residential" } },
  { patterns: /\bفيلا\b|\bفلة\b|\bvilla\b/i,                             entry: { ar: "فيلا",         category: "residential" } },
  { patterns: /\bمنزل\b|\bبيت\b|\bبيوت\b|\bhouse\b|\bhome\b/i,          entry: { ar: "منزل",         category: "residential" } },
  { patterns: /\bدوبلكس\b|\bduplex\b/i,                                   entry: { ar: "دوبلكس",       category: "residential" } },
  { patterns: /\bتريبلكس\b|\btriplex\b/i,                                 entry: { ar: "تريبلكس",      category: "residential" } },
  { patterns: /\bروف\b|\bرووف\b|\bروف توب\b|\broof\b/i,                  entry: { ar: "روف",          category: "residential" } },
  { patterns: /\bاستوديو\b|\bستوديو\b|\bstudio\b/i,                      entry: { ar: "استوديو",      category: "residential" } },
  { patterns: /\bغرف[هة] فندقي[هة]\b|\bوحد[هة] فندقي[هة]\b/i,          entry: { ar: "وحدة فندقية",  category: "residential" } },
  { patterns: /\bتاون هاوس\b|\btownhouse\b|\btown house\b/i,             entry: { ar: "تاون هاوس",    category: "residential" } },
  { patterns: /\bعمارة\b|\bعمار[هة]\b/i,                                  entry: { ar: "عمارة",        category: "residential" } },
  { patterns: /\bمحل\b|\bمحلات\b|\bshop\b|\bstore\b|\bretail\b/i,        entry: { ar: "محل تجاري",   category: "commercial" } },
  { patterns: /\bمكتب\b|\bمكاتب\b|\boffice\b/i,                           entry: { ar: "مكتب",         category: "commercial" } },
  { patterns: /\bمستودع\b|\bمخزن\b|\bwarehou?se\b|\bstorage\b/i,         entry: { ar: "مستودع",       category: "commercial" } },
  { patterns: /\bعيادة\b|\bclinic\b/i,                                     entry: { ar: "عيادة",        category: "commercial" } },
  { patterns: /\bصيدلية\b|\bpharmacy\b/i,                                  entry: { ar: "صيدلية",       category: "commercial" } },
  { patterns: /\bمطعم\b|\bكافيه\b|\brestaurant\b|\bcafe\b/i,              entry: { ar: "مطعم",         category: "commercial" } },
  { patterns: /\bمعرض\b|\bshowroom\b|\bshow\s*room\b/i,                   entry: { ar: "معرض",         category: "commercial" } },
  { patterns: /\bفندق\b|\bhotel\b/i,                                       entry: { ar: "فندق",         category: "commercial" } },
  { patterns: /\bأرض\b|\bارض\b|\bقطعة\b|\bland\b|\bplot\b/i,             entry: { ar: "أرض",              category: "land"       } },
  { patterns: /\bمزرعة\b|\bفارم\b|\bfarm\b/i,                             entry: { ar: "مزرعة",            category: "land"       } },
  // Industrial — compound phrases first so they take priority over single-word matches
  { patterns: /مستودع\s*صناعي|industrial\s+warehouse/i,   entry: { ar: "مستودع صناعي",  category: "industrial" } },
  { patterns: /منشأة\s*صناعية|منشآت\s*صناعية|industrial\s+facility/i, entry: { ar: "منشأة صناعية", category: "industrial" } },
  { patterns: /مصنع|مصانع|factory|factories/i,             entry: { ar: "مصنع",           category: "industrial" } },
  { patterns: /ورشة|ورش|workshop/i,                        entry: { ar: "ورشة",           category: "industrial" } },
];

/* ─── Listing type ────────────────────────────────────────────────────────── */
const LISTING_PATTERNS: { pattern: RegExp; type: "sale" | "rent" | "investment" }[] = [
  { pattern: /للبيع|بيع|sale|for\s*sale|مباع|يباع/i,          type: "sale" },
  { pattern: /للإيجار|للايجار|إيجار|ايجار|rent|for\s*rent/i,  type: "rent" },
  { pattern: /للاستثمار|استثمار|investment/i,                  type: "investment" },
];

/* ─── Egyptian location database ─────────────────────────────────────────── */
// Governorates (محافظات)
const GOVERNORATES: Record<string, string> = {
  "القاهرة": "القاهرة", "كايرو": "القاهرة", "cairo": "القاهرة",
  "الجيزة": "الجيزة", "جيزة": "الجيزة", "giza": "الجيزة",
  "الإسكندرية": "الإسكندرية", "اسكندرية": "الإسكندرية", "اسكندريه": "الإسكندرية", "alexandria": "الإسكندرية",
  "الشرقية": "الشرقية", "شرقية": "الشرقية",
  "الغربية": "الغربية", "غربية": "الغربية",
  "المنوفية": "المنوفية", "منوفية": "المنوفية",
  "البحيرة": "البحيرة", "بحيرة": "البحيرة",
  "كفر الشيخ": "كفر الشيخ",
  "الدقهلية": "الدقهلية", "دقهلية": "الدقهلية",
  "دمياط": "دمياط",
  "بورسعيد": "بورسعيد",
  "الإسماعيلية": "الإسماعيلية", "اسماعيلية": "الإسماعيلية",
  "السويس": "السويس", "سويس": "السويس",
  "شمال سيناء": "شمال سيناء",
  "جنوب سيناء": "جنوب سيناء",
  "الفيوم": "الفيوم", "فيوم": "الفيوم",
  "بني سويف": "بني سويف",
  "المنيا": "المنيا", "منيا": "المنيا",
  "أسيوط": "أسيوط", "اسيوط": "أسيوط",
  "سوهاج": "سوهاج",
  "قنا": "قنا",
  "الأقصر": "الأقصر", "اقصر": "الأقصر", "luxor": "الأقصر",
  "أسوان": "أسوان", "اسوان": "أسوان", "aswan": "أسوان",
  "البحر الأحمر": "البحر الأحمر",
  "الوادي الجديد": "الوادي الجديد",
  "مطروح": "مطروح",
};

// Major cities & districts — value = city name, key = all possible spellings
const CITIES_MAP: Record<string, string> = {
  // الإسكندرية — أحياء ومناطق
  "سيدي بشر": "سيدي بشر",
  "ميامي": "ميامي",
  "المندرة": "المندرة",
  "المعمورة": "المعمورة",
  "زيزينيا": "زيزينيا",
  "عصافرة": "عصافرة",
  "الشاطبي": "الشاطبي",
  "كليوباترا": "كليوباترا",
  "سبورتنج": "سبورتنج",
  "رشدي": "رشدي",
  "محطة الرمل": "محطة الرمل", "رمل": "محطة الرمل",
  "سيدي جابر": "سيدي جابر",
  "جليم": "جليم",
  "لوران": "لوران",
  "بكوس": "بكوس", "باكوس": "بكوس",
  "فيكتوريا": "فيكتوريا",
  "المنشية": "المنشية", "المنشيه": "المنشية",
  "باب شرق": "باب شرق",
  "الأزاريطة": "الأزاريطة",
  "الفلكي": "الفلكي",
  "العطارين": "العطارين",
  "محرم بك": "محرم بك",
  "الشلالات": "الشلالات",
  "كوم الدكة": "كوم الدكة",
  "الجمرك": "الجمرك",
  "اللبان": "اللبان",
  "بحري": "بحري",
  "الورديان": "الورديان",
  "الأنفوشي": "الأنفوشي",
  "قايتباي": "قايتباي",
  "المكس": "المكس",
  "العجمي": "العجمي",
  "المتراس": "المتراس",
  "الهانوفيل": "الهانوفيل",
  "سيدي كرير": "سيدي كرير",
  "أبو تلات": "أبو تلات", "ابو تلات": "أبو تلات",
  "العامرية": "العامرية",
  "الدخيلة": "الدخيلة",
  "أبو قير": "أبو قير", "ابو قير": "أبو قير",
  "إيدكو": "إيدكو", "ايدكو": "إيدكو",
  "برج العرب": "برج العرب",
  "العلمين الجديدة": "العلمين الجديدة",
  // القاهرة الكبرى
  "مدينة نصر": "مدينة نصر",
  "المعادي": "المعادي", "معادي": "المعادي",
  "الزمالك": "الزمالك",
  "المهندسين": "المهندسين",
  "الدقي": "الدقي",
  "العباسية": "العباسية",
  "حلوان": "حلوان",
  "المرج": "المرج",
  "عين شمس": "عين شمس",
  "مصر الجديدة": "مصر الجديدة", "هليوبوليس": "مصر الجديدة",
  "الرحاب": "الرحاب",
  "مدينتي": "مدينتي",
  "التجمع الخامس": "التجمع الخامس", "التجمع": "التجمع الخامس",
  "القاهرة الجديدة": "القاهرة الجديدة",
  "العاشر من رمضان": "العاشر من رمضان",
  "بدر": "مدينة بدر",
  "الشيخ زايد": "الشيخ زايد",
  "6 أكتوبر": "السادس من أكتوبر", "6 اكتوبر": "السادس من أكتوبر", "السادس من أكتوبر": "السادس من أكتوبر",
  "أكتوبر": "السادس من أكتوبر",
  "الحسين": "الحسين", "خان الخليلي": "خان الخليلي",
  "فيصل": "فيصل", "هرم": "الهرم", "الهرم": "الهرم",
  "الدوقي": "الدوقي",
  "بولاق": "بولاق",
  "الوراق": "الوراق",
  "امبابة": "إمبابة", "إمبابة": "إمبابة",
  "أوسيم": "أوسيم", "اوسيم": "أوسيم",
  "كرداسة": "كرداسة",
  "البساتين": "البساتين",
  "المقطم": "المقطم", "مقطم": "المقطم",
  "الزيتون": "الزيتون",
  "روض الفرج": "روض الفرج",
  "المنيل": "المنيل",
  "الأميرية": "الأميرية",
  // الساحل الشمالي
  "العلمين": "العلمين", "الساحل الشمالي": "الساحل الشمالي",
  "مرسى مطروح": "مرسى مطروح",
  // البحر الأحمر
  "الغردقة": "الغردقة", "هرغادة": "الغردقة", "hurghada": "الغردقة",
  "الغردقه": "الغردقة",
  "شرم الشيخ": "شرم الشيخ", "sharm": "شرم الشيخ",
  "دهب": "دهب",
  "مرسى علم": "مرسى علم",
  "سفاجا": "سفاجا",
  "الجونة": "الجونة",
  // سيناء
  "العريش": "العريش",
  "طابا": "طابا",
  "نويبع": "نويبع",
  // الشرقية
  "الزقازيق": "الزقازيق", "زقازيق": "الزقازيق",
  "بلبيس": "بلبيس",
  "الإسماعيلية": "الإسماعيلية",
  // المنوفية
  "شبين الكوم": "شبين الكوم",
  "منوف": "منوف",
  "السادات": "مدينة السادات",
  // البحيرة
  "دمنهور": "دمنهور",
  "كفر الدوار": "كفر الدوار",
  "الرشيد": "الرشيد",
  "ابو المطامير": "أبو المطامير",
  // الغربية
  "طنطا": "طنطا",
  "المحلة": "المحلة الكبرى", "المحلة الكبرى": "المحلة الكبرى",
  "كفر الزيات": "كفر الزيات",
  "زفتى": "زفتى",
  // صعيد مصر
  "المنيا": "المنيا",
  "أسيوط": "أسيوط",
  "سوهاج": "سوهاج",
  "قنا": "قنا",
  "الأقصر": "الأقصر",
  "إدفو": "إدفو", "ادفو": "إدفو",
  "الفيوم": "الفيوم",
  "بني سويف": "بني سويف",
};

/* ─── Location blacklist ──────────────────────────────────────────────────── */
const LOCATION_BLACKLIST = new Set([
  "بيع", "إيجار", "ايجار", "استثمار",
  "كامل", "نص", "نصف", "بدون", "خام",
  "لوكس", "تشطيب", "تشطيبات", "مفروش", "مفروشة",
  "مصعد", "جراج", "حديقة", "ناصية",
  "الدور", "الطابق", "الأرضي", "ارضي",
]);

/* ─── Governorate extractor ───────────────────────────────────────────────── */
function extractGovernorate(text: string): string | null {
  for (const [key, val] of Object.entries(GOVERNORATES)) {
    const re = new RegExp(`\\b${key}\\b`, "iu");
    if (re.test(text)) return val;
  }
  return null;
}

/* ─── City extractor ──────────────────────────────────────────────────────── */
function extractCity(text: string): string | null {
  for (const [key, val] of Object.entries(CITIES_MAP)) {
    const re = new RegExp(`\\b${key}\\b`, "iu");
    if (re.test(text)) return val;
  }
  return null;
}

/* ─── Location with confidence ────────────────────────────────────────────── */
function extractLocationWithConfidence(text: string): {
  location: string | null;
  locationConfidence: "high" | "medium" | "low" | null;
} {
  // High confidence: matched city name or governorate directly
  const city = extractCity(text);
  if (city) return { location: city, locationConfidence: "high" };

  const gov = extractGovernorate(text);
  if (gov) return { location: gov, locationConfidence: "high" };

  // Medium: extracted via preposition pattern
  const m = text.match(
    /(?:في|بشارع|بحي|بمنطقة|بناحية|بمدينة|ببـ?)\s+([^\s،,\.!؟]{3,15})/u,
  );
  if (m) {
    const loc = m[1].trim();
    if (!LOCATION_BLACKLIST.has(loc) && loc.length >= 3) {
      return { location: loc, locationConfidence: "medium" };
    }
  }

  // Low: something vague found
  const m2 = text.match(/(?:منطقة|حي|ناحية)\s+([^\s،,\.!؟]{3,15})/u);
  if (m2) {
    const loc = m2[1].trim();
    if (!LOCATION_BLACKLIST.has(loc)) {
      return { location: loc, locationConfidence: "low" };
    }
  }

  return { location: null, locationConfidence: null };
}

/* ─── Phone extraction — all numbers ────────────────────────────────────── */
function extractAllPhones(text: string): string[] {
  const raw: string[] = [];
  for (const m of text.matchAll(/(?:\+20|00\s*20|0)\s*?1[0-9]\d{8}/g)) {
    raw.push(m[0].replace(/\s/g, ""));
  }
  // Normalise: strip +20 / 0020 prefix and add leading 0
  const normalised = raw.map(p => {
    p = p.replace(/\s/g, "");
    if (p.startsWith("+20")) p = "0" + p.slice(3);
    else if (p.startsWith("0020")) p = "0" + p.slice(4);
    return p;
  });
  return [...new Set(normalised)];
}

/* ─── WhatsApp number detection ──────────────────────────────────────────── */
function extractWhatsApp(text: string): string | null {
  // Look for a phone number preceded/followed by "واتساب" / "whatsapp" / "wa"
  const waPattern = /(?:واتساب|واتس|whatsapp|whats\s*app|wa\.?me)[:\s\-]*(?:\+20|0)?\s*1[0-9]\d{8}/iu;
  const waPatternAfter = /(?:\+20|0)\s*1[0-9]\d{8}[^٠-٩\d]*(?:واتساب|واتس|whatsapp)/iu;

  const m = text.match(waPattern) ?? text.match(waPatternAfter);
  if (!m) return null;
  const phoneMatch = m[0].match(/(?:\+20|0)\s*1[0-9]\d{8}/);
  if (!phoneMatch) return null;
  let p = phoneMatch[0].replace(/\s/g, "");
  if (p.startsWith("+20")) p = "0" + p.slice(3);
  return p;
}

/* ─── Nearby landmarks ────────────────────────────────────────────────────── */
function extractNearbyLandmarks(text: string): string[] {
  const landmarks: string[] = [];
  const patterns = [
    /(?:قريب من|قريبة من|قريباً من|بجوار|جنب|بالقرب من|على بعد[^،]*من|أمام|خلف|بجانب)\s+([^،,\.!؟\n]{3,30})/giu,
    /(?:near|next to|beside|close to|opposite)\s+([^،,\.!؟\n]{3,30})/giu,
  ];
  for (const pat of patterns) {
    for (const m of text.matchAll(pat)) {
      const lm = m[1].trim().replace(/\s+/g, " ");
      if (lm.length >= 3 && !landmarks.includes(lm)) {
        landmarks.push(lm);
      }
    }
  }
  return landmarks.slice(0, 5);
}

/* ─── Compound name ───────────────────────────────────────────────────────── */
function extractCompound(text: string): string | null {
  const m = text.match(/(?:كمبوند|مشروع|compound)\s+([^\s،,\.!؟\d]{3,25}(?:\s+[^\s،,\.!؟\d]{2,15})?)/iu);
  if (m) return m[1].trim();
  return null;
}

/* ─── Street ──────────────────────────────────────────────────────────────── */
function extractStreet(text: string): string | null {
  const m = text.match(/(?:شارع|ش\.?)\s+([^\s،,\.!؟\d]{3,20}(?:\s+[^\s،,\.!؟\d]{2,15})?)/u);
  if (m) return `شارع ${m[1].trim()}`;
  return null;
}

/* ─── Direction ───────────────────────────────────────────────────────────── */
function extractDirection(text: string): string | null {
  if (/بحري[هة]?|بحرى/.test(text))  return "بحري";
  if (/قبلي[هة]?|قبلى/.test(text))  return "قبلي";
  if (/شرقي[هة]?|شرقى/.test(text))  return "شرقي";
  if (/غربي[هة]?|غربى/.test(text))  return "غربي";
  return null;
}

/* ─── Area ────────────────────────────────────────────────────────────────── */
const AREA_PATTERNS = [
  /(\d[\d,]*(?:\.\d+)?)\s*(?:متر(?:\s*مربع)?|م²|م2|m²|m2|sqm|sqft|قدم)/i,
  /(?:المساحة|مساحته|مساحتها|مساحة|area)\s*[:\s]*(\d[\d,]*(?:\.\d+)?)/i,
  /(\d[\d,]*(?:\.\d+)?)\s*م\b/,
];

function extractArea(text: string): number | null {
  for (const pat of AREA_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      const n = parseFloat((m[1] ?? m[0]).replace(/,/g, ""));
      if (!isNaN(n) && n > 0 && n < 100_000) return n;
    }
  }
  return null;
}

/* ─── Price ───────────────────────────────────────────────────────────────── */
function extractPrice(text: string, allPhones: string[]): number | null {
  const phoneSet = new Set(allPhones);

  const millions = text.match(/(?:(\d[\d,]*(?:\.\d+)?)|(?:واحد|اثنين|اتنين|ثلاثة|تلاتة|ثلاث|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة))\s*مليون/i);
  if (millions) {
    const val = millions[1] ? parseFloat(millions[1].replace(/,/g, "")) : (AR_NUMS[millions[0].split("مليون")[0].trim()] ?? 1);
    if (val > 0) return val * 1_000_000;
  }
  const thousands = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:ألف|الف|k\b)/i);
  if (thousands) {
    const val = parseFloat(thousands[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0) return val * 1_000;
  }
  const egp = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:جنيه|ج\.م|ج\s*م|egp|£e|le)\b/i)
           ?? text.match(/(?:السعر|بسعر|ثمنه|ثمنها|قيمته|قيمتها|ب)\s*[:\s]*(\d[\d,.]*)/i);
  if (egp) {
    const val = parseFloat(egp[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0) return val;
  }
  const bigNum = text.match(/(?<![/\d])\b(\d{5,})\b(?!\s*(?:متر|م|m))/);
  if (bigNum) {
    const raw = bigNum[1];
    const asPhone = raw.startsWith("0") ? raw : `0${raw}`;
    if (!phoneSet.has(raw) && !phoneSet.has(asPhone)) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 10_000) return val;
    }
  }
  return null;
}

/* ─── Rooms ───────────────────────────────────────────────────────────────── */
function extractRooms(text: string): number | null {
  const roomWords = Object.keys(AR_NUMS).join("|");
  const m = text.match(
    new RegExp(`(\\d+|${roomWords})\\s*(?:غرف[هة]?|أوض[هة]?|اوض[هة]?|أوضة|room|bedroom|br)`, "i")
  );
  if (m) return resolveNum(m[1]);
  const ai = text.match(/([٠-٩]+)\s*(?:غرف[هة]?|أوض[هة]?)/);
  if (ai) return parseInt(ai[1].replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  return null;
}

/* ─── Bathrooms ───────────────────────────────────────────────────────────── */
function extractBathrooms(text: string): number | null {
  if (/حمامين|2\s*حمام/.test(text)) return 2;
  const m = text.match(/(\d+)\s*(?:حمام|bathroom|wc|toilet)/i);
  if (m) return parseInt(m[1]);
  if (/\bحمام\b/.test(text)) return 1;
  return null;
}

/* ─── Floor ───────────────────────────────────────────────────────────────── */
function extractFloor(text: string): number | "ground" | "last" | null {
  const floorKeys = Object.keys(AR_FLOORS).join("|");
  const m = text.match(
    new RegExp(`(?:الدور|الطابق|دور|طابق|floor)\\s*(?:ال)?(${floorKeys}|\\d+)`, "i")
  );
  if (m) {
    const k = m[1].toLowerCase();
    if (AR_FLOORS[k] !== undefined) return AR_FLOORS[k];
    const n = parseInt(k);
    if (!isNaN(n)) return n;
  }
  if (/الدور\s*الأرضي|الأرضي/.test(text)) return "ground";
  return null;
}

/* ─── Finishing ───────────────────────────────────────────────────────────── */
function extractFinishing(text: string): string | null {
  if (/سوبر لوكس|super\s*lux/i.test(text))              return "سوبر لوكس";
  if (/لوكس|luxury/i.test(text))                         return "لوكس";
  if (/نص تشطيب|نصف تشطيب|semi[\s-]?finish/i.test(text)) return "نص تشطيب";
  if (/بدون تشطيب|خام|unfin/i.test(text))               return "بدون تشطيب";
  if (/تشطيب كامل|full[\s-]?finish/i.test(text))         return "تشطيب كامل";
  return null;
}

/* ─── Furnished ───────────────────────────────────────────────────────────── */
function extractFurnished(text: string): boolean | null {
  if (/مفروش[هة]?|مأثث[هة]?|furnished/i.test(text))  return true;
  if (/غير مفروش|unfurnished|بدون فرش/i.test(text)) return false;
  return null;
}

/* ─── Features ────────────────────────────────────────────────────────────── */
const FEATURE_PATTERNS: { pattern: RegExp; label: string; category: string }[] = [
  { pattern: /مصعد|أسانسير|اسانسير|elevator|lift/i,        label: "مصعد",           category: "utilities" },
  { pattern: /جراج|جراچ|garage|parking/i,                   label: "جراج",           category: "utilities" },
  { pattern: /حديقة|جاردن|garden/i,                         label: "حديقة",          category: "outdoor" },
  { pattern: /مسبح|بسين|pool|swimming/i,                    label: "مسبح",           category: "outdoor" },
  { pattern: /تكييف|تكيي[فڤ]|ac\b|a\/c|air\s*con/i,        label: "تكييف",          category: "utilities" },
  { pattern: /بدروم|بيسمنت|basement/i,                      label: "بدروم",          category: "structure" },
  { pattern: /روف|تراس|terrace/i,                           label: "تراس",           category: "outdoor" },
  { pattern: /أمن|حارس|security/i,                          label: "أمن",            category: "security" },
  { pattern: /إنترنت|نت\b|wifi|internet/i,                  label: "إنترنت",         category: "utilities" },
  { pattern: /خط (?:تليفون|كابل)|landline/i,                label: "خط تليفون",      category: "utilities" },
  { pattern: /كهرباء|electricity|power/i,                   label: "كهرباء",         category: "utilities" },
  { pattern: /غاز\b|gas/i,                                  label: "غاز",            category: "utilities" },
  { pattern: /مياه|ماية|water/i,                            label: "مياه",           category: "utilities" },
  { pattern: /ناصية|corner/i,                               label: "ناصية",          category: "location" },
  { pattern: /إطلالة|اطلالة|view/i,                         label: "إطلالة",         category: "outdoor" },
  { pattern: /جنينة|حديقة خاصة/i,                           label: "جنينة",          category: "outdoor" },
  { pattern: /باب\s*عربية|كراج|موقف/i,                      label: "موقف سيارة",     category: "utilities" },
  { pattern: /مولد|جنراتور|generator/i,                     label: "مولد كهرباء",    category: "utilities" },
  { pattern: /كاميرات|camera|cctv/i,                        label: "كاميرات مراقبة", category: "security" },
  { pattern: /جيم|صالة رياضية|gym|fitness/i,                label: "جيم",            category: "amenities" },
  { pattern: /نادي|club\s*house|clubhouse/i,                label: "نادي",           category: "amenities" },
  { pattern: /مسجد|mosque/i,                                label: "مسجد قريب",      category: "nearby" },
  { pattern: /مدرسة|school/i,                               label: "مدرسة قريبة",    category: "nearby" },
  { pattern: /ميزان\s*ماء|عداد|عداد مياه/i,                 label: "عداد مياه",      category: "utilities" },
  { pattern: /دش|شاور|shower/i,                             label: "دش",             category: "utilities" },
  { pattern: /بلكونة|شرفة|balcony/i,                        label: "بلكونة",         category: "structure" },
];

function extractFeatures(text: string): string[] {
  return FEATURE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

/* ─── Urgent / Negotiable / Owner-direct ─────────────────────────────────── */
function extractUrgent(text: string): boolean {
  return /عاجل|ضروري|بسرعة|فرصة عمر|لا يفوت|نادر|urgent/i.test(text);
}
function extractNegotiable(text: string): boolean {
  return /قابل للتفاوض|يتفاوض|للتفاوض|negotiable/i.test(text);
}
function extractOwnerDirect(text: string): boolean {
  return /مالك مباشر|مالك|بدون وسيط|صاحب العقار|owner direct/i.test(text);
}

/* ─── Listing type ────────────────────────────────────────────────────────── */
function extractListingType(text: string): "sale" | "rent" | "investment" | null {
  for (const { pattern, type } of LISTING_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return null;
}
function extractPropertyType(text: string): TypeEntry | null {
  for (const { patterns, entry } of PROPERTY_TYPES) {
    if (patterns.test(text)) return entry;
  }
  return null;
}

/* ─── Price formatter ─────────────────────────────────────────────────────── */
function fmtPriceShort(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)} مليون`;
  }
  if (price >= 1_000) return `${Math.round(price / 1_000)} ألف`;
  return String(price);
}

/* ─── Title builder — 3 variants ─────────────────────────────────────────── */
function buildTitles(ex: ExtractedData): [string, string, string] {
  const type    = ex.propertyTypeAr ?? "";
  const listMap = { sale: "للبيع", rent: "للإيجار", investment: "للاستثمار" } as const;
  const listing = ex.listingType ? listMap[ex.listingType] : "";
  const loc     = ex.location ?? ex.compound ?? "";
  const locIn   = loc ? `في ${loc}` : "";
  const locB    = loc ? `بـ${loc}` : "";

  let badge = "";
  if (ex.furnished)                      badge = "مفروشة بالكامل";
  else if (ex.finishing === "سوبر لوكس") badge = "سوبر لوكس";
  else if (ex.finishing === "لوكس")      badge = "تشطيب لوكس";
  else if (ex.finishing === "تشطيب كامل") badge = "تشطيب كامل";
  else if (ex.features.includes("ناصية")) badge = "ناصية مميزة";
  else if (ex.features.includes("مسبح")) badge = "بمسبح خاص";
  else if (ex.features.includes("حديقة") || ex.features.includes("جنينة")) badge = "بحديقة";
  else if (ex.floor === "ground")        badge = "دور أرضي";
  else if (ex.floor === "last")          badge = "آخر دور";

  const specs: string[] = [];
  if (ex.area)      specs.push(`${ex.area}م²`);
  if (ex.rooms)     specs.push(`${ex.rooms} غرف`);
  if (ex.bathrooms) specs.push(`${ex.bathrooms} حمام`);
  const specStr = specs.join(" ");

  const A = [type, listing, badge, locIn].filter(Boolean).join(" ").trim();
  const bLeft = [badge, [type, listing, locB].filter(Boolean).join(" ")].filter(Boolean).join(" | ");
  const B = [bLeft, specStr ? `- ${specStr}` : ""].filter(Boolean).join(" ").trim();

  let hook = "";
  if (ex.urgent)          hook = "للبيع عاجل";
  else if (ex.negotiable) hook = "قابل للتفاوض";
  else if (ex.ownerDirect) hook = "مالك مباشر";
  else if (ex.listingType === "investment") hook = "فرصة استثمارية";
  else if (ex.price)      hook = `بسعر ${fmtPriceShort(ex.price)} ج.م`;
  else if (badge)         hook = `فرصة ${badge}`;

  const cCore = [type, listing, locIn].filter(Boolean).join(" ");
  const C = [hook, cCore].filter(Boolean).join(" | ").trim()
          || [type, listing, locIn, specStr ? `- ${specStr}` : ""].filter(Boolean).join(" ").trim();

  const unique = (s: string, fallback: string) => s.trim() || fallback;
  const vA = unique(A, type || "إعلان عقاري");
  let   vB = unique(B, vA);
  let   vC = unique(C, vA);
  if (vB === vA) vB = [type, listing, locIn, specStr].filter(Boolean).join(" ").trim() || vA;
  if (vC === vA || vC === vB) {
    vC = specStr
      ? [type, listing, specStr, locIn].filter(Boolean).join(" ").trim()
      : [type, listing, badge || locIn].filter(Boolean).join(" ").trim();
  }
  return [vA, vB, vC];
}

/* ─── Public interface ────────────────────────────────────────────────────── */
export interface ExtractedData {
  listingType:        "sale" | "rent" | "investment" | null;
  propertyTypeAr:     string | null;
  propertyCategory:   "residential" | "commercial" | "land" | "industrial" | null;
  area:               number | null;
  price:              number | null;
  rooms:              number | null;
  bathrooms:          number | null;
  floor:              number | "ground" | "last" | null;
  finishing:          string | null;
  furnished:          boolean | null;
  direction:          string | null;
  governorate:        string | null;
  location:           string | null;
  locationConfidence: "high" | "medium" | "low" | null;
  compound:           string | null;
  street:             string | null;
  phone:              string | null;   // primary phone
  allPhones:          string[];        // all unique phones
  whatsapp:           string | null;   // WhatsApp number if detected
  nearbyLandmarks:    string[];
  features:           string[];
  urgent:             boolean;
  negotiable:         boolean;
  ownerDirect:        boolean;
  /** @deprecated use titleVariants[0] */
  suggestedTitle:     string;
  titleVariants:      [string, string, string];
}

export function extractPropertyInfo(rawText: string): ExtractedData {
  if (!rawText || rawText.trim().length < 3) {
    return {
      listingType: null, propertyTypeAr: null, propertyCategory: null,
      area: null, price: null, rooms: null, bathrooms: null, floor: null,
      finishing: null, furnished: null, direction: null,
      governorate: null, location: null, locationConfidence: null,
      compound: null, street: null,
      phone: null, allPhones: [], whatsapp: null, nearbyLandmarks: [],
      features: [], urgent: false, negotiable: false, ownerDirect: false,
      suggestedTitle: "", titleVariants: ["", "", ""],
    };
  }

  const text = normaliseDigits(rawText);

  const typeEntry   = extractPropertyType(text);
  const listingType = extractListingType(text);
  const area        = extractArea(text);
  const allPhones   = extractAllPhones(text);
  const whatsapp    = extractWhatsApp(text);
  const price       = extractPrice(text, allPhones);
  const rooms       = extractRooms(text);
  const bathrooms   = extractBathrooms(text);
  const floor       = extractFloor(text);
  const finishing   = extractFinishing(text);
  const furnished   = extractFurnished(text);
  const direction   = extractDirection(text);
  const { location, locationConfidence } = extractLocationWithConfidence(text);
  const governorate = extractGovernorate(text);
  const compound    = extractCompound(text);
  const street      = extractStreet(text);
  const nearbyLandmarks = extractNearbyLandmarks(text);
  const features    = extractFeatures(text);
  const urgent      = extractUrgent(text);
  const negotiable  = extractNegotiable(text);
  const ownerDirect = extractOwnerDirect(text);

  const ex: ExtractedData = {
    listingType,
    propertyTypeAr:   typeEntry?.ar ?? null,
    propertyCategory: typeEntry?.category ?? null,
    area, price, rooms, bathrooms, floor,
    finishing, furnished, direction,
    governorate, location, locationConfidence,
    compound, street,
    phone: allPhones[0] ?? null,
    allPhones, whatsapp, nearbyLandmarks,
    features, urgent, negotiable, ownerDirect,
    suggestedTitle: "", titleVariants: ["", "", ""],
  };

  ex.titleVariants  = buildTitles(ex);
  ex.suggestedTitle = ex.titleVariants[0];
  return ex;
}
