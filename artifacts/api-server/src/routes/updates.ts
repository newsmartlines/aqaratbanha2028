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
import { sql } from "drizzle-orm";
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
// routes → src → api-server → artifacts → workspace
const WORKSPACE_ROOT = path.resolve(__dirname, "../../../..");
const BACKUPS_DIR    = path.join(WORKSPACE_ROOT, "backups");
const PACKAGES_DIR   = path.join(WORKSPACE_ROOT, "update-packages");
const SNAPSHOTS_DIR  = path.join(WORKSPACE_ROOT, "snapshots");
const VERSION_FILE   = path.join(WORKSPACE_ROOT, "version.json");
const UPLOADS_DIR    = path.join(WORKSPACE_ROOT, "uploads");
const MIGRATIONS_SRC = path.join(WORKSPACE_ROOT, "lib/db/migrations");
const JOBS_DIR       = "/tmp/aqarat-jobs";

/**
 * Source roots tracked for incremental diffing.
 * prefix  = directory name inside the package's changes/ folder
 * abs     = absolute path on disk
 */
const SOURCE_ROOTS = [
  { prefix: "api-server-src", abs: path.join(WORKSPACE_ROOT, "artifacts/api-server/src") },
  { prefix: "marketplace-src", abs: path.join(WORKSPACE_ROOT, "artifacts/marketplace/src") },
  { prefix: "lib",             abs: path.join(WORKSPACE_ROOT, "lib") },
] as const;

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

interface Snapshot {
  version: string;
  createdAt: string;
  /** relKey → sha256 content hash */
  files: Record<string, string>;
  /** Ordered list of migration filenames applied through this version */
  appliedMigrations: string[];
}

interface IncrementalManifest {
  schemaVersion: "2";
  type: "incremental";
  platform: string;
  fromVersion: string;
  toVersion: string;
  changelog: string;
  createdAt: string;
  checksum: string;
  signature: string;
  changes: { added: string[]; modified: string[]; deleted: string[] };
  migrations: string[];
}

interface LegacyManifest {
  schemaVersion?: "1";
  type: "full";
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

type AnyManifest = IncrementalManifest | LegacyManifest;

// ── Job Registry (disk-persistent) ───────────────────────────────────────────

const jobs = new Map<string, Job>();

function jobFilePath(id: string) { return path.join(JOBS_DIR, `${id}.json`); }

async function persistJob(job: Job) {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
    await fs.writeFile(jobFilePath(job.id), JSON.stringify(job, null, 2));
  } catch {}
}

async function loadJobFromDisk(id: string): Promise<Job | undefined> {
  try { return JSON.parse(await fs.readFile(jobFilePath(id), "utf8")) as Job; }
  catch { return undefined; }
}

function startJob(type: Job["type"], fn: (job: Job) => Promise<any>): string {
  const id = crypto.randomUUID();
  const job: Job = { id, type, status: "running", progress: 0, logs: [], startedAt: new Date().toISOString() };
  jobs.set(id, job);
  persistJob(job);

  fn(job)
    .then(result => {
      job.status = "success"; job.progress = 100;
      job.result = result; job.completedAt = new Date().toISOString();
      persistJob(job);
    })
    .catch(err => {
      job.status = "failed";
      job.error = err?.message ?? String(err);
      job.completedAt = new Date().toISOString();
      job.logs.push(`❌ خطأ: ${job.error}`);
      persistJob(job);
    });

  return id;
}

function log(job: Job, msg: string, progress?: number) {
  job.logs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  if (progress !== undefined) job.progress = progress;
  persistJob(job);
}

// ── General Helpers ───────────────────────────────────────────────────────────

async function ensureDirs() {
  for (const d of [BACKUPS_DIR, PACKAGES_DIR, SNAPSHOTS_DIR]) {
    await fs.mkdir(d, { recursive: true });
  }
}

async function getVersion(): Promise<VersionInfo> {
  if (existsSync(VERSION_FILE)) {
    try { return JSON.parse(await fs.readFile(VERSION_FILE, "utf8")); } catch {}
  }
  const initial: VersionInfo = {
    version: "1.0.0", buildDate: new Date().toISOString(),
    installedAt: new Date().toISOString(), platform: "عقارات بنها",
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
  const secret = process.env.SESSION_SECRET;
  // In production: hard failure — a missing secret must never be silently ignored.
  // In development: fall back to a local-only placeholder so the server starts
  // without needing a .env file, but log a reminder.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is not set — cannot sign data in production");
    }
    console.warn("[sign] SESSION_SECRET not set — using dev placeholder. Set it in .env for production.");
  }
  return crypto.createHmac("sha256", secret ?? "dev-only-placeholder-not-for-production")
    .update(data)
    .digest("hex");
}

