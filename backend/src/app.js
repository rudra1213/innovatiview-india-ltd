import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import multer from "multer";
import { ZodError } from "zod";
import { connectDB } from "./config/db.js";
import { protectOrigin } from "./middleware/auth.js";
import auth from "./routes/auth.js";
import expenses from "./routes/expenses.js";
import users from "./routes/users.js";
import dashboard from "./routes/dashboard.js";
const app = express();
app.disable("x-powered-by");
// Vercel terminates the trusted proxy; local Express uses the direct socket IP.
if (process.env.VERCEL) app.set("trust proxy", 1);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.get("/api/health", async (req, res) => {
  await connectDB();
  res.json({ status: "ok", application: "Innovatiview India Ltd." });
});
app.use("/api", protectOrigin, async (req, res, next) => {
  await connectDB();
  next();
});
app.use("/api/auth", auth);
app.use("/api/expenses", expenses);
app.use("/api/users", users);
app.use("/api/dashboard", dashboard);
app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError)
    return res
      .status(400)
      .json({
        message: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
  if (error instanceof multer.MulterError)
    return res
      .status(400)
      .json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Receipt must be 3 MB or smaller."
            : "Invalid upload. Attach one receipt and the required fields.",
      });
  if (error.code === 11000)
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.type === "entity.parse.failed"
  )
    return res.status(400).json({ message: "Invalid request data." });
  if (error.type === "entity.too.large")
    return res.status(413).json({ message: "Request is too large." });
  const unavailable = [
    "MongoServerSelectionError",
    "MongooseServerSelectionError",
    "MongoNetworkError",
  ].includes(error.name);
  const status = error.status || (unavailable ? 503 : 500);
  if (status >= 500) console.error("API error:", error.name); // Do not log credentials, bodies, or database URIs.
  res
    .status(status)
    .json({
      message:
        status < 500
          ? error.message
          : unavailable
            ? "Database unavailable. Please try again shortly."
            : "Server configuration or service error. Contact your administrator.",
    });
});
export default app;
