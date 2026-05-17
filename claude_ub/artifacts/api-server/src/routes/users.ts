import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";

const router = Router();

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
    const id = parseInt(req.params.id);
    const { name, email, phone, avatar } = req.body;
    const [updated] = await db
      .update(usersTable)
      .set({ name, email, phone, avatar })
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
      });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    res.status(500).json({ success: false, error: msg });
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
