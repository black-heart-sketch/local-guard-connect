import mongoose from "mongoose";
import { Schema, jurisdictionSchema, locationSchema, modelOptions } from "./shared.js";

const emergencyEventSchema = new Schema({
  type: String,
  note: String,
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  at: { type: Date, default: Date.now },
}, { _id: true });

const emergencySchema = new Schema({
  reference: { type: String, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  recoveryHash: { type: String, select: false },
  type: { type: String, enum: ["police", "gendarmerie", "fire", "medical", "gbv", "general", "panic_button"], default: "general" },
  status: { type: String, enum: ["queued", "acknowledged", "dispatched", "completed", "failed", "cancelled"], default: "queued", index: true },
  location: locationSchema,
  jurisdiction: jurisdictionSchema,
  recordingSessionId: { type: String, unique: true },
  recording: {
    storedName: String,
    mimeType: String,
    size: Number,
    startedAt: Date,
    completedAt: Date,
  },
  chunks: [{ storedName: String, size: Number, index: Number, createdAt: { type: Date, default: Date.now } }],
  trustedContactsNotified: { type: Boolean, default: false },
  authorityNotified: { type: Boolean, default: false },
  legalHold: { type: Boolean, default: false },
  retentionUntil: Date,
  acknowledgement: { responder: { type: Schema.Types.ObjectId, ref: "User" }, at: Date, note: String },
  events: [emergencyEventSchema],
}, modelOptions);

export const Emergency = mongoose.models.Emergency || mongoose.model("Emergency", emergencySchema);
