import mongoose from "mongoose";
import { config } from "./env.js";
mongoose.set("sanitizeFilter", true);
let connectionPromise;
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(config().mongoUri, {
        maxPoolSize: 5,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10000,
        maxIdleTimeMS: 60000,
        autoIndex: false,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  await connectionPromise;
  return mongoose.connection;
}