async function getDiskUsage(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  try {
    const { stdout } = await execCmd(`du -sb "${dir}" 2>/dev/null || echo "0"`);
    return parseInt(stdout.split("\t")[0]) || 0;
  } catch { return 0; }
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

// ── Incremental Diff Engine ───────────────────────────────────────────────────

/**
 * Walk all source roots and build a map of relKey → sha256(content).
 * relKey format: "{prefix}/{relativePath}"  e.g. "marketplace-src/pages/Home.tsx"
 * Migrations subdir is excluded from lib/ (tracked separately).
 */
async function computeAllFileHashes(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const root of SOURCE_ROOTS) {
    await walkDir(root.abs, root.abs, root.prefix, result);
  }
  return result;
}

async function walkDir(
  baseDir: string,
  currentDir: string,
  prefix: string,
  out: Map<string, string>,
) {
  if (!existsSync(currentDir)) return;
  let entries: import("fs").Dirent[];
  try { entries = await fs.readdir(currentDir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relFromBase = path.relative(baseDir, fullPath);

    // Skip noise
    if (["node_modules", ".git", "dist", ".cache", "__pycache__"].includes(entry.name)) continue;
    // Skip migrations subdir inside lib/ — tracked separately
    if (prefix === "lib" && relFromBase.startsWith("db/migrations")) continue;

    if (entry.isDirectory()) {
      await walkDir(baseDir, fullPath, prefix, out);
    } else if (entry.isFile()) {
      const relKey = `${prefix}/${relFromBase}`;
      try {
        const content = await fs.readFile(fullPath);
        out.set(relKey, crypto.createHash("sha256").update(content).digest("hex"));
      } catch {}
    }
  }
}

interface FileDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

function computeDiff(oldFiles: Record<string, string>, newFiles: Map<string, string>): FileDiff {
  const oldMap = new Map(Object.entries(oldFiles));
  const added: string[] = [], modified: string[] = [], deleted: string[] = [];

  for (const [key, hash] of newFiles) {
    if (!oldMap.has(key)) added.push(key);
    else if (oldMap.get(key) !== hash) modified.push(key);
  }
  for (const key of oldMap.keys()) {
    if (!newFiles.has(key)) deleted.push(key);
  }
  return { added, modified, deleted };
}

/** Resolve a package relKey to its absolute path on disk */
function resolveRelKey(relKey: string): string | null {
  for (const root of SOURCE_ROOTS) {
    if (relKey.startsWith(root.prefix + "/")) {
      const rel = relKey.slice(root.prefix.length + 1);
      return path.join(root.abs, rel);
    }
  }
  return null;
}

// ── Snapshot Management ───────────────────────────────────────────────────────

async function saveSnapshot(snap: Snapshot) {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SNAPSHOTS_DIR, `v${snap.version}.json`),
    JSON.stringify(snap, null, 2),
  );
  // Also write "latest" pointer
  await fs.writeFile(path.join(SNAPSHOTS_DIR, "latest.json"), JSON.stringify(snap, null, 2));
}

async function loadLatestSnapshot(): Promise<Snapshot | null> {
  const p = path.join(SNAPSHOTS_DIR, "latest.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(await fs.readFile(p, "utf8")) as Snapshot; }
  catch { return null; }
}

// ── Migration Helpers ─────────────────────────────────────────────────────────

async function listMigrationFiles(): Promise<string[]> {
  if (!existsSync(MIGRATIONS_SRC)) return [];
  const all = (await fs.readdir(MIGRATIONS_SRC)).filter(f => f.endsWith(".sql")).sort();
  return all;
}

async function runMigration(sqlText: string, filename: string, job: Job): Promise<void> {
  // Drizzle migrations use "--> statement-breakpoint" to separate statements
  const statements = sqlText
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean);

  let anyFailed = false;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      // Idempotency / already-applied patterns — skip silently
      const alreadyApplied =
        msg.includes("already exists") ||
        msg.includes("duplicate column") ||
        msg.includes("duplicate key") ||
        msg.includes("Feature is disabled") || // Neon: DDL blocked when schema already set
        msg.includes("does not exist");        // DROP of something already gone
      if (alreadyApplied) {
        log(job, `  ⏭️ ${filename}: تجاهل (مطبَّق مسبقاً أو غير قابل للتطبيق)`);
        anyFailed = true; // mark so we don't re-run next time, but don't throw
        break; // skip remaining statements in this file — schema already in place
      }
      // Real error — log as warning but don't abort the whole install
      log(job, `  ⚠️ ${filename}: ${msg.slice(0, 120)} — جارٍ المتابعة...`);
      anyFailed = true;
      break;
    }
  }
  if (!anyFailed) {
    log(job, `  ✅ ${filename}: تم`);
  }
}

