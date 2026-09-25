import mongoose from "mongoose";
import { Schema, jurisdictionSchema, modelOptions } from "./shared.js";

const notificationSchema = new Schema({
  title: { en: String, fr: String },
  message: { en: String, fr: String },
  type: { type: String, enum: ["general", "registered", "targeted", "jurisdiction", "emergency"], default: "general" },
  targetUser: { type: Schema.Types.ObjectId, ref: "User" },
  jurisdiction: jurisdictionSchema,
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  actionUrl: String,
  expiresAt: Date,
}, modelOptions);

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
