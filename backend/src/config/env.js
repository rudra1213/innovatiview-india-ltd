import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
export function config() {
  const {
    MONGODB_URI,
    JWT_SECRET,
    NODE_ENV = "development",
    APP_URL,
  } = process.env;
  if (!MONGODB_URI)
    throw new Error("MONGODB_URI is required. See backend/.env.example.");
  if (
    !JWT_SECRET ||
    JWT_SECRET.length < 32 ||
    JWT_SECRET.startsWith("replace-")
  )
    throw new Error("Set a unique JWT_SECRET of at least 32 characters.");
  const production = NODE_ENV === "production";
  if (production && (!APP_URL || !APP_URL.startsWith("https://")))
    throw new Error(
      "APP_URL must be your HTTPS application origin in production.",
    );
  return {
    mongoUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
    production,
    appUrl: APP_URL || "http://localhost:5173",
  };
}
