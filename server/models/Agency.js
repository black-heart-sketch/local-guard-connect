import mongoose from "mongoose";
import { Schema, jurisdictionSchema, modelOptions } from "./shared.js";

const agencySchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["police", "gendarmerie", "fire", "medical", "ngo", "council", "community"] },
  verified: { type: Boolean, default: false },
  phones: [String],
  jurisdiction: jurisdictionSchema,
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, modelOptions);

export const Agency = mongoose.models.Agency || mongoose.model("Agency", agencySchema);
