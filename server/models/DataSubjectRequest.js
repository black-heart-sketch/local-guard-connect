import mongoose from "mongoose";
import { Schema, modelOptions } from "./shared.js";

const dataSubjectRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["access", "export", "correction", "deletion", "objection"], required: true },
  details: String,
  status: { type: String, enum: ["submitted", "in_review", "completed", "rejected"], default: "submitted" },
  handledBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolution: String,
  completedAt: Date,
}, modelOptions);

export const DataSubjectRequest = mongoose.models.DataSubjectRequest || mongoose.model("DataSubjectRequest", dataSubjectRequestSchema);
