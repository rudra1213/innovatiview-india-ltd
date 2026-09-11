import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import User from "../models/User.js";
import Expense from "../models/Expense.js";
import { authenticate, allow } from "../middleware/auth.js";
import { check, safeUser } from "../utils/http.js";
import {
  userCreateSchema,
  userUpdateSchema,
  objectId,
  password,
  pagingSchema,
  escapeRegex,
} from "../utils/validation.js";
const router = Router();
router.use(authenticate, allow("Admin"));
async function validateManager(role, managerId) {
  if (role !== "Employee") return null;
  check(managerId, 400, "Assign a manager to this employee.");
  check(
    await User.exists({ _id: managerId, role: "Manager", active: true }),
    400,
    "Select an active manager.",
  );
  return managerId;
}
router.get("/managers", async (req, res) =>
  res.json({
    items: await User.find({ role: "Manager", active: true })
      .select("name email")
      .sort({ name: 1 })
      .lean(),
  }),
);
router.get("/", async (req, res) => {
  const q = pagingSchema.parse(req.query);
  const filter = { ...(q.role ? { role: q.role } : {}) };
  if (q.search) {
    const regex = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .populate("managerId", "name email active")
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ]);
  res.json({
    items: items.map(safeUser),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  });
});
router.post("/", async (req, res) => {
  const input = userCreateSchema.parse(req.body);
  const managerId = await validateManager(input.role, input.managerId);
  const user = await User.create({
    ...input,
    managerId,
    password: await bcrypt.hash(input.password, 12),
  });
  res.status(201).json({ user: safeUser(user) });
});
router.patch("/:id", async (req, res) => {
  const input = userUpdateSchema.parse(req.body);
  const target = await User.findById(objectId.parse(req.params.id));
  check(target, 404, "User not found.");
  check(
    target.role !== "Admin",
    403,
    "Administrator accounts are maintained using the seed script. Use Settings to change your password.",
  );
  const managerId = await validateManager(target.role, input.managerId);
  if (target.role === "Manager" && !input.active) {
    const [employees, pending] = await Promise.all([
      User.countDocuments({
        role: "Employee",
        managerId: target._id,
        active: true,
      }),
      Expense.countDocuments({
        managerId: target._id,
        status: "Pending",
        deletedAt: null,
      }),
    ]);
    check(
      !employees && !pending,
      400,
      "Reassign active employees and pending expenses before deactivating this manager.",
    );
  }
  const user = await User.findByIdAndUpdate(
    target._id,
    {
      $set: {
        name: input.name,
        email: input.email,
        active: input.active,
        managerId,
      },
      ...(!input.active ? { $inc: { tokenVersion: 1 } } : {}),
    },
    { new: true, runValidators: true },
  ).populate("managerId", "name email active");
  res.json({ user: safeUser(user) });
});
router.patch("/:id/password", async (req, res) => {
  const input = z.object({ password }).parse(req.body);
  const target = await User.findById(objectId.parse(req.params.id));
  check(target, 404, "User not found.");
  check(target.role !== "Admin", 403, "Change your own password in Settings.");
  await User.updateOne(
    { _id: target._id },
    {
      $set: { password: await bcrypt.hash(input.password, 12) },
      $inc: { tokenVersion: 1 },
    },
  );
  res.json({ message: "Password reset. Previous sessions are invalidated." });
});
export default router;
