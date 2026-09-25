import mongoose from "mongoose";
import { Schema, modelOptions } from "./shared.js";

const channelEventSchema = new Schema({
  channel: { type: String, enum: ["sms", "ussd", "whatsapp"], required: true, index: true },
  externalId: { type: String, sparse: true, unique: true },
  phone: { type: String, required: true },
  input: String,
  response: String,
  status: { type: String, enum: ["received", "processed", "rejected", "failed"], default: "received" },
  report: { type: Schema.Types.ObjectId, ref: "Report" },
  metadata: Schema.Types.Mixed,
}, modelOptions);

export const ChannelEvent = mongoose.models.ChannelEvent || mongoose.model("ChannelEvent", channelEventSchema);
