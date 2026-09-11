import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export default mongoose.models.Session || mongoose.model("Session", schema);
