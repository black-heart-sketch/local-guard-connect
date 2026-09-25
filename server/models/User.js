import mongoose from "mongoose";
import { Schema, jurisdictionSchema, modelOptions } from "./shared.js";

const userSchema = new Schema({
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  phone: { type: String, trim: true, sparse: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  fullName: { type: String, trim: true },
  avatarUrl: String,
  role: { type: String, enum: ["citizen", "dispatcher", "police", "gendarmerie", "fire", "medical", "ngo", "council", "admin"], default: "citizen" },
  locale: { type: String, enum: ["en", "fr"], default: "fr" },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  jurisdiction: jurisdictionSchema,
  trustedContacts: [{ name: String, phone: String, relationship: String, enabled: { type: Boolean, default: true } }],
  consent: { privacyVersion: String, acceptedAt: Date },
}, modelOptions);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
