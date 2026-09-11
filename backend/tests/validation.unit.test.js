import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import {
  expenseSchema,
  password,
  email,
  pagingSchema,
  escapeRegex,
} from "../src/utils/validation.js";
import { receiptFromFile } from "../src/middleware/upload.js";
import { expenseScope, allow, protectOrigin } from "../src/middleware/auth.js";
import { serializeExpense, safeUser } from "../src/utils/http.js";
import Expense from "../src/models/Expense.js";
const valid = {
  title: "Business travel",
  category: "Travel",
  amount: "1500.99",
  date: "2025-01-01",
  description: "Rail ticket for a client visit.",
};
test("expense input converts INR to exact integer paise and rejects invalid amounts", () => {
  assert.equal(expenseSchema.parse(valid).amount, 150099);
  assert.equal(expenseSchema.parse({ ...valid, amount: "0.01" }).amount, 1);
  for (const amount of [
    "-1",
    "0",
    "1.001",
    "1e4",
    "Infinity",
    "1000000.01",
    {},
    null,
  ])
    assert.equal(expenseSchema.safeParse({ ...valid, amount }).success, false);
});
test("date, title and category validation", () => {
  for (const overrides of [
    { date: "2025-02-30" },
    { date: "2999-01-01" },
    { date: "bad-date" },
    { category: "Injected category" },
    { title: "  " },
    { description: "" },
  ])
    assert.equal(
      expenseSchema.safeParse({ ...valid, ...overrides }).success,
      false,
    );
});
test("credentials validate email normalization and bcrypt byte limits", async () => {
  assert.equal(email.parse(" TEST@Example.com "), "test@example.com");
  assert.equal(password.safeParse("short").success, false);
  assert.equal(password.safeParse("a".repeat(73)).success, false);
  assert.equal(password.safeParse("😊".repeat(19)).success, false);
  const hash = await bcrypt.hash("Strong-Password!2026", 12);
  assert.notEqual(hash, "Strong-Password!2026");
  assert.ok(await bcrypt.compare("Strong-Password!2026", hash));
  assert.equal(await bcrypt.compare("wrong", hash), false);
});
test("query operators are rejected and text search is literal", () => {
  assert.equal(
    pagingSchema.safeParse({ "status[$ne]": "Rejected" }).success,
    false,
  );
  assert.equal(pagingSchema.safeParse({ page: "0" }).success, false);
  assert.equal(pagingSchema.safeParse({ limit: "500" }).success, false);
  assert.equal(pagingSchema.parse({}).limit, 15);
  const needle = "A+B (tax) [receipt].*";
  const escaped = new RegExp(escapeRegex(needle));
  assert.ok(escaped.test(needle));
  assert.equal(escaped.test("AAAB tax anything"), false);
});
test("receipt type is sniffed from bytes instead of trusting file extension", async () => {
  const data = Buffer.from(
    "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF",
  );
  const receipt = await receiptFromFile({
    buffer: data,
    size: data.length,
    originalname: '../test".pdf',
    mimetype: "text/html",
  });
  assert.equal(receipt.mimeType, "application/pdf");
  assert.equal(receipt.filename.includes('"'), false);
  await assert.rejects(
    receiptFromFile({
      buffer: Buffer.from("<script>attack()</script>"),
      size: 25,
      originalname: "receipt.pdf",
    }),
  );
  assert.equal(await receiptFromFile(null), null);
});
test("authorization scopes records by employee or assigned manager", () => {
  const id = new mongoose.Types.ObjectId();
  assert.deepEqual(expenseScope({ role: "Employee", _id: id }), {
    employeeId: id,
    deletedAt: null,
  });
  assert.deepEqual(expenseScope({ role: "Manager", _id: id }), {
    managerId: id,
    deletedAt: null,
  });
  assert.deepEqual(expenseScope({ role: "Admin", _id: id }), {
    deletedAt: null,
  });
  assert.throws(
    () => allow("Admin")({ user: { role: "Employee" } }, {}, () => {}),
    { status: 403 },
  );
  let reached = false;
  allow("Manager", "Admin")({ user: { role: "Manager" } }, {}, () => {
    reached = true;
  });
  assert.ok(reached);
});
test("write requests require the configured origin", () => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1/unit_test";
  process.env.JWT_SECRET = "unit-test-secret-with-more-than-32-characters";
  process.env.APP_URL = "http://localhost:5173";
  process.env.NODE_ENV = "test";
  assert.throws(
    () =>
      protectOrigin(
        { method: "POST", get: () => "https://attacker.example" },
        {},
        () => {},
      ),
    { status: 403 },
  );
  assert.throws(
    () => protectOrigin({ method: "POST", get: () => undefined }, {}, () => {}),
    { status: 403 },
  );
  let passed = false;
  protectOrigin(
    { method: "POST", get: () => "http://localhost:5173" },
    {},
    () => {
      passed = true;
    },
  );
  assert.ok(passed);
});
test("database defaults, integer currency and API privacy", async () => {
  const id = new mongoose.Types.ObjectId();
  const data = Buffer.from("%PDF-1.4");
  const model = new Expense({
    ...valid,
    amount: 150099,
    employeeId: id,
    managerId: new mongoose.Types.ObjectId(),
    receipt: {
      filename: "receipt.pdf",
      mimeType: "application/pdf",
      size: data.length,
      data,
    },
  });
  await model.validate();
  assert.equal(model.status, "Pending");
  assert.equal(model.paymentStatus, "Not Applicable");
  const output = serializeExpense(model);
  assert.equal(output.amount, 1500.99);
  assert.equal(output.receipt.data, undefined);
  model.amount = 123.45;
  await assert.rejects(model.validate());
  const publicUser = safeUser({
    _id: id,
    name: "User",
    email: "u@example.com",
    role: "Employee",
    password: "secret",
    tokenVersion: 4,
  });
  assert.equal(publicUser.password, undefined);
  assert.equal(publicUser.tokenVersion, undefined);
});
