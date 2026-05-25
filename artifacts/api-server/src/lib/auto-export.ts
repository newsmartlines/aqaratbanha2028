/**
 * auto-export.ts
 * ──────────────
 * Write-through seed-file exporter.
 *
 * Called after every admin mutation so that `lib/db/seeds/*.json` always
 * mirrors the live database. On a fresh environment (new clone / new Replit
 * project) `seedFromFiles()` reads these JSON files and restores the exact
 * state — no data is ever lost.
 *
 * Usage (non-blocking, fire-and-forget):
 *   autoExportGroup("locations");   // in regions/cities/areas routes
 *   autoExportGroup("categories");  // in category routes
 *   autoExportGroup("billing");     // in billing-plans routes
 *   autoExportGroup("settings");    // in settings routes
 *
 * Or await the full export on startup:
 *   await autoExportAll();
 */

import { db } from "@workspace/db";
import {
  regionsTable,
  citiesTable,
  areasTable,
  featuredAreasTable,
  categoriesTable,
  subcategoriesTable,
  billingPlansTable,
  commissionRulesTable,
  siteSettingsTable,
  packagesTable,
} from "@workspace/db";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

// process.cwd() == artifacts/api-server  →  go up two levels to workspace root
const SEEDS_DIR = path.resolve(process.cwd(), "../../lib/db/seeds");

const SENSITIVE_SETTINGS = new Set([
  "smtpPass", "smtpUser", "smtpHost", "smtpPort", "smtpSecure",
  "googleClientSecret", "jwtSecret", "stcpaySecret", "stcpayMerchantId",
  "paymentGatewayKey", "stripeSecret",
]);

export type ExportGroupKey = "locations" | "categories" | "billing" | "settings";

type GroupDef = {
  label: string;
  tables: Record<string, () => Promise<unknown[]>>;
};

const GROUPS: Record<ExportGroupKey, GroupDef> = {
  locations: {
    label: "المواقع الجغرافية",
    tables: {
      regions:      () => db.select().from(regionsTable).orderBy(regionsTable.id),
      cities:       () => db.select().from(citiesTable).orderBy(citiesTable.id),
      areas:        () => db.select().from(areasTable).orderBy(areasTable.id),
      featuredAreas:() => db.select().from(featuredAreasTable).orderBy(featuredAreasTable.id),
    },
  },
  categories: {
    label: "التصنيفات",
    tables: {
      categories:   () => db.select().from(categoriesTable).orderBy(categoriesTable.id),
      subcategories:() => db.select().from(subcategoriesTable).orderBy(subcategoriesTable.id),
    },
  },
  billing: {
    label: "الفواتير والاشتراكات",
    tables: {
      billingPlans:    () => db.select().from(billingPlansTable).orderBy(billingPlansTable.id),
      commissionRules: () => db.select().from(commissionRulesTable).orderBy(commissionRulesTable.id),
      packages:        () => db.select().from(packagesTable).orderBy(packagesTable.id),
    },
  },
  settings: {
    label: "إعدادات الموقع",
    tables: {
      siteSettings: async () => {
        const rows = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.id);
        return rows.filter((r) => !SENSITIVE_SETTINGS.has(r.key));
      },
    },
  },
};

async function ensureDir(): Promise<void> {
  if (!existsSync(SEEDS_DIR)) await fs.mkdir(SEEDS_DIR, { recursive: true });
}

async function updateManifest(savedFiles: string[]): Promise<void> {
  const manifestPath = path.join(SEEDS_DIR, "manifest.json");
  let existing: string[] = [];
  if (existsSync(manifestPath)) {
    try {
      const m = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      existing = Array.isArray(m.files) ? m.files : [];
    } catch { /* ignore */ }
  }
  const merged = [...new Set([...existing, ...savedFiles])];
  const manifest = {
    version: "1.0",
    platform: "عقارات بنها",
    exportedAt: new Date().toISOString(),
    files: merged,
    description: "Auto-updated by write-through export. Do not edit manually.",
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

async function writeGroup(groupKey: ExportGroupKey): Promise<void> {
  await ensureDir();
  const def = GROUPS[groupKey];
  const tables: Record<string, unknown[]> = {};
  for (const [key, fetcher] of Object.entries(def.tables)) {
    tables[key] = await fetcher();
  }
  const fileData = {
    version: "1.0",
    group: groupKey,
    label: def.label,
    exportedAt: new Date().toISOString(),
    tables,
  };
  const fileName = `${groupKey}.json`;
  await fs.writeFile(path.join(SEEDS_DIR, fileName), JSON.stringify(fileData, null, 2), "utf8");
  await updateManifest([fileName]);
}

/**
 * Export one group to its seed file (fire-and-forget — call without await).
 * Errors are caught and logged; never throws.
 */
export function autoExportGroup(groupKey: ExportGroupKey): void {
  writeGroup(groupKey).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[auto-export] Failed to export "${groupKey}": ${msg}`);
  });
}

/**
 * Export ALL groups. Awaitable. Called on startup when no seed files exist.
 */
export async function autoExportAll(): Promise<void> {
  await ensureDir();
  for (const groupKey of Object.keys(GROUPS) as ExportGroupKey[]) {
    try {
      await writeGroup(groupKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[auto-export] Failed to export group "${groupKey}": ${msg}`);
    }
  }
  console.log("[auto-export] All seed files updated ✓");
}
