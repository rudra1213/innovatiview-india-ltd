import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["Employee", "Manager", "Admin"],
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);
userSchema.index({ role: 1, active: 1, managerId: 1 });
export default mongoose.models.User || mongoose.model("User", userSchema);
