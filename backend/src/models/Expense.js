import mongoose from "mongoose";
export const CATEGORIES = [
  "Travel",
  "Accommodation",
  "Food & Meals",
  "Office Supplies",
  "Communication",
  "Other",
];
const receiptSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { _id: false },
);
const expenseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, maxlength: 120 },
    category: { type: String, enum: CATEGORIES, required: true },
    // Integer paise in MongoDB; API serializes this as rupees. Never sum floats.
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000000,
      validate: Number.isSafeInteger,
    },
    date: { type: String, required: true },
    description: { type: String, required: true, maxlength: 2000 },
    receipt: { type: receiptSchema, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String, default: "" },
    reviewNote: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["Not Applicable", "Pending Payment", "Paid"],
      default: "Not Applicable",
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paidAt: { type: Date, default: null },
    paymentReference: { type: String, default: "" },
    revision: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
    history: [
      {
        _id: false,
        action: String,
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorName: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
expenseSchema.index({ employeeId: 1, deletedAt: 1, createdAt: -1 });
expenseSchema.index({ managerId: 1, deletedAt: 1, status: 1, createdAt: -1 });
expenseSchema.index({
  deletedAt: 1,
  status: 1,
  paymentStatus: 1,
  createdAt: -1,
});
export default mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);
