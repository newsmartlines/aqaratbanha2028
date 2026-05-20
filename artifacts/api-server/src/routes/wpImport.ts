import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
  usersTable, providersTable, propertiesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();
router.use("/admin", adminOnly);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────────

interface ParsedUser {
  name: string;
  email: string;
  phone?: string;
  username?: string;
  role?: string;
  avatarUrl?: string;
  passwordHash?: string;
}

interface ParsedProperty {
  userEmail?: string;
  title: string;
  description?: string;
  price?: number;
  area?: number;
  rooms?: number;
  bathrooms?: number;
  address?: string;
  district?: string;
  city?: string;
  mainCategory?: string;
  listingType?: string;
  imageUrls?: string[];
  features?: string[];
  latitude?: number;
  longitude?: number;
  status?: string;
}

function normalizeRole(role: string): string {
  const r = (role || "").toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("provider") || r.includes("agent") || r.includes("broker") || r.includes("contributor") || r.includes("author") || r.includes("editor")) return "provider";
  return "user";
}

function normalizeCategory(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c.includes("شقة") || c.includes("apartment") || c.includes("flat") || c.includes("سكن") || c.includes("residential")) return "residential";
  if (c.includes("تجار") || c.includes("commercial") || c.includes("مكتب") || c.includes("office") || c.includes("محل") || c.includes("shop")) return "commercial";
  if (c.includes("أرض") || c.includes("land") || c.includes("قطعة") || c.includes("plot")) return "land";
  if (c.includes("فيلا") || c.includes("villa") || c.includes("منزل") || c.includes("house")) return "residential";
  if (c.includes("مصنع") || c.includes("صناعي") || c.includes("industrial") || c.includes("warehouse")) return "industrial";
  return "residential";
}

function normalizeListingType(t: string): string {
  const v = (t || "").toLowerCase();
  if (v.includes("rent") || v.includes("إيجار") || v.includes("للإيجار") || v.includes("ايجار")) return "rent";
  return "sale";
}

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): { users: ParsedUser[]; properties: ParsedProperty[] } {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { users: [], properties: [] };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const rows = lines.slice(1).map(l => parseCSVLine(l));

  const col = (row: string[], ...names: string[]) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n) || n.includes(h));
      if (idx !== -1 && row[idx]) return row[idx].replace(/^["']|["']$/g, "").trim();
    }
    return "";
  };

  const isUserSheet = headers.some(h => h.includes("email") || h.includes("user_email") || h.includes("user_login") || h.includes("user_name"));
  const isPropSheet = headers.some(h => h.includes("title") || h.includes("post_title") || h.includes("property_title"));

  const users: ParsedUser[] = [];
  const properties: ParsedProperty[] = [];

  for (const row of rows) {
    if (!row.join("").trim()) continue;

    if (isPropSheet) {
      const imageStr = col(row, "image", "photo", "thumbnail", "gallery", "images", "pictures", "media");
      const imageUrls = imageStr ? imageStr.split(/[|;,]+/).map(s => s.trim()).filter(s => s.startsWith("http")) : [];
      const featStr = col(row, "feature", "features", "amenities", "facilities");
      const features = featStr ? featStr.split(/[|;,]+/).map(s => s.trim()).filter(Boolean) : [];
      const priceRaw = col(row, "price", "property_price", "sale_price", "rent_price");
      const areaRaw = col(row, "area", "size", "square", "sqm", "property_area");

      properties.push({
        userEmail: col(row, "user_email", "author_email", "agent_email", "owner_email", "email"),
        title: col(row, "title", "post_title", "property_title", "name") || "عقار مستورد",
        description: col(row, "description", "content", "post_content", "details", "body") || "",
        price: priceRaw ? parseFloat(priceRaw.replace(/[^\d.]/g, "")) : undefined,
        area: areaRaw ? parseFloat(areaRaw.replace(/[^\d.]/g, "")) : undefined,
        rooms: parseInt(col(row, "rooms", "bedrooms", "beds", "bedroom") || "0") || undefined,
        bathrooms: parseInt(col(row, "bathrooms", "baths", "bath") || "0") || undefined,
        address: col(row, "address", "location", "full_address", "property_address"),
        district: col(row, "district", "neighborhood", "area_name", "zone", "حي"),
        city: col(row, "city", "مدينة", "town", "governorate", "governorat"),
        mainCategory: normalizeCategory(col(row, "category", "type", "property_type", "main_category", "taxonomy")),
        listingType: normalizeListingType(col(row, "listing_type", "for_sale", "for_rent", "status", "sale_rent", "offer_type")),
        imageUrls,
        features,
        latitude: parseFloat(col(row, "lat", "latitude")) || undefined,
        longitude: parseFloat(col(row, "lng", "longitude", "long")) || undefined,
        status: "active",
      });
    }

    if (isUserSheet && !isPropSheet) {
      const email = col(row, "email", "user_email", "email_address");
      if (!email || !email.includes("@")) continue;
      const ph = col(row, "password_hash", "user_pass", "password", "pass");
      users.push({
        name: col(row, "name", "display_name", "user_displayname", "full_name", "first_name") || email.split("@")[0],
        email,
        phone: col(row, "phone", "mobile", "telephone", "tel", "phone_number") || undefined,
        username: col(row, "username", "user_login", "login") || undefined,
        role: normalizeRole(col(row, "role", "user_role", "wp_role")),
        avatarUrl: col(row, "avatar", "avatar_url", "photo", "profile_image") || undefined,
        passwordHash: ph || undefined,
      });
    }
  }

  return { users, properties };
}

