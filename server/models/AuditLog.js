import mongoose from "mongoose";
import { Schema } from "./shared.js";

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  action: String,
  resourceType: String,
  resourceId: String,
  metadata: Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
