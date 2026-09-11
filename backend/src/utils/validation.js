import { z } from "zod";
import { CATEGORIES } from "../models/Expense.js";
export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");
export const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});
export function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const expenseDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid date",
  )
  .refine((v) => v <= todayIndia(), "Expense date cannot be in the future");
export const expenseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.enum(CATEGORIES),
  amount: z
    .union([z.string(), z.number()])
    .transform(String)
    .refine(
      (v) => /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(v),
      "Enter a positive amount with up to two decimal places",
    )
    .transform((v) => Math.round(Number(v) * 100))
    .pipe(z.number().int().min(1).max(100000000)),
  date: expenseDate,
  description: z.string().trim().min(5).max(2000),
});
export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  role: z.enum(["Employee", "Manager"]),
  managerId: objectId.nullable().optional(),
});
export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  managerId: objectId.nullable().optional(),
  active: z.boolean(),
});
export const pagingSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
    search: z.string().trim().max(100).default(""),
    status: z.enum(["Pending", "Approved", "Rejected"]).optional(),
    paymentStatus: z.enum(["Pending Payment", "Paid"]).optional(),
    role: z.enum(["Employee", "Manager", "Admin"]).optional(),
  })
  .strict();
export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
