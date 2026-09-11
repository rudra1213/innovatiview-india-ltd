import app from "./app.js";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";
await connectDB();
const port = process.env.PORT || 5000;
const server = app.listen(port, () =>
  console.log(`Innovatiview API ready on http://localhost:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
