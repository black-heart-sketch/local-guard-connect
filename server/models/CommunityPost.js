import mongoose from "mongoose";
import { Schema, jurisdictionSchema, modelOptions } from "./shared.js";

const commentSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  moderationStatus: { type: String, enum: ["visible", "flagged", "removed"], default: "visible" },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const communityPostSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "Community update" },
  content: { type: String, required: true },
  category: String,
  jurisdiction: jurisdictionSchema,
  verificationStatus: { type: String, enum: ["unconfirmed", "verified", "resolved", "false"], default: "unconfirmed" },
  moderationStatus: { type: String, enum: ["visible", "flagged", "removed"], default: "visible" },
  comments: [commentSchema],
  reportsCount: { type: Number, default: 0 },
}, modelOptions);

export const CommunityPost = mongoose.models.CommunityPost || mongoose.model("CommunityPost", communityPostSchema);
