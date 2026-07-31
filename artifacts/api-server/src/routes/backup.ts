import { Router } from "express";
import { db } from "@workspace/db";
import {
  regionsTable, citiesTable, areasTable, featuredAreasTable,
  categoriesTable, subcategoriesTable,
  propertiesTable, siteSettingsTable, emailTemplatesTable,
  billingPlansTable, commissionRulesTable, packagesTable,
  adminStaffTable, usersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const router = Router();
router.use("/admin/backup", adminOnly);

// ── Config ────────────────────────────────────────────────────────────────────

const SEEDS_DIR = path.resolve(process.cwd(), "lib/db/seeds");

// Keys to strip from site_settings exports (sensitive)
const SENSITIVE_SETTING_KEYS = new Set([
  "smtpPass", "smtpUser", "smtpHost", "smtpPort", "smtpSecure",
  "googleClientSecret", "jwtSecret",
  "paymentGatewayKey", "stripeSecret",
]);

// Ensure seeds directory exists
async function ensureSeedsDir() {
  if (!existsSync(SEEDS_DIR)) await fs.mkdir(SEEDS_DIR, { recursive: true });
}

// camelCase → snake_case helper (for SQL generation)
function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// Format a value for SQL INSERT
function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

// ── Table Catalog ─────────────────────────────────────────────────────────────

type TableEntry = {
  key: string;
  dbName: string;
  label: string;
  group: string;
  seqCol: string;
  fetch: () => Promise<any[]>;
};

const TABLES: TableEntry[] = [
  {
    key: "regions", dbName: "regions", label: "المحافظات", group: "locations", seqCol: "id",
    fetch: () => db.select().from(regionsTable).orderBy(regionsTable.id),
  },
  {
    key: "cities", dbName: "cities", label: "المدن", group: "locations", seqCol: "id",
    fetch: () => db.select().from(citiesTable).orderBy(citiesTable.id),
  },
  {
    key: "areas", dbName: "areas", label: "المناطق", group: "locations", seqCol: "id",
    fetch: () => db.select().from(areasTable).orderBy(areasTable.id),
  },
  {
    key: "featuredAreas", dbName: "featured_areas", label: "المناطق المميزة", group: "locations", seqCol: "id",
    fetch: () => db.select().from(featuredAreasTable).orderBy(featuredAreasTable.id),
  },
  {
    key: "categories", dbName: "categories", label: "التصنيفات", group: "categories", seqCol: "id",
    fetch: () => db.select().from(categoriesTable).orderBy(categoriesTable.id),
  },
  {
    key: "subcategories", dbName: "subcategories", label: "التصنيفات الفرعية", group: "categories", seqCol: "id",
    fetch: () => db.select().from(subcategoriesTable).orderBy(subcategoriesTable.id),
  },
  {
    key: "properties", dbName: "properties", label: "العقارات", group: "properties", seqCol: "id",
    fetch: () => db.select().from(propertiesTable).orderBy(propertiesTable.id),
  },
  {
    key: "emailTemplates", dbName: "email_templates", label: "قوالب البريد", group: "email", seqCol: "id",
    fetch: () => db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.id),
  },
  {
    key: "siteSettings", dbName: "site_settings", label: "إعدادات الموقع", group: "settings", seqCol: "id",
    fetch: async () => {
      const rows = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.id);
      return rows.filter(r => !SENSITIVE_SETTING_KEYS.has(r.key));
    },
  },
  {
    key: "billingPlans", dbName: "billing_plans", label: "خطط الاشتراك", group: "billing", seqCol: "id",
    fetch: () => db.select().from(billingPlansTable).orderBy(billingPlansTable.id),
  },
  {
    key: "commissionRules", dbName: "commission_rules", label: "قواعد العمولة", group: "billing", seqCol: "id",
    fetch: () => db.select().from(commissionRulesTable).orderBy(commissionRulesTable.id),
  },
  {
    key: "packages", dbName: "packages", label: "الباقات القديمة", group: "billing", seqCol: "id",
    fetch: () => db.select().from(packagesTable).orderBy(packagesTable.id),
  },
  {
    key: "adminStaff", dbName: "admin_staff", label: "موظفو الإدارة", group: "admin", seqCol: "id",
    fetch: () => db.select().from(adminStaffTable).orderBy(adminStaffTable.id),
  },
  {
    key: "users", dbName: "users", label: "المستخدمون (بدون كلمات المرور)", group: "admin", seqCol: "id",
    fetch: async () => {
      const rows = await db.select().from(usersTable).orderBy(usersTable.id);
      // Strip passwordHash — never export real passwords
      return rows.map(({ passwordHash: _, ...safe }) => safe);
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildJsonExport(tables: Record<string, any[]>): object {
  return {
    version: "1.0",
    platform: "عقارات بنها",
    exportedAt: new Date().toISOString(),
    tables,
  };
}

function buildSqlExport(tables: Record<string, any[]>): string {
  const lines: string[] = [
    `-- عقارات بنها — Database Export`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Version: 1.0`,
    ``,
    `BEGIN;`,
    ``,
  ];

  for (const [tableName, rows] of Object.entries(tables)) {
    if (!rows || rows.length === 0) continue;
    const dbName = TABLES.find(t => t.key === tableName)?.dbName ?? tableName;
    const cols = Object.keys(rows[0]).map(toSnake);
    const quotedCols = cols.map(c => `"${c}"`).join(", ");

    lines.push(`-- Table: ${dbName} (${rows.length} rows)`);
    lines.push(`DELETE FROM "${dbName}";`);

    const insertBatch: string[] = [];
    for (const row of rows) {
      const vals = Object.values(row).map(sqlValue).join(", ");
      insertBatch.push(`  (${vals})`);
    }
    lines.push(`INSERT INTO "${dbName}" (${quotedCols}) VALUES`);
    lines.push(insertBatch.join(",\n") + ";");
    lines.push(`SELECT setval(pg_get_serial_sequence('"${dbName}"', 'id'), COALESCE(MAX(id), 1)) FROM "${dbName}";`);
    lines.push(``);
  }

  lines.push(`COMMIT;`);
  return lines.join("\n");
}

// ── GET /api/admin/backup/status ─────────────────────────────────────────────

router.get("/admin/backup/status", async (_req, res) => {
  try {
    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      try {
        const rows = await t.fetch();
        counts[t.key] = rows.length;
      } catch {
        counts[t.key] = 0;
      }
    }

    // Check seed files
    const seedFiles: Array<{ name: string; size: number; exportedAt: string | null }> = [];
    if (existsSync(SEEDS_DIR)) {
      const files = await fs.readdir(SEEDS_DIR).catch(() => []);
      for (const file of files.filter(f => f.endsWith(".json") && f !== "manifest.json")) {
        const fp = path.join(SEEDS_DIR, file);
        const stat = await fs.stat(fp).catch(() => null);
        let exportedAt: string | null = null;
        try {
          const content = JSON.parse(await fs.readFile(fp, "utf8"));
          exportedAt = content.exportedAt ?? null;
        } catch {}
        seedFiles.push({ name: file, size: stat?.size ?? 0, exportedAt });
      }
    }

    let manifest: any = null;
    const manifestPath = path.join(SEEDS_DIR, "manifest.json");
    if (existsSync(manifestPath)) {
      try { manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")); } catch {}
    }

    res.json({
      success: true,
      data: {
        tables: TABLES.map(t => ({
          key: t.key,
          dbName: t.dbName,
          label: t.label,
          group: t.group,
          count: counts[t.key] ?? 0,
        })),
        seedFiles,
        manifest,
        seedsDir: SEEDS_DIR,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/backup/export — download JSON or SQL ─────────────────────

router.post("/admin/backup/export", async (req, res) => {
  try {
    const { tableKeys = [] as string[], format = "json" } = req.body as {
      tableKeys: string[];
      format: "json" | "sql";
    };

    const selected = TABLES.filter(t => tableKeys.includes(t.key));
    if (selected.length === 0) {
      return res.status(400).json({ success: false, error: "اختر جداول للتصدير" });
    }

    const tables: Record<string, any[]> = {};
    for (const t of selected) {
      tables[t.key] = await t.fetch();
    }

    if (format === "sql") {
      const sql = buildSqlExport(tables);
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="aqarat-banha-backup-${ts}.sql"`);
      return res.send(sql);
    }

    // JSON format (default)
    const payload = buildJsonExport(tables);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="aqarat-banha-backup-${ts}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err: any) {
    console.error("[backup/export]", err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/backup/save-seeds — write seed files to lib/db/seeds/ ────

router.post("/admin/backup/save-seeds", async (req, res) => {
  try {
    const { tableKeys = [] as string[] } = req.body as { tableKeys: string[] };

    const selected = TABLES.filter(t => tableKeys.length === 0 || tableKeys.includes(t.key));
    await ensureSeedsDir();

    // Group by seed file
    const seedGroups: Record<string, { tables: Record<string, any[]>; label: string }> = {
      locations: { tables: {}, label: "المواقع الجغرافية" },
      categories: { tables: {}, label: "التصنيفات" },
      properties: { tables: {}, label: "العقارات" },
      email: { tables: {}, label: "قوالب البريد" },
      settings: { tables: {}, label: "إعدادات الموقع" },
      billing: { tables: {}, label: "الفواتير والاشتراكات" },
      admin: { tables: {}, label: "المستخدمون والإدارة" },
    };

    const stats: Record<string, number> = {};

    for (const t of selected) {
      const rows = await t.fetch();
      stats[t.key] = rows.length;
      if (seedGroups[t.group]) {
        seedGroups[t.group].tables[t.key] = rows;
      }
    }

    const now = new Date().toISOString();
    const savedFiles: string[] = [];

    for (const [groupKey, group] of Object.entries(seedGroups)) {
      const hasSomeData = Object.values(group.tables).some(r => r.length > 0);
      if (!hasSomeData) continue;

      const fileData = {
        version: "1.0",
        group: groupKey,
        label: group.label,
        exportedAt: now,
        tables: group.tables,
      };
      const fileName = `${groupKey}.json`;
      await fs.writeFile(path.join(SEEDS_DIR, fileName), JSON.stringify(fileData, null, 2), "utf8");
      savedFiles.push(fileName);
    }

    // Write manifest
    const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);
    const manifest = {
      version: "1.0",
      platform: "عقارات بنها",
      exportedAt: now,
      files: savedFiles,
      tableCounts: stats,
      totalRows: totalCount,
    };
    await fs.writeFile(path.join(SEEDS_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    res.json({
      success: true,
      message: `تم حفظ ${savedFiles.length} ملف seed في lib/db/seeds/`,
      files: savedFiles,
      stats,
    });
  } catch (err: any) {
    console.error("[backup/save-seeds]", err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/backup/restore-seeds — restore from seed files ────────────

router.post("/admin/backup/restore-seeds", async (req, res) => {
  try {
    const { tables: requestedTables = [] as string[], truncate = false } = req.body as {
      tables: string[];
      truncate: boolean;
    };

    if (!existsSync(SEEDS_DIR)) {
      return res.status(404).json({ success: false, error: "مجلد seeds غير موجود" });
    }

    const files = (await fs.readdir(SEEDS_DIR)).filter(f => f.endsWith(".json") && f !== "manifest.json");
    if (files.length === 0) {
      return res.status(404).json({ success: false, error: "لا توجد ملفات seed للاستعادة" });
    }

    const result: Record<string, { inserted: number; skipped: number; error?: string }> = {};

    for (const file of files) {
      try {
        const content = JSON.parse(await fs.readFile(path.join(SEEDS_DIR, file), "utf8"));
        const fileTables = content.tables as Record<string, any[]>;

        for (const [tableKey, rows] of Object.entries(fileTables)) {
          if (requestedTables.length > 0 && !requestedTables.includes(tableKey)) continue;
          if (!rows || rows.length === 0) continue;

          const tableDef = TABLES.find(t => t.key === tableKey);
          if (!tableDef) {
            result[tableKey] = { inserted: 0, skipped: rows.length };
            continue;
          }

          result[tableKey] = await restoreTableRows(tableDef, rows, truncate);
        }
      } catch (err: any) {
        console.error(`[restore-seeds] Error reading ${file}:`, err);
      }
    }

    // Reset sequences
    await resetSequences();

    res.json({ success: true, message: "تمت الاستعادة بنجاح", result });
  } catch (err: any) {
    console.error("[backup/restore-seeds]", err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/backup/restore-upload — restore from uploaded JSON ────────

router.post("/admin/backup/restore-upload", async (req, res) => {
  try {
    const body = req.body as {
      data: { version: string; tables: Record<string, any[]> };
      tables: string[];
      truncate: boolean;
    };
    const { data, tables: requestedTables = [], truncate = false } = body;

    if (!data || !data.tables) {
      return res.status(400).json({ success: false, error: "بيانات الاستعادة غير صحيحة" });
    }

    const result: Record<string, { inserted: number; skipped: number; error?: string }> = {};

    for (const [tableKey, rows] of Object.entries(data.tables)) {
      if (requestedTables.length > 0 && !requestedTables.includes(tableKey)) continue;
      if (!rows || rows.length === 0) continue;

      const tableDef = TABLES.find(t => t.key === tableKey);
      if (!tableDef) {
        result[tableKey] = { inserted: 0, skipped: rows.length };
        continue;
      }

      result[tableKey] = await restoreTableRows(tableDef, rows, truncate);
    }

    await resetSequences();

    res.json({ success: true, message: "تمت الاستعادة من الملف المرفوع بنجاح", result });
  } catch (err: any) {
    console.error("[backup/restore-upload]", err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/admin/backup/seed-file/:name — download individual seed file ─────

router.get("/admin/backup/seed-file/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name.endsWith(".json") || name.includes("..") || name.includes("/")) {
      return res.status(400).json({ success: false, error: "اسم ملف غير صالح" });
    }
    const fp = path.join(SEEDS_DIR, name);
    if (!existsSync(fp)) {
      return res.status(404).json({ success: false, error: "الملف غير موجود" });
    }
    const content = await fs.readFile(fp, "utf8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── Restore helper ─────────────────────────────────────────────────────────────

async function restoreTableRows(
  tableDef: TableEntry,
  rows: any[],
  truncate: boolean,
): Promise<{ inserted: number; skipped: number; error?: string }> {
  let inserted = 0;
  let skipped = 0;

  try {
    if (truncate) {
      await db.execute(sql.raw(`DELETE FROM "${tableDef.dbName}"`));
    }

    for (const row of rows) {
      try {
        const keys = Object.keys(row);
        const vals = Object.values(row);
        const colSqls = keys.map(k => sql.raw(`"${toSnake(k)}"`));
        const valSqls = vals.map(v => sql`${v}`);

        await db.execute(
          sql`INSERT INTO ${sql.raw(`"${tableDef.dbName}"`)} (${sql.join(colSqls, sql`,`)}) VALUES (${sql.join(valSqls, sql`,`)}) ON CONFLICT (id) DO NOTHING`,
        );
        inserted++;
      } catch {
        skipped++;
      }
    }
  } catch (err: any) {
    return { inserted, skipped, error: err?.message };
  }

  return { inserted, skipped };
}

async function resetSequences() {
  for (const t of TABLES) {
    try {
      await db.execute(
        sql.raw(`SELECT setval(pg_get_serial_sequence('"${t.dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t.dbName}"), 1))`),
      );
    } catch {
      // no sequence or table not found — ignore
    }
  }
}

export default router;