// ── XML / WXR Parser ───────────────────────────────────────────────────────────
function xmlVal(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match ? match[1].trim() : "";
}

function xmlAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  return (xml.match(re) || []);
}

function parseWXR(content: string): { users: ParsedUser[]; properties: ParsedProperty[] } {
  const users: ParsedUser[] = [];
  const properties: ParsedProperty[] = [];

  const authorBlocks = xmlAll(content, "wp:author");
  for (const block of authorBlocks) {
    const email = xmlVal(block, "wp:author_email");
    if (!email || !email.includes("@")) continue;
    users.push({
      name: xmlVal(block, "wp:author_display_name") || email.split("@")[0],
      email,
      username: xmlVal(block, "wp:author_login") || undefined,
      role: "provider",
      passwordHash: undefined,
    });
  }

  const itemBlocks = xmlAll(content, "item");
  for (const item of itemBlocks) {
    const postType = xmlVal(item, "wp:post_type");
    if (!["property", "post", "listing", "real-estate", "estate", "realestate"].includes(postType.toLowerCase()) && postType !== "") continue;
    const title = xmlVal(item, "title");
    if (!title) continue;

    const getMeta = (key: string): string => {
      const metaBlocks = xmlAll(item, "wp:postmeta");
      for (const m of metaBlocks) {
        const k = xmlVal(m, "wp:meta_key");
        if (k === key || k.toLowerCase() === key.toLowerCase()) return xmlVal(m, "wp:meta_value");
      }
      return "";
    };

    const creator = xmlVal(item, "dc:creator") || xmlVal(item, "wp:post_author");
    const userEmail = users.find(u => u.username === creator)?.email || creator;

    const content_ = xmlVal(item, "content:encoded") || xmlVal(item, "description");

    const imgTag = xmlVal(item, "wp:attachment_url");
    const galleryStr = getMeta("_property_images") || getMeta("gallery") || getMeta("images") || getMeta("property_gallery");
    const imageUrls: string[] = [];
    if (imgTag && imgTag.startsWith("http")) imageUrls.push(imgTag);
    if (galleryStr) galleryStr.split(/[|;,]+/).filter(u => u.startsWith("http")).forEach(u => imageUrls.push(u));

    const priceStr = getMeta("price") || getMeta("_price") || getMeta("property_price") || getMeta("fave_property_price");
    const areaStr = getMeta("area") || getMeta("_area") || getMeta("property_area") || getMeta("fave_property_size");
    const catEl = xmlAll(item, "category").find(c => !/tag/i.test(c));
    const catText = catEl ? xmlVal(catEl, "category") : "";

    const listType = getMeta("listing_type") || getMeta("fave_property_status") || getMeta("property_status") || xmlAll(item, "category").find(c => /rent|sale|للبيع|للإيجار/i.test(c)) ? "" : "";

    properties.push({
      userEmail: userEmail || undefined,
      title,
      description: content_.replace(/<[^>]+>/g, "").trim(),
      price: priceStr ? parseFloat(priceStr.replace(/[^\d.]/g, "")) : undefined,
      area: areaStr ? parseFloat(areaStr.replace(/[^\d.]/g, "")) : undefined,
      rooms: parseInt(getMeta("bedrooms") || getMeta("_bedrooms") || getMeta("fave_property_bedrooms") || "0") || undefined,
      bathrooms: parseInt(getMeta("bathrooms") || getMeta("_bathrooms") || getMeta("fave_property_bathrooms") || "0") || undefined,
      address: getMeta("address") || getMeta("_address") || getMeta("fave_property_map_address") || "",
      city: getMeta("city") || getMeta("_city") || "",
      district: getMeta("district") || getMeta("neighborhood") || "",
      mainCategory: normalizeCategory(catText || getMeta("property_type") || getMeta("fave_property_type") || ""),
      listingType: normalizeListingType(listType || getMeta("listing_type") || getMeta("fave_property_status") || "sale"),
      imageUrls,
      features: [],
      latitude: parseFloat(getMeta("latitude") || getMeta("_latitude") || getMeta("fave_property_map_latitude") || "0") || undefined,
      longitude: parseFloat(getMeta("longitude") || getMeta("_longitude") || getMeta("fave_property_map_longitude") || "0") || undefined,
      status: "active",
    });
  }

  return { users, properties };
}

