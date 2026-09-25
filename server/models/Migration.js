import mongoose from "mongoose";
import { Schema } from "./shared.js";

const migrationSchema = new Schema({ _id: String, appliedAt: { type: Date, default: Date.now } });
export const Migration = mongoose.models.Migration || mongoose.model("Migration", migrationSchema);