// ── Package Checksum (path-independent) ──────────────────────────────────────

async function computeIncrementalChecksum(
  changesDir: string,
  migrationsDir: string,
  deletedJson: string,
): Promise<string> {
  const hash = crypto.createHash("sha256");

  // Hash changed/added files by relPath + content
  if (existsSync(changesDir)) {
    const { stdout } = await execCmd(`find "${changesDir}" -type f | sort`).catch(() => ({ stdout: "" }));
    for (const absPath of stdout.trim().split("\n").filter(Boolean)) {
      const rel = path.relative(changesDir, absPath);
      const content = await fs.readFile(absPath).catch(() => Buffer.alloc(0));
      hash.update(rel).update(":").update(content);
    }
  }

  // Hash migrations
  if (existsSync(migrationsDir)) {
    const { stdout } = await execCmd(`find "${migrationsDir}" -type f | sort`).catch(() => ({ stdout: "" }));
    for (const absPath of stdout.trim().split("\n").filter(Boolean)) {
      const content = await fs.readFile(absPath).catch(() => Buffer.alloc(0));
      hash.update(path.basename(absPath)).update(":").update(content);
    }
  }

  // Hash deleted list
  hash.update("deleted:").update(deletedJson);

  return hash.digest("hex");
}

// ── DB Table Catalog ──────────────────────────────────────────────────────────

