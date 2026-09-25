import mongoose from "mongoose";
import { Schema, jurisdictionSchema, locationSchema, modelOptions } from "./shared.js";

const attachmentSchema = new Schema({
  originalName: String, storedName: String, mimeType: String, size: Number, sha256: String,
  kind: { type: String, enum: ["image", "video", "audio", "document"], default: "document" },
}, { _id: true });

const timelineEventSchema = new Schema({
  status: String,
  note: String,
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  at: { type: Date, default: Date.now },
}, { _id: true });

const reportSchema = new Schema({
  reference: { type: String, unique: true, index: true },
  category: { type: String, required: true, index: true },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  description: { type: String, required: true },
  addressText: { type: String, required: true },
  jurisdiction: jurisdictionSchema,
  location: locationSchema,
  isAnonymous: { type: Boolean, default: false },
  sensitive: { type: Boolean, default: false },
  reporter: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  recoveryHash: { type: String, select: false },
  contactPreference: { type: String, enum: ["app", "sms", "call", "none"], default: "app" },
  safeContactTime: String,
  status: { type: String, enum: ["received", "triaged", "assigned", "dispatched", "action_taken", "resolved", "rejected"], default: "received", index: true },
  assignedAgency: { type: Schema.Types.ObjectId, ref: "Agency" },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  attachments: [attachmentSchema],
  timeline: [timelineEventSchema],
  publicVisibility: { type: Boolean, default: false },
  publicAfter: Date,
  moderationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  clientSubmissionId: { type: String, sparse: true, unique: true },
  legalHold: { type: Boolean, default: false },
  retentionUntil: Date,
}, modelOptions);
reportSchema.index({ location: "2dsphere" }, { sparse: true });

export const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
