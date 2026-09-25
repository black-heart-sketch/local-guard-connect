import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "../config.js";
import { Emergency } from "../models/Emergency.js";
import { Report } from "../models/Report.js";

await mongoose.connect(config.mongoUri);
const expired = { legalHold: { $ne: true }, retentionUntil: { $lte: new Date() } };
for (const report of await Report.find({ ...expired, status: { $in: ["resolved", "rejected"] } })) {
  for (const attachment of report.attachments) fs.rmSync(path.join(config.uploadDir, "evidence", attachment.storedName), { force: true });
  report.attachments = [];
  await report.save();
}
for (const emergency of await Emergency.find({ ...expired, status: { $in: ["completed", "failed", "cancelled"] } })) {
  for (const chunk of emergency.chunks) fs.rmSync(path.join(config.uploadDir, "emergency", chunk.storedName), { force: true });
  emergency.chunks = [];
  await emergency.save();
}
await mongoose.disconnect();