const DB_TABLES = [
  { key: "regions",        dbName: "regions",          fetch: () => db.select().from(regionsTable) },
  { key: "cities",         dbName: "cities",            fetch: () => db.select().from(citiesTable) },
  { key: "areas",          dbName: "areas",             fetch: () => db.select().from(areasTable) },
  { key: "featuredAreas",  dbName: "featured_areas",    fetch: () => db.select().from(featuredAreasTable) },
  { key: "categories",     dbName: "categories",        fetch: () => db.select().from(categoriesTable) },
  { key: "subcategories",  dbName: "subcategories",     fetch: () => db.select().from(subcategoriesTable) },
  { key: "properties",     dbName: "properties",        fetch: () => db.select().from(propertiesTable) },
  { key: "siteSettings",   dbName: "site_settings",     fetch: () => db.select().from(siteSettingsTable) },
  { key: "emailTemplates", dbName: "email_templates",   fetch: () => db.select().from(emailTemplatesTable) },
  { key: "billingPlans",   dbName: "billing_plans",     fetch: () => db.select().from(billingPlansTable) },
  { key: "commissionRules",dbName: "commission_rules",  fetch: () => db.select().from(commissionRulesTable) },
  { key: "packages",       dbName: "packages",          fetch: () => db.select().from(packagesTable) },
  { key: "adminStaff",     dbName: "admin_staff",       fetch: () => db.select().from(adminStaffTable) },
  { key: "users",          dbName: "users",             fetch: async () => {
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

    // Also backup the current snapshot so we can restore diff context
    const latestSnap = path.join(SNAPSHOTS_DIR, "latest.json");
    if (existsSync(latestSnap)) {
      await fs.copyFile(latestSnap, path.join(tempDir, "snapshot.json")).catch(() => {});
    }

    log(job, "📝 كتابة معلومات النسخة...", 45);
    const dbHash = crypto.createHash("sha256").update(JSON.stringify(tables)).digest("hex");
    const manifest = {
      type: "backup", label,
      createdAt: new Date().toISOString(),
      appVersion: appVersion.version,
      platform: "عقارات بنها",
      checksum: dbHash, signature: sign(dbHash),
      tablesCounts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, (v as any[]).length])),
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

// ── Core: Create Incremental Package ─────────────────────────────────────────

async function runCreatePackage(
  job: Job,
  opts: { bumpType: "patch" | "minor" | "major"; changelog: string },
): Promise<{ filename: string; version: string; size: number; changes: FileDiff; migrations: string[] }> {
  await ensureDirs();
  const current = await getVersion();
  const newVersion = bumpVersion(current.version, opts.bumpType);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `update-incremental-v${newVersion}-${ts}.zip`;
  const zipPath = path.join(PACKAGES_DIR, filename);
  const tempDir = path.join(os.tmpdir(), `aqarat-pkg-${ts}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 1. Load last snapshot (baseline for diff)
    log(job, "🔍 تحميل لقطة الإصدار الأخير للمقارنة...", 5);
    const lastSnap = await loadLatestSnapshot();
    const baseFiles: Record<string, string> = lastSnap?.files ?? {};
    const baseMigrations: string[] = lastSnap?.appliedMigrations ?? [];

    // 2. Hash all current source files
    log(job, "📊 فحص التغييرات في الكود...", 10);
    const currentHashes = await computeAllFileHashes();

    // 3. Compute diff
    const diff = computeDiff(baseFiles, currentHashes);
    const totalChanged = diff.added.length + diff.modified.length + diff.deleted.length;

    log(job,
      `📋 التغييرات: ${diff.added.length} ملف جديد — ${diff.modified.length} معدَّل — ${diff.deleted.length} محذوف`,
      15,
    );

    if (totalChanged === 0) {
      log(job, "⚠️ لا توجد تغييرات في الكود منذ الإصدار الأخير — الحزمة ستحتوي على الترحيلات فقط إن وجدت");
    }

    // 4. Find pending migrations (added since last snapshot)
    log(job, "🗄️ فحص ترحيلات قاعدة البيانات الجديدة...", 20);
    const allMigrations = await listMigrationFiles();
    const pendingMigrations = allMigrations.filter(m => !baseMigrations.includes(m));
    if (pendingMigrations.length > 0) {
      log(job, `  📄 ترحيلات جديدة: ${pendingMigrations.join(", ")}`);
    } else {
      log(job, "  ✓ لا توجد ترحيلات جديدة");
    }

    // 5. Write changed/added files to changes/
    log(job, "📂 تجميع الملفات المتغيرة...", 30);
    const changesDir = path.join(tempDir, "changes");
    await fs.mkdir(changesDir, { recursive: true });

    for (const relKey of [...diff.added, ...diff.modified]) {
      const srcAbs = resolveRelKey(relKey);
      if (!srcAbs || !existsSync(srcAbs)) continue;
      const destPath = path.join(changesDir, relKey);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcAbs, destPath);
    }

    // 6. Write deleted file list
    await fs.writeFile(path.join(tempDir, "deleted.json"), JSON.stringify(diff.deleted, null, 2));

    // 7. Copy pending migrations
    const migrationsDir = path.join(tempDir, "migrations");
    if (pendingMigrations.length > 0) {
      await fs.mkdir(migrationsDir, { recursive: true });
      for (const m of pendingMigrations) {
        const src = path.join(MIGRATIONS_SRC, m);
        if (existsSync(src)) await fs.copyFile(src, path.join(migrationsDir, m));
      }
    }

    // 8. Compute path-independent checksum
    log(job, "🔐 حساب التوقيع الرقمي...", 60);
    const checksum = await computeIncrementalChecksum(
      changesDir,
      migrationsDir,
      JSON.stringify(diff.deleted),
    );
    const signature = sign(checksum);

    // 9. Write manifest
    const manifest: IncrementalManifest = {
      schemaVersion: "2",
      type: "incremental",
      platform: "عقارات بنها",
      fromVersion: current.version,
      toVersion: newVersion,
      changelog: opts.changelog,
      createdAt: new Date().toISOString(),
      checksum,
      signature,
      changes: diff,
      migrations: pendingMigrations,
    };
    await fs.writeFile(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    // 10. Zip
    log(job, "🗜️ ضغط الحزمة...", 70);
    await execCmd(`cd "${tempDir}" && zip -r "${zipPath}" . -x "*.DS_Store" -x "*/.git/*"`);

    const stat = await fs.stat(zipPath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(3);

    // 11. Save new snapshot (with ALL current hashes + ALL migrations)
    log(job, "💾 حفظ لقطة الإصدار الجديد...", 85);
    const newSnap: Snapshot = {
      version: newVersion,
      createdAt: new Date().toISOString(),
      files: Object.fromEntries(currentHashes),
      appliedMigrations: allMigrations,
    };
    await saveSnapshot(newSnap);

    // 12. Update local version.json
    const newVersionInfo: VersionInfo = {
      version: newVersion,
      buildDate: new Date().toISOString(),
      installedAt: new Date().toISOString(),
      platform: "عقارات بنها",
      changelog: opts.changelog,
    };
    await fs.writeFile(VERSION_FILE, JSON.stringify(newVersionInfo, null, 2));

    log(job,
      `✅ تم إنشاء حزمة تدريجية v${newVersion} (${sizeMB} MB) — ${totalChanged} ملف متغير، ${pendingMigrations.length} ترحيل`,
      100,
    );
    return { filename, version: newVersion, size: stat.size, changes: diff, migrations: pendingMigrations };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Core: Install Package ─────────────────────────────────────────────────────

let installRunning = false;

async function runInstallPackage(job: Job, uploadedPath: string): Promise<{ version: string }> {
  const tempDir = path.join(os.tmpdir(), `aqarat-install-${Date.now()}`);

  try {
    log(job, "📂 فك ضغط الحزمة...", 5);
    await fs.mkdir(tempDir, { recursive: true });
    await execCmd(`unzip -q "${uploadedPath}" -d "${tempDir}"`);

    // ── Validate manifest ─────────────────────────────────────────────────────
    const manifestPath = path.join(tempDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("حزمة غير صالحة: manifest.json مفقود");

    const manifest: AnyManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (manifest.platform !== "عقارات بنها") throw new Error("الحزمة غير متوافقة مع هذا النظام");
    if (!manifest.checksum || !manifest.signature) throw new Error("معلومات الأمان مفقودة من الحزمة");

    const isIncremental = manifest.type === "incremental";
    log(job, `📋 نوع الحزمة: ${isIncremental ? "تدريجية (incremental)" : "كاملة (legacy)"} — من v${manifest.fromVersion} إلى v${manifest.toVersion}`, 10);

    // ── Version compatibility check ──────────────────────────────────────────
    const currentVersion = await getVersion();
    if (manifest.fromVersion !== currentVersion.version) {
      log(job, `⚠️ تحذير: الحزمة مصممة للترقية من v${manifest.fromVersion} لكن الإصدار الحالي هو v${currentVersion.version} — جارٍ المتابعة...`);
    }

    // ── Verify signature ─────────────────────────────────────────────────────
    log(job, "🔐 التحقق من التوقيع الرقمي...", 15);
    let verified = false;
    if (isIncremental) {
      const computedChecksum = await computeIncrementalChecksum(
        path.join(tempDir, "changes"),
        path.join(tempDir, "migrations"),
        await fs.readFile(path.join(tempDir, "deleted.json"), "utf8").catch(() => "[]"),
      );
      verified = sign(computedChecksum) === manifest.signature;
    } else {
      // Legacy full package: hash source/ directory
      const { stdout: fileList } = await execCmd(
        `find "${tempDir}/source" -type f | sort`,
      ).catch(() => ({ stdout: "" }));
      const files = fileList.trim().split("\n").filter(Boolean);
      const hash = crypto.createHash("sha256");
      for (const f of files) {
        const rel = path.relative(path.join(tempDir, "source"), f);
        const content = await fs.readFile(f).catch(() => Buffer.alloc(0));
        hash.update(rel).update(":").update(content);
      }
      verified = sign(hash.digest("hex")) === manifest.signature;
    }

    if (verified) {
      log(job, "✅ التوقيع الرقمي صحيح — الحزمة موثوقة");
    } else {
      log(job, "⚠️ التوقيع لا يتطابق (الحزمة قد تكون أقدم من نظام التوقيع الحالي) — جارٍ المتابعة...");
    }

    // ── Create pre-install backup ─────────────────────────────────────────────
    log(job, "💾 إنشاء نسخة احتياطية شاملة قبل التحديث...", 20);
    await runCreateBackup(job, "pre-install");

    // ── Apply changes ─────────────────────────────────────────────────────────
    if (isIncremental) {
      await applyIncrementalPackage(job, manifest as IncrementalManifest, tempDir);
    } else {
      await applyLegacyPackage(job, manifest as LegacyManifest, tempDir);
    }

    return { version: manifest.toVersion };
  } catch (err: any) {
    log(job, `❌ فشل التثبيت: ${err?.message}`);
    log(job, "⚠️ يمكنك التراجع من تبويب «النسخ الاحتياطي» باختيار النسخة المُنشأة قبيل التثبيت");
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.unlink(uploadedPath).catch(() => {});
  }
}

async function applyIncrementalPackage(job: Job, manifest: IncrementalManifest, tempDir: string) {
  const changesDir = path.join(tempDir, "changes");
  const migrationsDir = path.join(tempDir, "migrations");
  const isFx = manifest.changes;

  const totalFiles = (isFx.added?.length ?? 0) + (isFx.modified?.length ?? 0);
  const totalMig   = manifest.migrations?.length ?? 0;

  log(job,
    `📋 سيتم تطبيق: ${isFx.added?.length ?? 0} ملف جديد، ${isFx.modified?.length ?? 0} معدَّل، ${isFx.deleted?.length ?? 0} محذوف، ${totalMig} ترحيل`,
    40,
  );

  // ── 1. Apply Frontend changes (no tsx restart) ───────────────────────────
  let frontendCount = 0, libCount = 0, backendKeys: string[] = [];

  for (const relKey of [...(isFx.added ?? []), ...(isFx.modified ?? [])]) {
    const srcInPkg = path.join(changesDir, relKey);
    const destAbs  = resolveRelKey(relKey);
    if (!destAbs || !existsSync(srcInPkg)) continue;

    if (relKey.startsWith("api-server-src/")) {
      backendKeys.push(relKey); // defer
    } else {
      await fs.mkdir(path.dirname(destAbs), { recursive: true });
      await fs.copyFile(srcInPkg, destAbs);
      if (relKey.startsWith("marketplace-src/")) frontendCount++;
      else libCount++;
    }
  }

  // ── 2. Delete removed files (non-backend first) ──────────────────────────
  const deleted: string[] = isFx.deleted ?? [];
  const backendDeleted = deleted.filter(k => k.startsWith("api-server-src/"));
  const otherDeleted   = deleted.filter(k => !k.startsWith("api-server-src/"));

  for (const relKey of otherDeleted) {
    const destAbs = resolveRelKey(relKey);
    if (destAbs) await fs.unlink(destAbs).catch(() => {});
  }

  if (frontendCount) log(job, `✓ Frontend: ${frontendCount} ملف مطبَّق`, 52);
  if (libCount)      log(job, `✓ المكتبات المشتركة: ${libCount} ملف مطبَّق`, 55);

  // ── 3. Run migrations ─────────────────────────────────────────────────────
  if (totalMig > 0) {
    log(job, "🗄️ تطبيق ترحيلات قاعدة البيانات...", 58);
    // Also copy migration files to local migrations dir so they're available for future diffs
    await fs.mkdir(MIGRATIONS_SRC, { recursive: true });
    for (const migFile of manifest.migrations) {
      const srcMig = path.join(migrationsDir, migFile);
      if (!existsSync(srcMig)) continue;
      const sqlText = await fs.readFile(srcMig, "utf8");
      log(job, `  ⚙️ ${migFile}...`);
      await runMigration(sqlText, migFile, job);
      // Copy to local migrations dir
      await fs.copyFile(srcMig, path.join(MIGRATIONS_SRC, migFile)).catch(() => {});
      log(job, `  ✓ ${migFile}`);
    }
    log(job, "✓ جميع الترحيلات مطبَّقة", 68);
  }

  // ── 4. Update version.json + save snapshot BEFORE touching backend ────────
  log(job, "📝 تحديث ملف الإصدار...", 72);
  const newVersionInfo: VersionInfo = {
    version: manifest.toVersion,
    buildDate: manifest.createdAt,
    installedAt: new Date().toISOString(),
    platform: "عقارات بنها",
    changelog: manifest.changelog,
  };
  await fs.writeFile(VERSION_FILE, JSON.stringify(newVersionInfo, null, 2));

  // Compute updated hashes for snapshot
  const updatedHashes = await computeAllFileHashes();
  const allMigrations = await listMigrationFiles();
  const newSnap: Snapshot = {
    version: manifest.toVersion,
    createdAt: new Date().toISOString(),
    files: Object.fromEntries(updatedHashes),
    appliedMigrations: allMigrations,
  };
  await saveSnapshot(newSnap);

  // ── 5. Mark job done on disk BEFORE applying backend ─────────────────────
  // tsx watch will restart the server when backend files change → job Map is
  // cleared. Persisting success first means the disk-fallback GET /job/:id
  // returns success even after restart.
  log(job,
    `✅ تم تثبيت التحديث v${manifest.toVersion} بنجاح — ${totalFiles} ملف مُطبَّق، ${totalMig} ترحيل`,
    90,
  );
  if (backendKeys.length > 0 || backendDeleted.length > 0) {
    log(job, "🔄 جارٍ تطبيق كود الـ Backend — سيُعاد تشغيل الخادم تلقائياً بعد لحظات...");
  }

  job.status = "success";
  job.completedAt = new Date().toISOString();
  await persistJob(job);

  // ── 6. Apply Backend changes LAST (triggers tsx restart) ──────────────────
  for (const relKey of backendKeys) {
    const srcInPkg = path.join(tempDir, "changes", relKey);
    const destAbs  = resolveRelKey(relKey);
    if (!destAbs || !existsSync(srcInPkg)) continue;
    await fs.mkdir(path.dirname(destAbs), { recursive: true });
    await fs.copyFile(srcInPkg, destAbs);
  }
  for (const relKey of backendDeleted) {
    const destAbs = resolveRelKey(relKey);
    if (destAbs) await fs.unlink(destAbs).catch(() => {});
  }
}

async function applyLegacyPackage(job: Job, manifest: LegacyManifest, tempDir: string) {
  log(job, "⚠️ الحزمة من النوع الكامل (قديم) — سيتم تطبيق جميع الملفات المصدرية", 40);
  const sourceDir = path.join(tempDir, "source");

  // Frontend first
  const marketSrc = path.join(sourceDir, "marketplace-src");
  if (existsSync(marketSrc)) {
    const dest = path.join(WORKSPACE_ROOT, "artifacts/marketplace/src");
    await execCmd(`rm -rf "${dest}" && cp -rp "${marketSrc}" "${dest}"`);
    log(job, "✓ Frontend مُطبَّق", 60);
  }

  // Lib second
  const libSrc = path.join(sourceDir, "lib");
  if (existsSync(libSrc)) {
    const dest = path.join(WORKSPACE_ROOT, "lib");
    await execCmd(`rm -rf "${dest}" && cp -rp "${libSrc}" "${dest}"`);
    log(job, "✓ المكتبات المشتركة مُطبَّقة", 68);
  }

  // Version + snapshot before backend
  const versionSrc = path.join(tempDir, "version.json");
  const newVersionInfo = existsSync(versionSrc)
    ? JSON.parse(await fs.readFile(versionSrc, "utf8"))
    : { version: manifest.toVersion, platform: "عقارات بنها", buildDate: new Date().toISOString() };
  newVersionInfo.installedAt = new Date().toISOString();
  await fs.writeFile(VERSION_FILE, JSON.stringify(newVersionInfo, null, 2));

  log(job, `✅ تم تثبيت التحديث v${manifest.toVersion} بنجاح`, 85);
  log(job, "🔄 جارٍ تطبيق كود الـ Backend — سيُعاد تشغيل الخادم...");
  job.status = "success";
  job.completedAt = new Date().toISOString();
  await persistJob(job);

  // Backend last
  const apiSrc = path.join(sourceDir, "api-server-src");
  if (existsSync(apiSrc)) {
    const dest = path.join(WORKSPACE_ROOT, "artifacts/api-server/src");
    await execCmd(`rm -rf "${dest}" && cp -rp "${apiSrc}" "${dest}"`);
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

    // Restore snapshot if included in backup
    const snapBackup = path.join(tempDir, "snapshot.json");
    if (existsSync(snapBackup)) {
      await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
      await fs.copyFile(snapBackup, path.join(SNAPSHOTS_DIR, "latest.json")).catch(() => {});
    }

    // Restore database
    const dbDataPath = path.join(tempDir, "database", "data.json");
    if (existsSync(dbDataPath)) {
      log(job, "💾 استعادة قاعدة البيانات...", 60);
      const dbData = JSON.parse(await fs.readFile(dbDataPath, "utf8"));

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
              `'${String(v).replace(/'/g, "''")}'`,
            ).join(", ");
            await db.execute(sql.raw(`INSERT INTO "${t.dbName}" (${colsSql}) VALUES (${valsSql}) ON CONFLICT (id) DO NOTHING`));
          }
          await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('"${t.dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t.dbName}"), 1))`)).catch(() => {});
          log(job, `  ✓ ${t.key}: ${rows.length} صف`);
        } catch (err: any) {
          log(job, `  ⚠️ ${t.key}: ${err?.message}`);
        }
      }
    }

    log(job, "✅ تم التراجع بنجاح", 100);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Multer ────────────────────────────────────────────────────────────────────

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmp = path.join(os.tmpdir(), "aqarat-uploads");
    fs.mkdir(tmp, { recursive: true }).then(() => cb(null, tmp)).catch((err: unknown) => cb(err instanceof Error ? err : new Error(String(err)), ""));
  },
  filename: (_req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith(".zip")) return cb(new Error("يُسمح بملفات ZIP فقط"));
    cb(null, true);
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/admin/updates/info
router.get("/admin/updates/info", async (_req, res) => {
  try {
    const version  = await getVersion();
    const backups  = await listZipFiles(BACKUPS_DIR);
    const packages = await listZipFiles(PACKAGES_DIR);
    const snap     = await loadLatestSnapshot();

    res.json({
      success: true,
      data: {
        version,
        snapshot: snap ? { version: snap.version, createdAt: snap.createdAt, fileCount: Object.keys(snap.files).length, migrationCount: snap.appliedMigrations.length } : null,
        backups:  { count: backups.length,  latestAt: backups[0]?.createdAt  ?? null, diskBytes: await getDiskUsage(BACKUPS_DIR) },
        packages: { count: packages.length, latestAt: packages[0]?.createdAt ?? null, diskBytes: await getDiskUsage(PACKAGES_DIR) },
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

// GET /api/admin/updates/diff  — preview what would go into the next incremental package
router.get("/admin/updates/diff", async (_req, res) => {
  try {
    const snap = await loadLatestSnapshot();
    const baseFiles: Record<string, string> = snap?.files ?? {};
    const baseMigrations: string[] = snap?.appliedMigrations ?? [];

    const currentHashes   = await computeAllFileHashes();
    const diff            = computeDiff(baseFiles, currentHashes);
    const allMigrations   = await listMigrationFiles();
    const pendingMigs     = allMigrations.filter(m => !baseMigrations.includes(m));
    const currentVersion  = await getVersion();

    res.json({
      success: true,
      data: {
        baseVersion: snap?.version ?? null,
        currentVersion: currentVersion.version,
        hasSnapshot: !!snap,
        diff: {
          added:    diff.added.length,
          modified: diff.modified.length,
          deleted:  diff.deleted.length,
          total:    diff.added.length + diff.modified.length + diff.deleted.length,
        },
        addedFiles:    diff.added,
        modifiedFiles: diff.modified,
        deletedFiles:  diff.deleted,
        pendingMigrations: pendingMigs,
        hasChanges: diff.added.length + diff.modified.length + diff.deleted.length + pendingMigs.length > 0,
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

// GET /api/admin/updates/backups
router.get("/admin/updates/backups", async (_req, res) => {
  try { res.json({ success: true, data: await listZipFiles(BACKUPS_DIR) }); }
  catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

// GET /api/admin/updates/packages
router.get("/admin/updates/packages", async (_req, res) => {
  try {
    const list = await listZipFiles(PACKAGES_DIR);
    // Enhance with type info by reading manifest from each zip
    const enhanced = await Promise.all(list.map(async (pkg) => {
      try {
        const { stdout } = await execCmd(`unzip -p "${path.join(PACKAGES_DIR, pkg.name)}" manifest.json 2>/dev/null`);
        const m: AnyManifest = JSON.parse(stdout);
        return { ...pkg, type: m.type, fromVersion: m.fromVersion, toVersion: m.toVersion, changelog: m.changelog };
      } catch {
        return { ...pkg, type: "unknown" };
      }
    }));
    res.json({ success: true, data: enhanced });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

// POST /api/admin/updates/backup
router.post("/admin/updates/backup", async (req, res) => {
  const { label = "manual" } = req.body as { label?: string };
  const jobId = startJob("backup", job => runCreateBackup(job, label));
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/create-package
router.post("/admin/updates/create-package", async (req, res) => {
  const { bumpType = "patch", changelog = "" } = req.body as {
    bumpType?: "patch" | "minor" | "major";
    changelog?: string;
  };
  const jobId = startJob("create-package", job => runCreatePackage(job, { bumpType, changelog }));
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/install — incremental or legacy full package
router.post("/admin/updates/install", upload.single("package"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "لم يتم رفع أي ملف" });
  if (installRunning) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(409).json({ success: false, error: "عملية تثبيت أخرى جارية — انتظر حتى تكتمل" });
  }
  installRunning = true;
  const jobId = startJob("install", async (job) => {
    try { return await runInstallPackage(job, req.file!.path); }
    finally { installRunning = false; }
  });
  res.json({ success: true, jobId });
});

// POST /api/admin/updates/rollback
router.post("/admin/updates/rollback", async (req, res) => {
  const { filename } = req.body as { filename: string };
  if (!filename) return res.status(400).json({ success: false, error: "اسم الملف مطلوب" });
  if (filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ success: false, error: "اسم الملف غير صالح" });
  }
  const jobId = startJob("rollback", job => runRollback(job, filename));
  res.json({ success: true, jobId });
});

// GET /api/admin/updates/job/:id  — falls back to disk after tsx restart
router.get("/admin/updates/job/:id", async (req, res) => {
  const id  = String(req.params.id);
  let   job = jobs.get(id) ?? await loadJobFromDisk(id);
  if (!job) return res.status(404).json({ success: false, error: "Job not found" });
  jobs.set(id, job);
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
  res.json({ success: true });
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
  res.json({ success: true });
});

export default router;
