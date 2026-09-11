import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import request from "supertest";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters-12345";
process.env.APP_URL = "http://localhost:5173";
const { default: app } = await import("../src/app.js");
const { connectDB } = await import("../src/config/db.js");
const { default: User } = await import("../src/models/User.js");
const { default: Expense } = await import("../src/models/Expense.js");
const { default: Session } = await import("../src/models/Session.js");
const { default: LoginAttempt } = await import("../src/models/LoginAttempt.js");
let mongo, admin, manager, employee, outsider, otherManager;
const password = "Integration-Test!2026";
const origin = "http://localhost:5173";
const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF");
const clients = {};
const change = (client, method, path) =>
  client[method](path).set("Origin", origin);
const createExpense = (client, overrides = {}, file = pdf) => {
  let req = change(client, "post", "/api/expenses");
  const fields = {
    title: "Client visit",
    category: "Travel",
    amount: "1234.56",
    date: "2025-01-10",
    description: "Taxi for business client visit.",
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) req = req.field(k, String(v));
  return file
    ? req.attach("receipt", file, {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      })
    : req;
};
before(
  async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await connectDB();
    await Promise.all([
      User.createIndexes(),
      Expense.createIndexes(),
      Session.createIndexes(),
      LoginAttempt.createIndexes(),
    ]);
    const hash = await bcrypt.hash(password, 12);
    admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: hash,
      role: "Admin",
    });
    manager = await User.create({
      name: "Manager One",
      email: "manager@test.com",
      password: hash,
      role: "Manager",
    });
    otherManager = await User.create({
      name: "Manager Two",
      email: "manager2@test.com",
      password: hash,
      role: "Manager",
    });
    employee = await User.create({
      name: "Employee One",
      email: "employee@test.com",
      password: hash,
      role: "Employee",
      managerId: manager._id,
    });
    outsider = await User.create({
      name: "Outsider",
      email: "other@test.com",
      password: hash,
      role: "Employee",
      managerId: otherManager._id,
    });
    for (const [key, user] of Object.entries({
      admin,
      manager,
      employee,
      outsider,
      otherManager,
    })) {
      clients[key] = request.agent(app);
      await change(clients[key], "post", "/api/auth/login")
        .send({ email: user.email, password })
        .expect(200);
    }
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test("authentication, CSRF origin, password privacy and role boundaries", async () => {
  await request(app).get("/api/expenses").expect(401);
  await request(app)
    .post("/api/auth/login")
    .send({ email: employee.email, password })
    .expect(403);
  await change(request(app), "post", "/api/auth/login")
    .send({ email: employee.email, password: "wrong" })
    .expect(401);
  await clients.employee.get("/api/users").expect(403);
  await clients.manager.get("/api/users").expect(403);
  const me = await clients.employee.get("/api/auth/me").expect(200);
  assert.equal(me.body.user.role, "Employee");
  assert.equal(me.body.user.password, undefined);
  assert.equal(me.body.user.tokenVersion, undefined);
});
test("complete submission → assigned review → payment with private receipt and totals", async () => {
  const created = await createExpense(clients.employee).expect(201);
  const e = created.body.expense;
  assert.equal(e.status, "Pending");
  assert.equal(e.amount, 1234.56);
  assert.equal(e.managerId._id, String(manager._id));
  assert.equal(e.receipt.data, undefined);
  assert.equal((await Expense.findById(e._id)).amount, 123456);
  await clients.outsider.get(`/api/expenses/${e._id}`).expect(404);
  await clients.otherManager.get(`/api/expenses/${e._id}/receipt`).expect(404);
  const receipt = await clients.manager
    .get(`/api/expenses/${e._id}/receipt`)
    .expect(200);
  assert.equal(receipt.headers["content-type"], "application/pdf");
  assert.deepEqual(receipt.body, pdf);
  const list = await clients.manager
    .get("/api/expenses?status=Pending")
    .expect(200);
  assert.ok(list.body.items.some((x) => x._id === e._id));
  assert.equal((await clients.otherManager.get("/api/expenses")).body.total, 0);
  await change(clients.employee, "patch", `/api/expenses/${e._id}/review`)
    .send({ status: "Approved", revision: 0 })
    .expect(403);
  await change(clients.otherManager, "patch", `/api/expenses/${e._id}/review`)
    .send({ status: "Approved", revision: 0 })
    .expect(409);
  const approved = await change(
    clients.manager,
    "patch",
    `/api/expenses/${e._id}/review`,
  )
    .send({
      status: "Approved",
      reason: "Business trip verified.",
      revision: 0,
    })
    .expect(200);
  assert.equal(approved.body.expense.paymentStatus, "Pending Payment");
  await change(clients.manager, "patch", `/api/expenses/${e._id}/review`)
    .send({ status: "Rejected", reason: "Second decision", revision: 0 })
    .expect(409);
  await change(clients.manager, "patch", `/api/expenses/${e._id}/payment`)
    .send({ reference: "BANK-1", revision: 1 })
    .expect(403);
  await change(clients.admin, "patch", `/api/expenses/${e._id}/payment`)
    .send({ reference: "BANK-1", revision: 1 })
    .expect(200);
  await change(clients.admin, "patch", `/api/expenses/${e._id}/payment`)
    .send({ reference: "BANK-1", revision: 1 })
    .expect(409);
  const stats = (await clients.employee.get("/api/dashboard").expect(200)).body
    .stats;
  assert.equal(stats.approvedAmount, 1234.56);
  assert.equal(stats.paidAmount, 1234.56);
  assert.equal(stats.unpaidAmount, 0);
  const detail = (await clients.employee.get(`/api/expenses/${e._id}`)).body
    .expense;
  assert.deepEqual(
    detail.history.map((h) => h.action),
    ["Submitted", "Approved", "Paid"],
  );
  assert.equal(detail.paidBy._id, String(admin._id));
});
test("rejection requires a reason; decision is visible to employee; cannot pay rejected", async () => {
  const e = (
    await createExpense(clients.employee, { title: "Rejected request" })
  ).body.expense;
  await change(clients.manager, "patch", `/api/expenses/${e._id}/review`)
    .send({ status: "Rejected", reason: "", revision: 0 })
    .expect(400);
  await change(clients.manager, "patch", `/api/expenses/${e._id}/review`)
    .send({
      status: "Rejected",
      reason: "Receipt is not itemized.",
      revision: 0,
    })
    .expect(200);
  const detail = (await clients.employee.get(`/api/expenses/${e._id}`)).body
    .expense;
  assert.equal(detail.rejectionReason, "Receipt is not itemized.");
  assert.equal(detail.paymentStatus, "Not Applicable");
  await change(clients.admin, "patch", `/api/expenses/${e._id}/payment`)
    .send({ reference: "BANK-2", revision: 1 })
    .expect(409);
  await change(clients.employee, "delete", `/api/expenses/${e._id}`)
    .send({ revision: 1 })
    .expect(409);
});
test("pending update, stale review prevention, withdrawal and audit preservation", async () => {
  const e = (await createExpense(clients.employee)).body.expense;
  await change(clients.employee, "patch", `/api/expenses/${e._id}`)
    .field("title", "Updated client trip")
    .field("category", "Travel")
    .field("amount", "200.25")
    .field("date", "2025-01-10")
    .field("description", "Corrected journey amount.")
    .field("revision", "0")
    .expect(200);
  await change(clients.manager, "patch", `/api/expenses/${e._id}/review`)
    .send({ status: "Approved", revision: 0 })
    .expect(409);
  await change(clients.outsider, "delete", `/api/expenses/${e._id}`)
    .send({ revision: 1 })
    .expect(409);
  await change(clients.employee, "delete", `/api/expenses/${e._id}`)
    .send({ revision: 1 })
    .expect(200);
  await clients.employee.get(`/api/expenses/${e._id}`).expect(404);
  const stored = await Expense.findById(e._id);
  assert.ok(stored.deletedAt);
  assert.equal(stored.history.at(-1).action, "Withdrawn");
});
test("validation rejects forged upload, missing receipt, oversize, future date and invalid amounts", async () => {
  await createExpense(
    clients.employee,
    {},
    Buffer.from("<script>alert(1)</script>"),
  ).expect(400);
  await createExpense(clients.employee, {}, null).expect(400);
  await createExpense(
    clients.employee,
    {},
    Buffer.alloc(3 * 1024 * 1024 + 1),
  ).expect(400);
  for (const amount of ["-1", "0", "12.345", "1000001", "NaN"])
    await createExpense(clients.employee, { amount }).expect(400);
  await createExpense(clients.employee, { date: "2999-01-01" }).expect(400);
  await createExpense(clients.employee, { date: "2025-02-30" }).expect(400);
  await clients.employee.get("/api/expenses/invalid-id").expect(400);
  await clients.employee.get("/api/expenses?status[$ne]=Rejected").expect(400);
});
test("admin manages accounts, reassigns future and pending requests, preserves history", async () => {
  const created = await change(clients.admin, "post", "/api/users")
    .send({
      name: "New Employee",
      email: "new@test.com",
      password,
      role: "Employee",
      managerId: String(manager._id),
    })
    .expect(201);
  const u = created.body.user;
  assert.equal(u.password, undefined);
  await change(clients.admin, "post", "/api/users")
    .send({
      name: "Duplicate",
      email: "new@test.com",
      password,
      role: "Manager",
    })
    .expect(409);
  await change(clients.admin, "post", "/api/users")
    .send({
      name: "Invalid manager",
      email: "invalid@test.com",
      password,
      role: "Employee",
      managerId: String(employee._id),
    })
    .expect(400);
  const e = (await createExpense(clients.employee)).body.expense;
  await change(clients.admin, "patch", `/api/users/${employee._id}`)
    .send({
      name: employee.name,
      email: employee.email,
      active: true,
      managerId: String(otherManager._id),
    })
    .expect(200);
  assert.equal(
    (await Expense.findById(e._id)).managerId.toString(),
    manager._id.toString(),
  );
  const future = (await createExpense(clients.employee)).body.expense;
  assert.equal(future.managerId._id, String(otherManager._id));
  await change(clients.admin, "patch", `/api/expenses/${e._id}/manager`)
    .send({ managerId: String(otherManager._id), revision: 0 })
    .expect(200);
  await clients.manager.get(`/api/expenses/${e._id}`).expect(404);
  await clients.otherManager.get(`/api/expenses/${e._id}`).expect(200);
  await change(clients.admin, "patch", `/api/users/${otherManager._id}`)
    .send({ name: otherManager.name, email: otherManager.email, active: false })
    .expect(400);
  await change(clients.admin, "patch", `/api/users/${admin._id}`)
    .send({ name: "Disabled Admin", email: admin.email, active: false })
    .expect(403);
});
test("password reset and deactivation invalidate sessions; logout revokes captured cookie", async () => {
  const login = await change(request(app), "post", "/api/auth/login")
    .send({ email: outsider.email, password })
    .expect(200);
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  await change(request(app), "post", "/api/auth/logout")
    .set("Cookie", cookie)
    .send({})
    .expect(200);
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
  await change(clients.admin, "patch", `/api/users/${outsider._id}/password`)
    .send({ password: "New-Strong-Password!2026" })
    .expect(200);
  await clients.outsider.get("/api/auth/me").expect(401);
  const fresh = request.agent(app);
  await change(fresh, "post", "/api/auth/login")
    .send({ email: outsider.email, password: "New-Strong-Password!2026" })
    .expect(200);
  await change(clients.admin, "patch", `/api/users/${outsider._id}`)
    .send({
      name: outsider.name,
      email: outsider.email,
      active: false,
      managerId: String(otherManager._id),
    })
    .expect(200);
  await fresh.get("/api/auth/me").expect(401);
});
test("concurrent decisions commit exactly once", async () => {
  const e = (await createExpense(clients.employee)).body.expense;
  const responses = await Promise.all(
    ["Approved", "Rejected"].map((status) =>
      change(
        clients.otherManager,
        "patch",
        `/api/expenses/${e._id}/review`,
      ).send({ status, reason: "Concurrent decision test.", revision: 0 }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await Expense.findById(e._id)).history.length, 2);
});
