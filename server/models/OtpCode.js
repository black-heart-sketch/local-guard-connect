import mongoose from "mongoose";
import { Schema } from "./shared.js";

const otpCodeSchema = new Schema({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
  consumedAt: Date,
}, { timestamps: true });

export const OtpCode = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);
