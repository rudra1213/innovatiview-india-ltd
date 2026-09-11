import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { config } from "../config/env.js";
import { check, HttpError } from "../utils/http.js";
export const COOKIE = "iv_session";
export const cookieOptions = () => ({
  httpOnly: true,
  secure: config().production,
  sameSite: "strict",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
});
export async function authenticate(req, res, next) {
  const token = req.cookies[COOKIE];
  check(token, 401, "Please sign in to continue.");
  let payload;
  try {
    payload = jwt.verify(token, config().jwtSecret, {
      algorithms: ["HS256"],
      issuer: "innovatiview",
      audience: "expense-app",
    });
  } catch {
    throw new HttpError(401, "Your session expired. Please sign in again.");
  }
  const [user, session] = await Promise.all([
    User.findById(payload.sub).select("+tokenVersion"),
    Session.findById(payload.jti),
  ]);
  check(
    user?.active &&
      session &&
      session.expiresAt > new Date() &&
      String(session.userId) === String(user._id) &&
      user.tokenVersion === payload.version,
    401,
    "Your session expired. Please sign in again.",
  );
  req.user = user;
  req.sessionId = payload.jti;
  next();
}
export const allow =
  (...roles) =>
  (req, res, next) => {
    check(
      roles.includes(req.user.role),
      403,
      "You do not have permission for this action.",
    );
    next();
  };
export function protectOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const cfg = config();
  const allowed = new Set([new URL(cfg.appUrl).origin]);
  if (!cfg.production) {
    allowed.add("http://localhost:5173");
    allowed.add("http://127.0.0.1:5173");
  }
  check(
    origin && allowed.has(origin),
    403,
    "Request origin is not allowed. Check APP_URL.",
  );
  next();
}
// Queries are always scoped on the server. Client IDs never grant access.
export const expenseScope = (user) => ({
  deletedAt: null,
  ...(user.role === "Employee"
    ? { employeeId: user._id }
    : user.role === "Manager"
      ? { managerId: user._id }
      : {}),
});
