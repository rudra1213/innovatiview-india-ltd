import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import User from "../models/User.js";
import Session from "../models/Session.js";
import LoginAttempt from "../models/LoginAttempt.js";
import { config } from "../config/env.js";
import { authenticate, COOKIE, cookieOptions } from "../middleware/auth.js";
import { loginSchema, password } from "../utils/validation.js";
import { check, safeUser } from "../utils/http.js";
const router = Router();
// Constant valid hash ensures unknown accounts still perform a bcrypt comparison.
const dummyHash = await bcrypt.hash(randomUUID(), 12);
router.post("/login", async (req, res) => {
  const input = loginSchema.parse(req.body);
  const window = Math.floor(Date.now() / 900000);
  const ip = req.ip || "unknown";
  for (const [identity, maximum] of [
    [`ip:${ip}`, 60],
    [`account:${input.email}`, 15],
  ]) {
    const key = createHash("sha256")
      .update(`${window}:${identity}`)
      .digest("hex");
    const attempt = await LoginAttempt.findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((window + 1) * 900000) },
      },
      { upsert: true, new: true },
    );
    if (attempt.count > maximum) {
      res.set(
        "Retry-After",
        String(Math.ceil(((window + 1) * 900000 - Date.now()) / 1000)),
      );
      return res
        .status(429)
        .json({ message: "Too many login attempts. Try again in 15 minutes." });
    }
  }
  const user = await User.findOne({ email: input.email }).select(
    "+password +tokenVersion",
  );
  const valid = await bcrypt.compare(
    input.password,
    user?.password || dummyHash,
  );
  check(valid && user?.active, 401, "Incorrect email or password.");
  const id = randomUUID();
  await Session.create({
    _id: id,
    userId: user._id,
    expiresAt: new Date(Date.now() + 8 * 3600000),
  });
  const token = jwt.sign({ version: user.tokenVersion }, config().jwtSecret, {
    algorithm: "HS256",
    subject: String(user._id),
    jwtid: id,
    issuer: "innovatiview",
    audience: "expense-app",
    expiresIn: "8h",
  });
  res.cookie(COOKIE, token, cookieOptions()).json({ user: safeUser(user) });
});
router.get("/me", authenticate, async (req, res) => {
  await req.user.populate("managerId", "name email active");
  res.json({ user: safeUser(req.user) });
});
router.post("/logout", authenticate, async (req, res) => {
  await Session.deleteOne({ _id: req.sessionId });
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE, options).json({ message: "Signed out." });
});
router.patch("/password", authenticate, async (req, res) => {
  const input = z
    .object({
      currentPassword: z.string().min(1).max(200),
      newPassword: password,
    })
    .parse(req.body);
  const current = await User.findById(req.user._id).select("+password");
  check(
    await bcrypt.compare(input.currentPassword, current.password),
    400,
    "Current password is incorrect.",
  );
  check(
    input.currentPassword !== input.newPassword,
    400,
    "Choose a different password.",
  );
  await User.updateOne(
    { _id: req.user._id },
    {
      $set: { password: await bcrypt.hash(input.newPassword, 12) },
      $inc: { tokenVersion: 1 },
    },
  );
  const { maxAge, ...options } = cookieOptions();
  res
    .clearCookie(COOKIE, options)
    .json({ message: "Password changed. Sign in with your new password." });
});
export default router;
