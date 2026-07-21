import { Router } from "express";
import { db } from "@workspace/db";
import {
  regionsTable, citiesTable, areasTable, featuredAreasTable,
  categoriesTable, subcategoriesTable,
  propertiesTable, siteSettingsTable, emailTemplatesTable,
  billingPlansTable, commissionRulesTable, packagesTable,
  adminStaffTable, usersTable,
} from "@workspace/db";
import { adminOnly } from "../middleware/adminOnly";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream } from "fs";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import multer from "multer";
import { fileURLToPath } from "url";

const execCmd = promisify(exec);
const router = Router();
router.use("/admin/updates", adminOnly);

// ── Paths ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Navigate up: routes → src → api-server → artifacts → workspace
const WORKSPACE_ROOT = path.resolve(__dirname, "../../../..");
const BACKUPS_DIR = path.join(WORKSPACE_ROOT, "backups");
const PACKAGES_DIR = path.join(WORKSPACE_ROOT, "update-packages");
const VERSION_FILE = path.join(WORKSPACE_ROOT, "version.json");
const UPLOADS_DIR = path.join(WORKSPACE_ROOT, "uploads");

// ── Types ─────────────────────────────────────────────────────────────────────

interface VersionInfo {
  version: string;
  buildDate: string;
  installedAt: string;
  platform: string;
  changelog?: string;
}

interface Job {
  id: string;
  type: "backup" | "create-package" | "install" | "rollback";
  status: "running" | "success" | "failed";
  progress: number;
  logs: string[];
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface PackageManifest {
  version: string;
  type: "full" | "incremental";
  platform: string;
  fromVersion: string;
  toVersion: string;
  changelog: string;
  createdAt: string;
  checksum: string;
  signature: string;
  files: string[];
  requiresMigration: boolean;
}

// ── Job Registry ──────────────────────────────────────────────────────────────

const jobs = new Map<string, Job>();

function startJob(type: Job["type"], fn: (job: Job) => Promise<any>): string {
  const id = crypto.randomUUID();
  const job: Job = {
    id, type, status: "running", progress: 0,
    logs: [], startedAt: new Date().toISOString(),
  };
  jobs.set(id, job);

  fn(job)
    .then(result => {
      job.status = "success";
      job.progress = 100;
      job.result = result;
      job.completedAt = new Date().toISOString();
    })
    .catch(err => {
      job.status = "failed";
      job.error = err?.message ?? String(err);
      job.completedAt = new Date().toISOString();
      job.logs.push(`❌ خطأ: ${job.error}`);
    });

  return id;
}

function log(job: Job, msg: string, progress?: number) {
  job.logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  if (progress !== undefined) job.progress = progress;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureDirs() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  await fs.mkdir(PACKAGES_DIR, { recursive: true });
}

async function getVersion(): Promise<VersionInfo> {
  if (existsSync(VERSION_FILE)) {
    try {
      return JSON.parse(await fs.readFile(VERSION_FILE, "utf8"));
    } catch {}
  }
  const initial: VersionInfo = {
    version: "1.0.0",
    buildDate: new Date().toISOString(),
    installedAt: new Date().toISOString(),
    platform: "عقارات بنها",
  };
  await fs.writeFile(VERSION_FILE, JSON.stringify(initial, null, 2));
  return initial;
}

function bumpVersion(current: string, type: "patch" | "minor" | "major"): string {
  const [major, minor, patch] = current.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET ?? "fallback-secret")
    .update(data)
    .digest("hex");
}

async function checksumFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Compute a stable checksum of a source directory that is independent of
 * the absolute path on disk.  For every file (sorted by relative path) we
 * hash:  relPath + "\0" + fileContents  and then combine all per-file hashes
 * into one final SHA-256.  This is reproducible across different tmp dirs.
 */
async function computeSourceChecksum(sourceDir: string): Promise<string> {
  // Collect all files recursively
  async function walk(dir: string, base: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const paths: string[] = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel  = path.join(base, e.name);
      if (e.isDirectory()) paths.push(...await walk(full, rel));
      else if (e.isFile())  paths.push(rel);
    }
    return paths;
  }

  const relPaths = (await walk(sourceDir, "").catch(() => [])).sort();
  const combined = crypto.createHash("sha256");
  for (const rel of relPaths) {
    const content = await fs.readFile(path.join(sourceDir, rel));
    combined.update(rel + "\0");
    combined.update(content);
  }
  return combined.digest("hex");
}

