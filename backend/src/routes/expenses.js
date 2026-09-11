import { Router } from "express";
import { z } from "zod";
import Expense, { CATEGORIES } from "../models/Expense.js";
import User from "../models/User.js";
import { authenticate, allow, expenseScope } from "../middleware/auth.js";
import { upload, receiptFromFile } from "../middleware/upload.js";
import {
  expenseSchema,
  objectId,
  pagingSchema,
  escapeRegex,
} from "../utils/validation.js";
import {
  check,
  serializeExpense,
  populateExpense,
  audit,
} from "../utils/http.js";
const router = Router();
router.use(authenticate);
router.get("/categories", (req, res) => res.json({ categories: CATEGORIES }));
router.get("/", async (req, res) => {
  const q = pagingSchema.parse(req.query);
  const filter = expenseScope(req.user);
  if (q.status) filter.status = q.status;
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.search) {
    const regex = new RegExp(escapeRegex(q.search), "i");
    const people = await User.find({ name: regex })
      .select("_id")
      .limit(1000)
      .lean();
    filter.$or = [
      { title: regex },
      { category: regex },
      { employeeId: { $in: people.map((p) => p._id) } },
    ];
  }
  const [items, total] = await Promise.all([
    populateExpense(
      Expense.find(filter)
        .setOptions({ sanitizeFilter: false })
        .select("-history")
        .sort({ createdAt: -1, _id: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
    ),
    Expense.countDocuments(filter).setOptions({ sanitizeFilter: false }),
  ]);
  res.json({
    items: items.map(serializeExpense),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  });
});
router.post("/", allow("Employee"), upload, async (req, res) => {
  const input = expenseSchema.parse(req.body);
  const employee = await User.findById(req.user._id);
  const manager =
    employee.managerId &&
    (await User.findOne({
      _id: employee.managerId,
      role: "Manager",
      active: true,
    }));
  check(
    manager,
    400,
    "Ask your administrator to assign an active manager before submitting an expense.",
  );
  const receipt = await receiptFromFile(req.file);
  check(receipt, 400, "A bill or receipt is required.");
  const expense = await Expense.create({
    ...input,
    employeeId: employee._id,
    managerId: manager._id,
    receipt,
    history: [audit(req, "Submitted")],
  });
  res
    .status(201)
    .json({
      expense: serializeExpense(
        await populateExpense(Expense.findById(expense._id)),
      ),
    });
});
router.get("/:id/receipt", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const expense = await Expense.findOne({
    _id: id,
    ...expenseScope(req.user),
  }).select("+receipt.data");
  check(expense?.receipt?.data, 404, "Receipt not found.");
  res.set({
    "Content-Type": expense.receipt.mimeType,
    "Content-Length": expense.receipt.size,
    "Content-Disposition": `attachment; filename="${expense.receipt.filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  });
  res.send(expense.receipt.data);
});
router.get("/:id", async (req, res) => {
  const expense = await populateExpense(
    Expense.findOne({
      _id: objectId.parse(req.params.id),
      ...expenseScope(req.user),
    }),
  );
  check(expense, 404, "Expense not found.");
  res.json({ expense: serializeExpense(expense) });
});
const revision = z.coerce.number().int().min(0);
router.patch("/:id", allow("Employee"), upload, async (req, res) => {
  const input = expenseSchema.parse(req.body);
  const expectedRevision = revision.parse(req.body.revision);
  const receipt = await receiptFromFile(req.file);
  const expense = await Expense.findOneAndUpdate(
    {
      _id: objectId.parse(req.params.id),
      ...expenseScope(req.user),
      status: "Pending",
      revision: expectedRevision,
    },
    {
      $set: { ...input, ...(receipt ? { receipt } : {}) },
      $inc: { revision: 1 },
      $push: {
        history: audit(req, "Updated", "Employee updated the pending request."),
      },
    },
    { new: true, runValidators: true },
  );
  check(
    expense,
    409,
    "This request changed or is no longer pending. Refresh before editing.",
  );
  res.json({ expense: serializeExpense(expense) });
});
router.delete("/:id", allow("Employee"), async (req, res) => {
  const expense = await Expense.findOneAndUpdate(
    {
      _id: objectId.parse(req.params.id),
      ...expenseScope(req.user),
      status: "Pending",
      revision: revision.parse(req.body.revision),
    },
    {
      $set: { deletedAt: new Date() },
      $inc: { revision: 1 },
      $push: { history: audit(req, "Withdrawn") },
    },
  );
  check(
    expense,
    409,
    "This request changed or is no longer pending. Refresh and try again.",
  );
  res.json({ message: "Expense withdrawn." });
});
router.patch("/:id/review", allow("Manager", "Admin"), async (req, res) => {
  const input = z
    .object({
      status: z.enum(["Approved", "Rejected"]),
      reason: z.string().trim().max(1000).default(""),
      revision,
    })
    .parse(req.body);
  check(
    input.status !== "Rejected" || input.reason.length >= 5,
    400,
    "Provide a rejection reason of at least 5 characters.",
  );
  const expense = await Expense.findOneAndUpdate(
    {
      _id: objectId.parse(req.params.id),
      ...expenseScope(req.user),
      status: "Pending",
      revision: input.revision,
    },
    {
      $set: {
        status: input.status,
        rejectionReason: input.status === "Rejected" ? input.reason : "",
        reviewNote: input.status === "Approved" ? input.reason : "",
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        paymentStatus:
          input.status === "Approved" ? "Pending Payment" : "Not Applicable",
      },
      $inc: { revision: 1 },
      $push: { history: audit(req, input.status, input.reason) },
    },
    { new: true, runValidators: true },
  );
  check(
    expense,
    409,
    "This request changed or was already reviewed. Refresh to see the latest version.",
  );
  res.json({ expense: serializeExpense(expense) });
});
router.patch("/:id/payment", allow("Admin"), async (req, res) => {
  const input = z
    .object({ reference: z.string().trim().min(3).max(120), revision })
    .parse(req.body);
  const expense = await Expense.findOneAndUpdate(
    {
      _id: objectId.parse(req.params.id),
      deletedAt: null,
      status: "Approved",
      paymentStatus: "Pending Payment",
      revision: input.revision,
    },
    {
      $set: {
        paymentStatus: "Paid",
        paidBy: req.user._id,
        paidAt: new Date(),
        paymentReference: input.reference,
      },
      $inc: { revision: 1 },
      $push: { history: audit(req, "Paid", input.reference) },
    },
    { new: true, runValidators: true },
  );
  check(
    expense,
    409,
    "Expense changed, is not approved, or has already been paid.",
  );
  res.json({ expense: serializeExpense(expense) });
});
router.patch("/:id/manager", allow("Admin"), async (req, res) => {
  const input = z.object({ managerId: objectId, revision }).parse(req.body);
  const manager = await User.findOne({
    _id: input.managerId,
    role: "Manager",
    active: true,
  });
  check(manager, 400, "Select an active manager.");
  const expense = await Expense.findOneAndUpdate(
    {
      _id: objectId.parse(req.params.id),
      deletedAt: null,
      status: "Pending",
      revision: input.revision,
    },
    {
      $set: { managerId: manager._id },
      $inc: { revision: 1 },
      $push: {
        history: audit(
          req,
          "Manager reassigned",
          `Assigned to ${manager.name}`,
        ),
      },
    },
    { new: true },
  );
  check(expense, 409, "Expense changed or is no longer pending.");
  res.json({ expense: serializeExpense(expense) });
});
export default router;
