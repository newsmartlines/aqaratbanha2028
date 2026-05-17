import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ne, and } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

function sessionUserId(req: Request): number | null {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return getSession(token)?.userId ?? null;
}

router.get("/users", async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "admin"))
      .orderBy(usersTable.createdAt);
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const sid = sessionUserId(req);
    if (sid == null) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    const [row] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sid));
    if (sid !== id && row?.role !== "admin") {
      return res.status(403).json({ success: false, error: "لا يمكنك تعديل حساب مستخدم آخر" });
    }

    const { name, email, phone, avatar, regionId, cityId } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (phone !== undefined) patch.phone = phone ? String(phone).trim() : null;
    if (avatar !== undefined) patch.avatar = avatar ? String(avatar) : null;
    if (regionId !== undefined) {
      const r = parseInt(String(regionId), 10);
      patch.regionId = Number.isFinite(r) && r > 0 ? r : null;
    }
    if (cityId !== undefined) {
      const c = parseInt(String(cityId), 10);
      patch.cityId = Number.isFinite(c) && c > 0 ? c : null;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, error: "لا توجد حقول للتحديث" });
    }

    if (patch.email) {
      const [dup] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, patch.email as string), ne(usersTable.id, id)))
        .limit(1);
      if (dup) return res.status(409).json({ success: false, error: "البريد الإلكتروني مستخدم مسبقاً" });
    }

    const [updated] = await db
      .update(usersTable)
      .set(patch as Partial<{ name: string; email: string; phone: string | null; avatar: string | null }>)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        regionId: usersTable.regionId,
        cityId: usersTable.cityId,
      });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    const dup =
      typeof err === "object" &&
      err !== null &&
      ("code" in err && (err as { code?: string }).code === "23505");
    if (dup) return res.status(409).json({ success: false, error: "البريد الإلكتروني مستخدم مسبقاً" });
    return res.status(500).json({ success: false, error: msg });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ["active", "suspended"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
    const [updated] = await db
      .update(usersTable)
      .set({ status })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, status: usersTable.status });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update user status" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

export default router;