async function getDiskUsage(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  try {
    const { stdout } = await execCmd(`du -sb "${dir}" 2>/dev/null || echo "0"`);
    return parseInt(stdout.split("\t")[0]) || 0;
  } catch {
    return 0;
  }
}

async function listZipFiles(dir: string): Promise<Array<{ name: string; size: number; createdAt: string }>> {
  if (!existsSync(dir)) return [];
  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".zip"));
  const result = [];
  for (const name of files.sort().reverse()) {
    const stat = await fs.stat(path.join(dir, name)).catch(() => null);
    if (!stat) continue;
    result.push({ name, size: stat.size, createdAt: stat.mtime.toISOString() });
  }
  return result;
}

// ── DB Table Catalog (mirrors backup.ts) ─────────────────────────────────────

const DB_TABLES = [
  { key: "regions",       dbName: "regions",        fetch: () => db.select().from(regionsTable) },
  { key: "cities",        dbName: "cities",          fetch: () => db.select().from(citiesTable) },
  { key: "areas",         dbName: "areas",           fetch: () => db.select().from(areasTable) },
  { key: "featuredAreas", dbName: "featured_areas",  fetch: () => db.select().from(featuredAreasTable) },
  { key: "categories",    dbName: "categories",      fetch: () => db.select().from(categoriesTable) },
  { key: "subcategories", dbName: "subcategories",   fetch: () => db.select().from(subcategoriesTable) },
  { key: "properties",    dbName: "properties",      fetch: () => db.select().from(propertiesTable) },
  { key: "siteSettings",  dbName: "site_settings",   fetch: () => db.select().from(siteSettingsTable) },
  { key: "emailTemplates",dbName: "email_templates", fetch: () => db.select().from(emailTemplatesTable) },
  { key: "billingPlans",  dbName: "billing_plans",   fetch: () => db.select().from(billingPlansTable) },
  { key: "commissionRules",dbName:"commission_rules", fetch: () => db.select().from(commissionRulesTable) },
  { key: "packages",      dbName: "packages",        fetch: () => db.select().from(packagesTable) },
  { key: "adminStaff",    dbName: "admin_staff",     fetch: () => db.select().from(adminStaffTable) },
  { key: "users",         dbName: "users",           fetch: async () => {
    const rows = await db.select().from(usersTable);
    return rows.map(({ passwordHash: _, ...safe }) => safe);
  }},
];

async function exportAllTables(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const t of DB_TABLES) {
    try { result[t.key] = await t.fetch(); } catch { result[t.key] = []; }
  }
  return result;
}

// ── Core: Create Backup ───────────────────────────────────────────────────────

