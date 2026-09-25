import mongoose from "mongoose";
import { Schema, modelOptions } from "./shared.js";

const paymentSchema = new Schema({
  reference: { type: String, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: String, enum: ["mtn", "orange"], required: true },
  phone: { type: String, required: true },
  amount: { type: Number, min: 100, required: true },
  currency: { type: String, enum: ["XAF"], default: "XAF" },
  purpose: { type: String, enum: ["donation", "organization_subscription"], required: true },
  status: { type: String, enum: ["pending", "success", "failed", "refunded", "cancelled"], default: "pending" },
  gateway: { type: String, enum: ["digipay"], default: "digipay" },
  externalReference: { type: String, index: true, sparse: true },
  customerEmail: String,
  baseAmount: Number,
  chargedAmount: Number,
  commissionAmount: Number,
  gatewayMessage: String,
  simulated: { type: Boolean, default: false },
}, modelOptions);

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
