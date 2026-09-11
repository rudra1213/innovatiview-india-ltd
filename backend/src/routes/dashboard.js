import { Router } from "express";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import { authenticate, expenseScope } from "../middleware/auth.js";
import { serializeExpense, populateExpense } from "../utils/http.js";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
  const scope = expenseScope(req.user);
  const [groups, recent, categories, headcount] = await Promise.all([
    Expense.aggregate([
      { $match: scope },
      {
        $group: {
          _id: { status: "$status", payment: "$paymentStatus" },
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    populateExpense(
      Expense.find(scope).select("-history").sort({ createdAt: -1 }).limit(6),
    ),
    Expense.aggregate([
      { $match: scope },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    req.user.role === "Admin"
      ? User.aggregate([
          { $match: { role: { $in: ["Employee", "Manager"] } } },
          {
            $group: {
              _id: "$role",
              total: { $sum: 1 },
              active: { $sum: { $cond: ["$active", 1, 0] } },
            },
          },
        ])
      : [],
  ]);
  const stats = {
    total: 0,
    totalAmount: 0,
    pending: 0,
    pendingAmount: 0,
    approved: 0,
    approvedAmount: 0,
    rejected: 0,
    rejectedAmount: 0,
    paid: 0,
    paidAmount: 0,
    unpaid: 0,
    unpaidAmount: 0,
    employees: 0,
    managers: 0,
    activeEmployees: 0,
    activeManagers: 0,
  };
  for (const group of groups) {
    const key = group._id.status.toLowerCase();
    stats.total += group.count;
    stats.totalAmount += group.amount;
    stats[key] += group.count;
    stats[`${key}Amount`] += group.amount;
    if (group._id.status === "Approved") {
      const paymentKey = group._id.payment === "Paid" ? "paid" : "unpaid";
      stats[paymentKey] += group.count;
      stats[`${paymentKey}Amount`] += group.amount;
    }
  }
  for (const key of Object.keys(stats))
    if (key.endsWith("Amount")) stats[key] /= 100;
  for (const group of headcount) {
    const key = group._id === "Employee" ? "employees" : "managers";
    stats[key] = group.total;
    stats[group._id === "Employee" ? "activeEmployees" : "activeManagers"] =
      group.active;
  }
  res.json({
    stats,
    recent: recent.map(serializeExpense),
    categories: categories.map((c) => ({
      category: c._id,
      count: c.count,
      amount: c.amount / 100,
    })),
  });
});
export default router;
