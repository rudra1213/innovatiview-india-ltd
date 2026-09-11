import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { config } from "../src/config/env.js";
import User from "../src/models/User.js";
import Expense from "../src/models/Expense.js";
import Session from "../src/models/Session.js";
import LoginAttempt from "../src/models/LoginAttempt.js";
import { email, password } from "../src/utils/validation.js";
const demo = process.argv.includes("--demo");
try {
  config();
  if (demo && process.env.NODE_ENV === "production")
    throw new Error("Demo seeding is disabled when NODE_ENV=production.");
  const adminEmail = email.parse(process.env.SEED_ADMIN_EMAIL);
  const adminPassword = password.parse(process.env.SEED_ADMIN_PASSWORD);
  if (adminPassword.startsWith("replace-"))
    throw new Error("Set SEED_ADMIN_PASSWORD to a unique password first.");
  await connectDB();
  await Promise.all([
    User.createIndexes(),
    Expense.createIndexes(),
    Session.createIndexes(),
    LoginAttempt.createIndexes(),
  ]);
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    if (await User.exists({ role: "Admin" }))
      throw new Error(
        "An administrator already exists. Use the existing account; seed will not silently create another.",
      );
    admin = await User.create({
      name: process.env.SEED_ADMIN_NAME || "Company Administrator",
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 12),
      role: "Admin",
    });
    console.log(`Administrator created: ${adminEmail}`);
  } else if (admin.role !== "Admin")
    throw new Error("SEED_ADMIN_EMAIL belongs to a non-admin account.");
  else
    console.log(
      "Existing administrator preserved. Password was not overwritten.",
    );
  if (demo) {
    const demoPassword = password.parse(
      process.env.DEMO_PASSWORD || "Demo-Only-ChangeMe!2026",
    );
    const hash = await bcrypt.hash(demoPassword, 12);
    const ensure = async (data) => {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        if (existing.role !== data.role)
          throw new Error(
            `Demo email conflicts with another role: ${data.email}`,
          );
        return existing;
      }
      return User.create({ ...data, password: hash });
    };
    const manager = await ensure({
      name: "Priya Sharma",
      email: "manager@example.com",
      role: "Manager",
    });
    const employee = await ensure({
      name: "Arjun Mehta",
      email: "employee@example.com",
      role: "Employee",
      managerId: manager._id,
    });
    const other = await ensure({
      name: "Kavya Rao",
      email: "kavya@example.com",
      role: "Employee",
      managerId: manager._id,
    });
    // An explicit sample receipt: valid PDF containing DEMO ONLY, no real financial record.
    const stream =
      "BT /F1 22 Tf 45 150 Td (DEMO RECEIPT - NOT A REAL BILL) Tj ET";
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 540 220] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj, i) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n ")
      .join(
        "\n",
      )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = Buffer.from(pdf);
    const samples = [
      ["Client visit — Delhi", "Travel", 245000, "Pending", employee],
      ["Project stay — Jaipur", "Accommodation", 680000, "Approved", employee],
      ["Team working lunch", "Food & Meals", 185000, "Approved", other],
      ["Site visit cab fare", "Travel", 85000, "Rejected", employee],
      ["Presentation materials", "Office Supplies", 125000, "Pending", other],
      ["Client meeting lunch", "Food & Meals", 220000, "Pending", employee],
    ];
    for (let i = 0; i < samples.length; i++) {
      const [title, category, amount, status, person] = samples[i];
      if (await Expense.exists({ title, employeeId: person._id })) continue;
      const at = new Date(Date.now() - (i + 1) * 86400000);
      const date = at.toISOString().slice(0, 10);
      const reason =
        status === "Rejected"
          ? "Please provide a legible, itemized receipt for the journey."
          : "";
      const paid = i === 2;
      await Expense.create({
        title,
        category,
        amount,
        status,
        date,
        employeeId: person._id,
        managerId: manager._id,
        description:
          "Demonstration business expense. Replace sample data with actual company records.",
        receipt: {
          filename: "demo-receipt.pdf",
          mimeType: "application/pdf",
          size: bytes.length,
          data: bytes,
        },
        rejectionReason: reason,
        reviewedBy: status === "Pending" ? null : manager._id,
        reviewedAt: status === "Pending" ? null : at,
        paymentStatus:
          status === "Approved"
            ? paid
              ? "Paid"
              : "Pending Payment"
            : "Not Applicable",
        paidBy: paid ? admin._id : null,
        paidAt: paid ? at : null,
        paymentReference: paid ? "DEMO-TRANSFER-001" : "",
        history: [
          {
            action: "Submitted",
            actorId: person._id,
            actorName: person.name,
            at,
          },
          ...(status === "Pending"
            ? []
            : [
                {
                  action: status,
                  actorId: manager._id,
                  actorName: manager.name,
                  at,
                  note: reason,
                },
              ]),
          ...(paid
            ? [
                {
                  action: "Paid",
                  actorId: admin._id,
                  actorName: admin.name,
                  at,
                  note: "DEMO-TRANSFER-001",
                },
              ]
            : []),
        ],
      });
    }
    console.log(
      "Demo accounts: manager@example.com, employee@example.com, kavya@example.com",
    );
    console.log(
      "Use DEMO_PASSWORD from your local environment. Sample requests added without deleting existing data.",
    );
  }
  console.log("Seed complete. No passwords printed.");
} catch (error) {
  console.error(
    "Seed failed:",
    error.name === "ZodError"
      ? "Check required seed email and passwords in backend/.env."
      : error.message.replace(
          /mongodb(?:\+srv)?:\/\/[^\s]+/g,
          "[database URI redacted]",
        ),
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