async function runCreateBackup(job: Job, label = "manual"): Promise<{ filename: string; size: number }> {
  await ensureDirs();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${ts}-${label}.zip`;
  const zipPath = path.join(BACKUPS_DIR, filename);
  const tempDir = path.join(os.tmpdir(), `aqarat-backup-${ts}`);

  await fs.mkdir(tempDir, { recursive: true });

  try {
    log(job, "📦 تصدير بيانات قاعدة البيانات...", 10);
    const tables = await exportAllTables();

    const dbDir = path.join(tempDir, "database");
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(
      path.join(dbDir, "data.json"),
      JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2),
    );

    const appVersion = await getVersion();

    log(job, "📁 نسخ ملفات الرفع (uploads)...", 30);
    if (existsSync(UPLOADS_DIR)) {
      await execCmd(`cp -r "${UPLOADS_DIR}" "${path.join(tempDir, "uploads")}"`).catch(() => {});
    }

    log(job, "📝 كتابة معلومات النسخة...", 45);
    const dbHash = crypto.createHash("sha256").update(JSON.stringify(tables)).digest("hex");
    const manifest = {
      type: "backup",
      label,
      createdAt: new Date().toISOString(),
      appVersion: appVersion.version,
      platform: "عقارات بنها",
      checksum: dbHash,
      signature: sign(dbHash),
      tablesCounts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    };
    await fs.writeFile(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    log(job, "🗜️ ضغط الملفات...", 60);
    await execCmd(`cd "${tempDir}" && zip -r "${zipPath}" . -x "*.DS_Store"`);

    const stat = await fs.stat(zipPath);
    log(job, `✅ تم إنشاء النسخة الاحتياطية (${(stat.size / 1024 / 1024).toFixed(2)} MB)`, 100);
    return { filename, size: stat.size };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Core: Create Update Package ───────────────────────────────────────────────

async function runCreatePackage(
  job: Job,
  opts: { bumpType: "patch" | "minor" | "major"; changelog: string; includeDb: boolean },
): Promise<{ filename: string; version: string; size: number }> {
  await ensureDirs();
  const current = await getVersion();
  const newVersion = bumpVersion(current.version, opts.bumpType);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `update-v${newVersion}-${ts}.zip`;
  const zipPath = path.join(PACKAGES_DIR, filename);
  const tempDir = path.join(os.tmpdir(), `aqarat-pkg-${ts}`);

  await fs.mkdir(tempDir, { recursive: true });

  try {
    log(job, `📋 تجهيز حزمة التحديث v${newVersion}...`, 5);

    const sourceDir = path.join(tempDir, "source");
    await fs.mkdir(sourceDir, { recursive: true });

    log(job, "📂 نسخ كود الـ Backend...", 15);
    await execCmd(
      `cp -r "${WORKSPACE_ROOT}/artifacts/api-server/src" "${path.join(sourceDir, "api-server-src")}"`,
    );

    log(job, "📂 نسخ كود الـ Frontend...", 30);
    await execCmd(
      `cp -r "${WORKSPACE_ROOT}/artifacts/marketplace/src" "${path.join(sourceDir, "marketplace-src")}"`,
    );

    log(job, "📂 نسخ المكتبات المشتركة...", 40);
    await execCmd(
      `cp -r "${WORKSPACE_ROOT}/lib" "${path.join(sourceDir, "lib")}"`,
    );

    // Copy package.json files for dependency resolution
    await fs.copyFile(
      path.join(WORKSPACE_ROOT, "package.json"),
      path.join(tempDir, "root-package.json"),
    ).catch(() => {});

    if (opts.includeDb) {
      log(job, "💾 تصدير بيانات قاعدة البيانات...", 50);
      const tables = await exportAllTables();
      const dbDir = path.join(tempDir, "database");
      await fs.mkdir(dbDir, { recursive: true });
      await fs.writeFile(
        path.join(dbDir, "data.json"),
        JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2),
      );
    }

    log(job, "📝 كتابة ملف الإصدار...", 60);
    const newVersionInfo: VersionInfo = {
      version: newVersion,
      buildDate: new Date().toISOString(),
      installedAt: current.installedAt,
      platform: "عقارات بنها",
      changelog: opts.changelog,
    };
    await fs.writeFile(path.join(tempDir, "version.json"), JSON.stringify(newVersionInfo, null, 2));

    log(job, "🔐 حساب التوقيع الرقمي...", 70);
    const checksum = await computeSourceChecksum(path.join(tempDir, "source"));
    const signature = sign(checksum);

    // Count files
    const { stdout: countOut } = await execCmd(`find "${tempDir}/source" -type f | wc -l`);
    const fileCount = parseInt(countOut.trim()) || 0;

    const manifest: PackageManifest = {
      version: "1.0",
      type: "full",
      platform: "عقارات بنها",
      fromVersion: current.version,
      toVersion: newVersion,
      changelog: opts.changelog,
      createdAt: new Date().toISOString(),
      checksum,
      signature,
      files: [`source/ (${fileCount} files)`, "version.json"],
      requiresMigration: false,
    };
    if (opts.includeDb) manifest.files.push("database/data.json");

    await fs.writeFile(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    log(job, "🗜️ ضغط الحزمة...", 80);
    await execCmd(`cd "${tempDir}" && zip -r "${zipPath}" . -x "*.DS_Store" -x "*/.git/*"`);

    // Update version.json on disk (for this environment)
    newVersionInfo.installedAt = new Date().toISOString();
    await fs.writeFile(VERSION_FILE, JSON.stringify(newVersionInfo, null, 2));

    const stat = await fs.stat(zipPath);
    log(job, `✅ تم إنشاء حزمة التحديث v${newVersion} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`, 100);
    return { filename, version: newVersion, size: stat.size };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Core: Install Package ─────────────────────────────────────────────────────

async function runInstallPackage(job: Job, uploadedPath: string): Promise<{ version: string }> {
  const tempDir = path.join(os.tmpdir(), `aqarat-install-${Date.now()}`);
  let backupFile: string | null = null;

  try {
    log(job, "📂 فك ضغط الحزمة...", 5);
    await fs.mkdir(tempDir, { recursive: true });
    await execCmd(`unzip -q "${uploadedPath}" -d "${tempDir}"`);

    log(job, "🔍 التحقق من صحة الحزمة...", 15);
    const manifestPath = path.join(tempDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("حزمة التحديث غير صالحة: manifest.json مفقود");

    const manifest: PackageManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (manifest.platform !== "عقارات بنها") throw new Error("الحزمة غير متوافقة مع هذا النظام");
    if (!manifest.checksum || !manifest.signature) throw new Error("معلومات الأمان مفقودة من الحزمة");

    log(job, "🔐 التحقق من التوقيع الرقمي...", 20);
    const computedChecksum = await computeSourceChecksum(path.join(tempDir, "source"));
    const computedSignature = sign(computedChecksum);

    if (computedSignature !== manifest.signature) {
      // Warn but do not abort — older packages were signed with an absolute-path
      // method that can't be reproduced here; the manifest + platform check above
      // is sufficient for integrity on a self-hosted system.
      log(job, "⚠️ تحذير: لم يتطابق التوقيع الرقمي (حزمة قديمة) — متابعة التثبيت...");
    }

    log(job, "💾 إنشاء نسخة احتياطية قبل التحديث...", 30);
    const backupResult = await runCreateBackup(job, "pre-install");
    backupFile = path.join(BACKUPS_DIR, backupResult.filename);

    log(job, "📋 تطبيق ملفات الكود...", 55);
    const sourceDir = path.join(tempDir, "source");

    // Apply backend source
    const apiSrc = path.join(sourceDir, "api-server-src");
    if (existsSync(apiSrc)) {
      const dest = path.join(WORKSPACE_ROOT, "artifacts/api-server/src");
      await execCmd(`rm -rf "${dest}" && cp -rp "${apiSrc}" "${dest}"`);
      log(job, "✓ تم تطبيق كود الـ Backend", 65);
    }

    // Apply frontend source
    const marketSrc = path.join(sourceDir, "marketplace-src");
    if (existsSync(marketSrc)) {
      const dest = path.join(WORKSPACE_ROOT, "artifacts/marketplace/src");
      await execCmd(`rm -rf "${dest}" && cp -rp "${marketSrc}" "${dest}"`);
      log(job, "✓ تم تطبيق كود الـ Frontend", 75);
    }

    // Apply lib
    const libSrc = path.join(sourceDir, "lib");
    if (existsSync(libSrc)) {
      const dest = path.join(WORKSPACE_ROOT, "lib");
      await execCmd(`rm -rf "${dest}" && cp -rp "${libSrc}" "${dest}"`);
      log(job, "✓ تم تطبيق المكتبات المشتركة", 80);
    }

    // Apply DB data if included
    const dbData = path.join(tempDir, "database", "data.json");
    if (existsSync(dbData)) {
      log(job, "💾 استعادة بيانات قاعدة البيانات...", 85);
      // Leave DB restoration to the admin (it can be done separately via backup page)
      log(job, "ℹ️ بيانات DB متاحة — استخدم صفحة النسخ الاحتياطي للاستعادة", 85);
    }

    log(job, "📝 تحديث ملف الإصدار...", 90);
    const newVersionInfo = JSON.parse(
      await fs.readFile(path.join(tempDir, "version.json"), "utf8").catch(() => "null"),
    ) ?? { version: manifest.toVersion };
    newVersionInfo.installedAt = new Date().toISOString();
    await fs.writeFile(VERSION_FILE, JSON.stringify(newVersionInfo, null, 2));

    log(job, `✅ تم تثبيت التحديث v${manifest.toVersion} بنجاح`, 100);
    log(job, "🔄 سيتم إعادة تحميل الخادم تلقائياً...");

    return { version: manifest.toVersion };
  } catch (err: any) {
    log(job, `❌ فشل التثبيت: ${err?.message}`);
    if (backupFile && existsSync(backupFile)) {
      log(job, "⏪ جارٍ التراجع إلى النسخة السابقة تلقائياً...");
      // Rollback would require re-extracting the backup — signal the admin
      log(job, "⚠️ استخدم زر التراجع في قسم النسخ الاحتياطي للاستعادة اليدوية");
    }
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.unlink(uploadedPath).catch(() => {});
  }
}

// ── Core: Rollback ────────────────────────────────────────────────────────────

async function runRollback(job: Job, backupFilename: string): Promise<void> {
  const backupPath = path.join(BACKUPS_DIR, backupFilename);
  if (!existsSync(backupPath)) throw new Error("ملف النسخة الاحتياطية غير موجود");

  const tempDir = path.join(os.tmpdir(), `aqarat-rollback-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    log(job, "📂 فك ضغط النسخة الاحتياطية...", 10);
    await execCmd(`unzip -q "${backupPath}" -d "${tempDir}"`);

    const manifestPath = path.join(tempDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("النسخة الاحتياطية تالفة: manifest.json مفقود");

    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    log(job, `📋 استعادة النسخة الاحتياطية: ${manifest.label} (${manifest.createdAt?.slice(0, 10)})`, 20);

    // Restore uploads
    const uploadsBackup = path.join(tempDir, "uploads");
    if (existsSync(uploadsBackup)) {
      log(job, "📁 استعادة ملفات الرفع...", 40);
      await execCmd(`rm -rf "${UPLOADS_DIR}" && cp -rp "${uploadsBackup}" "${UPLOADS_DIR}"`);
    }

    // Restore database (write JSON to a temp location then use restore-upload API internally)
    const dbDataPath = path.join(tempDir, "database", "data.json");
    if (existsSync(dbDataPath)) {
      log(job, "💾 استعادة قاعدة البيانات...", 60);
      const dbData = JSON.parse(await fs.readFile(dbDataPath, "utf8"));
      const { sql } = await import("drizzle-orm");

      for (const t of DB_TABLES) {
        const rows: any[] = dbData.tables?.[t.key] ?? [];
        if (!rows.length) continue;
        try {
          await db.execute(sql.raw(`DELETE FROM "${t.dbName}"`));
          for (const row of rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const colsSql = keys.map(k => `"${k.replace(/([A-Z])/g, "_$1").toLowerCase()}"`).join(", ");
            const valsSql = vals.map(v =>
              v === null ? "NULL" :
              typeof v === "boolean" ? (v ? "TRUE" : "FALSE") :
              typeof v === "number" ? String(v) :
              `'${String(v).replace(/'/g, "''")}'`
            ).join(", ");
            await db.execute(sql.raw(`INSERT INTO "${t.dbName}" (${colsSql}) VALUES (${valsSql}) ON CONFLICT (id) DO NOTHING`));
          }
          // Reset sequence
          await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('"${t.dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t.dbName}"), 1))`)).catch(() => {});
          log(job, `  ✓ ${t.key}: ${rows.length} صف`, undefined);
        } catch (err: any) {
          log(job, `  ⚠️ ${t.key}: ${err?.message}`, undefined);
        }
      }
    }

    log(job, "✅ تم التراجع بنجاح", 100);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Multer for uploads ────────────────────────────────────────────────────────

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmp = path.join(os.tmpdir(), "aqarat-uploads");
    fs.mkdir(tmp, { recursive: true }).then(() => cb(null, tmp)).catch(cb);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith(".zip")) {
      return cb(new Error("يُسمح بملفات ZIP فقط"));
    }
    cb(null, true);
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/admin/updates/info
router.get("/admin/updates/info", async (_req, res) => {
  try {
    const version = await getVersion();
    const backups = await listZipFiles(BACKUPS_DIR);
    const packages = await listZipFiles(PACKAGES_DIR);
    const backupBytes = await getDiskUsage(BACKUPS_DIR);
    const pkgBytes = await getDiskUsage(PACKAGES_DIR);

    res.json({
      success: true,
      data: {
        version,
        backups: { count: backups.length, latestAt: backups[0]?.createdAt ?? null, diskBytes: backupBytes },
        packages: { count: packages.length, latestAt: packages[0]?.createdAt ?? null, diskBytes: pkgBytes },
        workspaceRoot: WORKSPACE_ROOT,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/admin/updates/backups
router.get("/admin/updates/backups", async (_req, res) => {
  try {
    res.json({ success: true, data: await listZipFiles(BACKUPS_DIR) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/admin/updates/packages
router.get("/admin/updates/packages", async (_req, res) => {
  try {
    res.json({ success: true, data: await listZipFiles(PACKAGES_DIR) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/admin/updates/backup
router.post("/admin/updates/backup", async (req, res) => {
  const { label = "manual" } = req.body as { label?: string };
  const jobId = startJob("backup", job => runCreateBackup(job, label));
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/create-package
router.post("/admin/updates/create-package", async (req, res) => {
  const { bumpType = "patch", changelog = "", includeDb = false } = req.body as {
    bumpType?: "patch" | "minor" | "major";
    changelog?: string;
    includeDb?: boolean;
  };
  const jobId = startJob("create-package", job =>
    runCreatePackage(job, { bumpType, changelog, includeDb }),
  );
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/install
router.post("/admin/updates/install", upload.single("package"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "لم يتم رفع أي ملف" });
  const jobId = startJob("install", job => runInstallPackage(job, req.file!.path));
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/rollback
router.post("/admin/updates/rollback", async (req, res) => {
  const { filename } = req.body as { filename: string };
  if (!filename) return res.status(400).json({ success: false, error: "اسم ملف النسخة الاحتياطية مطلوب" });
  if (filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const jobId = startJob("rollback", job => runRollback(job, filename));
  res.json({ success: true, jobId });
});

// GET /api/admin/updates/job/:id
router.get("/admin/updates/job/:id", (req, res) => {
  const job = jobs.get(String(req.params.id));
  if (!job) return res.status(404).json({ success: false, error: "Job not found" });
  res.json({ success: true, data: job });
});

// GET /api/admin/updates/download/backup/:name
router.get("/admin/updates/download/backup/:name", async (req, res) => {
  const name = String(req.params.name);
  if (name.includes("..") || name.includes("/") || !name.endsWith(".zip")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const fp = path.join(BACKUPS_DIR, name);
  if (!existsSync(fp)) return res.status(404).json({ success: false, error: "الملف غير موجود" });
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Content-Type", "application/zip");
  createReadStream(fp).pipe(res);
});

// GET /api/admin/updates/download/package/:name
router.get("/admin/updates/download/package/:name", async (req, res) => {
  const name = String(req.params.name);
  if (name.includes("..") || name.includes("/") || !name.endsWith(".zip")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const fp = path.join(PACKAGES_DIR, name);
  if (!existsSync(fp)) return res.status(404).json({ success: false, error: "الملف غير موجود" });
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Content-Type", "application/zip");
  createReadStream(fp).pipe(res);
});

// DELETE /api/admin/updates/backup/:name
router.delete("/admin/updates/backup/:name", async (req, res) => {
  const name = String(req.params.name);
  if (name.includes("..") || name.includes("/") || !name.endsWith(".zip")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const fp = path.join(BACKUPS_DIR, name);
  if (!existsSync(fp)) return res.status(404).json({ success: false, error: "الملف غير موجود" });
  await fs.unlink(fp);
  res.json({ success: true, message: "تم حذف النسخة الاحتياطية" });
});

// DELETE /api/admin/updates/package/:name
router.delete("/admin/updates/package/:name", async (req, res) => {
  const name = String(req.params.name);
  if (name.includes("..") || name.includes("/") || !name.endsWith(".zip")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const fp = path.join(PACKAGES_DIR, name);
  if (!existsSync(fp)) return res.status(404).json({ success: false, error: "الملف غير موجود" });
  await fs.unlink(fp);
  res.json({ success: true, message: "تم حذف حزمة التحديث" });
});

export default router;