// ── SQL Parser ─────────────────────────────────────────────────────────────────
function parseSQLInsert(content: string, table: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  const re = new RegExp(`INSERT INTO \`?${table}\`? \\(([^)]+)\\) VALUES\\s*(.+?)(?=INSERT INTO|\\/\\*|--|$)`, "gis");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const cols = m[1].split(",").map(c => c.trim().replace(/`/g, ""));
    const valBlock = m[2];
    const valRe = /\(([^)]*)\)/g;
    let vm: RegExpExecArray | null;
    while ((vm = valRe.exec(valBlock)) !== null) {
      const vals = vm[1].split(",").map(v => v.trim().replace(/^'|'$/g, "").replace(/''/g, "'"));
      const row: Record<string, string> = {};
      cols.forEach((c, i) => { row[c] = vals[i] ?? ""; });
      results.push(row);
    }
  }
  return results;
}

function parseSQL(content: string): { users: ParsedUser[]; properties: ParsedProperty[] } {
  const users: ParsedUser[] = [];
  const properties: ParsedProperty[] = [];

  const wpUsers = parseSQLInsert(content, "wp_users");
  const wpUserMeta = parseSQLInsert(content, "wp_usermeta");
  const wpPosts = parseSQLInsert(content, "wp_posts");
  const wpPostMeta = parseSQLInsert(content, "wp_postmeta");

  const getMeta = (metas: Record<string, string>[], userId: string, key: string) =>
    metas.find(m => m.user_id === userId && m.meta_key === key)?.meta_value ?? "";

  const getPostMeta = (metas: Record<string, string>[], postId: string, key: string) =>
    metas.find(m => m.post_id === postId && m.meta_key === key)?.meta_value ?? "";

  for (const u of wpUsers) {
    if (!u.user_email || !u.user_email.includes("@")) continue;
    const phone = getMeta(wpUserMeta, u.ID, "phone") || getMeta(wpUserMeta, u.ID, "billing_phone");
    users.push({
      name: u.display_name || u.user_login || u.user_email.split("@")[0],
      email: u.user_email,
      phone: phone || undefined,
      username: u.user_login || undefined,
      role: "provider",
      passwordHash: u.user_pass && u.user_pass.startsWith("$P$") ? undefined : undefined,
    });
  }

  for (const p of wpPosts) {
    if (!p.post_title?.trim()) continue;
    const pt = p.post_type?.toLowerCase() ?? "";
    if (!["property", "post", "listing", "estate", "real-estate"].includes(pt)) continue;
    if (p.post_status === "trash" || p.post_status === "auto-draft") continue;

    const author = wpUsers.find(u => u.ID === p.post_author);
    const priceStr = getPostMeta(wpPostMeta, p.ID, "price") || getPostMeta(wpPostMeta, p.ID, "_price") || getPostMeta(wpPostMeta, p.ID, "fave_property_price");
    const areaStr = getPostMeta(wpPostMeta, p.ID, "area") || getPostMeta(wpPostMeta, p.ID, "fave_property_size");

    const thumbId = getPostMeta(wpPostMeta, p.ID, "_thumbnail_id");
    const thumbPost = thumbId ? wpPosts.find(pp => pp.ID === thumbId && pp.post_type === "attachment") : null;
    const imageUrls = thumbPost?.guid ? [thumbPost.guid] : [];

    properties.push({
      userEmail: author?.user_email || undefined,
      title: p.post_title,
      description: (p.post_content || "").replace(/<[^>]+>/g, "").trim(),
      price: priceStr ? parseFloat(priceStr.replace(/[^\d.]/g, "")) : undefined,
      area: areaStr ? parseFloat(areaStr.replace(/[^\d.]/g, "")) : undefined,
      rooms: parseInt(getPostMeta(wpPostMeta, p.ID, "bedrooms") || getPostMeta(wpPostMeta, p.ID, "fave_property_bedrooms") || "0") || undefined,
      bathrooms: parseInt(getPostMeta(wpPostMeta, p.ID, "bathrooms") || getPostMeta(wpPostMeta, p.ID, "fave_property_bathrooms") || "0") || undefined,
      address: getPostMeta(wpPostMeta, p.ID, "address") || getPostMeta(wpPostMeta, p.ID, "fave_property_map_address") || p.post_name || "",
      city: getPostMeta(wpPostMeta, p.ID, "city") || "",
      district: getPostMeta(wpPostMeta, p.ID, "district") || "",
      mainCategory: normalizeCategory(getPostMeta(wpPostMeta, p.ID, "property_type") || ""),
      listingType: normalizeListingType(getPostMeta(wpPostMeta, p.ID, "listing_type") || getPostMeta(wpPostMeta, p.ID, "fave_property_status") || ""),
      imageUrls,
      features: [],
      status: p.post_status === "publish" ? "active" : "pending",
    });
  }

  return { users, properties };
}

// ── Image Downloader ───────────────────────────────────────────────────────────
function downloadImage(url: string): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const ext = (url.split(".").pop()?.split("?")[0] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 4) || "jpg";
      const fname = crypto.randomBytes(12).toString("hex") + "." + (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg");
      const dest = path.join(UPLOADS_DIR, fname);
      const proto = url.startsWith("https") ? https : http;
      const req = proto.get(url, { timeout: 10000 }, res => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null); }
        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => resolve("/uploads/properties/" + fname));
        out.on("error", () => resolve(null));
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

// ── Import Engine ──────────────────────────────────────────────────────────────
async function importData(users: ParsedUser[], properties: ParsedProperty[], downloadImages: boolean) {
  const results = {
    usersImported: 0, usersSkipped: 0, usersErrors: [] as string[],
    propertiesImported: 0, propertiesSkipped: 0, propertiesErrors: [] as string[],
    imagesDownloaded: 0, imageErrors: 0,
  };

  const emailToProviderId = new Map<string, number>();

  for (const u of users) {
    try {
      const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, u.email.toLowerCase()));
      let userId: number;

      if (existing.length > 0) {
        userId = existing[0].id;
        results.usersSkipped++;
      } else {
        const hash = u.passwordHash || await bcrypt.hash(crypto.randomBytes(12).toString("hex"), 10);
        const [newUser] = await db.insert(usersTable).values({
          name: u.name || u.email.split("@")[0],
          email: u.email.toLowerCase(),
          phone: u.phone || null,
          passwordHash: hash,
          role: (u.role === "admin" ? "user" : u.role) as "user" | "provider",
          avatar: null,
          status: "active",
        }).returning({ id: usersTable.id });
        userId = newUser.id;
        results.usersImported++;
      }

      const provExisting = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.userId, userId));
      let providerId: number;
      if (provExisting.length > 0) {
        providerId = provExisting[0].id;
      } else {
        let avatarPath: string | null = null;
        if (u.avatarUrl && u.avatarUrl.startsWith("http") && downloadImages) {
          avatarPath = await downloadImage(u.avatarUrl);
        }
        const [newProv] = await db.insert(providersTable).values({
          userId,
          bio: null,
          avatar: avatarPath,
          phone: u.phone || null,
          active: true,
          approved: true,
          verified: false,
          featured: false,
          suspended: false,
        }).returning({ id: providersTable.id });
        providerId = newProv.id;
      }

      emailToProviderId.set(u.email.toLowerCase(), providerId);

    } catch (err: any) {
      results.usersErrors.push(`${u.email}: ${err?.message ?? "خطأ"}`);
    }
  }

  for (const p of properties) {
    try {
      let providerId: number | undefined;

      if (p.userEmail) {
        providerId = emailToProviderId.get(p.userEmail.toLowerCase());
        if (!providerId) {
          const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, p.userEmail.toLowerCase()));
          if (existingUser) {
            const [prov] = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.userId, existingUser.id));
            if (prov) { providerId = prov.id; emailToProviderId.set(p.userEmail.toLowerCase(), prov.id); }
            else {
              const [newProv] = await db.insert(providersTable).values({ userId: existingUser.id, active: true, approved: true, verified: false, featured: false, suspended: false }).returning({ id: providersTable.id });
              providerId = newProv.id;
              emailToProviderId.set(p.userEmail.toLowerCase(), newProv.id);
            }
          }
        }
      }

      if (!providerId) { results.propertiesSkipped++; continue; }

      const localImages: string[] = [];
      if (p.imageUrls && p.imageUrls.length > 0) {
        for (const imgUrl of p.imageUrls.slice(0, 10)) {
          if (!imgUrl.startsWith("http")) continue;
          if (downloadImages) {
            const local = await downloadImage(imgUrl);
            if (local) { localImages.push(local); results.imagesDownloaded++; }
            else { localImages.push(imgUrl); results.imageErrors++; }
          } else {
            localImages.push(imgUrl);
          }
        }
      }

      await db.insert(propertiesTable).values({
        providerId,
        title: p.title || "عقار مستورد",
        description: p.description || null,
        mainCategory: p.mainCategory || "residential",
        listingType: p.listingType || "sale",
        price: p.price ? String(p.price) : null,
        area: p.area ? String(p.area) : null,
        rooms: p.rooms || null,
        bathrooms: p.bathrooms || null,
        address: p.address || null,
        district: p.district || null,
        images: localImages.length > 0 ? JSON.stringify(localImages) : null,
        features: p.features && p.features.length > 0 ? JSON.stringify(p.features) : null,
        latitude: p.latitude ? String(p.latitude) : null,
        longitude: p.longitude ? String(p.longitude) : null,
        status: (p.status || "active") as "active" | "pending" | "rejected",
        viewCount: 0,
        phoneClickCount: 0,
      });
      results.propertiesImported++;

    } catch (err: any) {
      results.propertiesErrors.push(`${p.title}: ${err?.message ?? "خطأ"}`);
    }
  }

  return results;
}

// ── API Endpoint ───────────────────────────────────────────────────────────────
router.post("/admin/wp-import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "لم يتم رفع ملف" });

    const importType = (req.body.importType as string) || "auto";
    const downloadImages = req.body.downloadImages !== "false";
    const content = req.file.buffer.toString("utf-8");
    const filename = (req.file.originalname || "").toLowerCase();

    let users: ParsedUser[] = [];
    let properties: ParsedProperty[] = [];

    if (importType === "xml" || filename.endsWith(".xml") || content.trim().startsWith("<") || content.includes("<wp:wxr_version")) {
      ({ users, properties } = parseWXR(content));
    } else if (importType === "sql" || filename.endsWith(".sql") || content.toLowerCase().includes("insert into")) {
      ({ users, properties } = parseSQL(content));
    } else {
      ({ users, properties } = parseCSV(content));
    }

    const preview = req.body.preview === "true";
    if (preview) {
      return res.json({
        success: true,
        data: {
          preview: true,
          detectedFormat: importType,
          usersFound: users.length,
          propertiesFound: properties.length,
          sampleUsers: users.slice(0, 5).map(u => ({ name: u.name, email: u.email, role: u.role })),
          sampleProperties: properties.slice(0, 5).map(p => ({ title: p.title, userEmail: p.userEmail, price: p.price, category: p.mainCategory, type: p.listingType })),
        },
      });
    }

    const results = await importData(users, properties, downloadImages);
    res.json({ success: true, data: { ...results, totalUsers: users.length, totalProperties: properties.length } });

  } catch (err: any) {
    console.error("[WP Import]", err);
    res.status(500).json({ success: false, error: err?.message ?? "فشل الاستيراد" });
  }
});

export default router;
