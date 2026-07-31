import { Router } from "express";
import { db } from "@workspace/db";
import { adminStaffTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.use("/admin", adminOnly);

router.get("/admin/staff", async (_req, res) => {
  try {
    const staff = await db.select({
      id: adminStaffTable.id,
      name: adminStaffTable.name,
      email: adminStaffTable.email,
      role: adminStaffTable.role,
      permissions: adminStaffTable.permissions,
      status: adminStaffTable.status,
      createdAt: adminStaffTable.createdAt,
    }).from(adminStaffTable).orderBy(adminStaffTable.createdAt);
    res.json({ data: staff });
  } catch (e) {
    res.status(500).json({ error: "Failed to load staff" });
  }
});

router.post("/admin/staff", async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });
    const passwordHash = await bcrypt.hash(password, 10);
    const [staff] = await db.insert(adminStaffTable).values({
      name, email, passwordHash,
      role: role ?? "moderator",
      permissions: JSON.stringify(permissions ?? {}),
      status: "active",
    }).returning();
    const { passwordHash: _, ...safeStaff } = staff;
    res.status(201).json({ data: safeStaff });
  } catch (e: any) {
    console.error("Staff create error:", e?.code, e?.cause?.code, e?.message);
    const isDuplicate =
      e?.code === "23505" ||
      e?.cause?.code === "23505" ||
      String(e?.message ?? "").includes("unique") ||
      String(e?.message ?? "").includes("23505") ||
      String(e?.detail ?? "").includes("already exists");
    if (isDuplicate) return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Failed to create staff", detail: e?.message });
  }
});

router.put("/admin/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, role, permissions, status } = req.body;
    const updates: Partial<typeof adminStaffTable.$inferInsert> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);
    if (status) updates.status = status;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await db.update(adminStaffTable).set(updates).where(eq(adminStaffTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Staff not found" });
    const { passwordHash: _, ...safeStaff } = updated;
    res.json({ data: safeStaff });
  } catch (e: any) {
    console.error("Staff update error:", e?.code, e?.cause?.code, e?.message);
    const isDuplicate =
      e?.code === "23505" || e?.cause?.code === "23505" ||
      String(e?.message ?? "").includes("unique");
    if (isDuplicate) return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Failed to update staff", detail: e?.message });
  }
});

router.delete("/admin/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(adminStaffTable).where(eq(adminStaffTable.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete staff" });
  }
});

export default router;
