import mongoose from "mongoose";
import { Schema, modelOptions } from "./shared.js";

const pushSubscriptionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  expirationTime: Number,
  keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  userAgent: String,
}, modelOptions);

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
