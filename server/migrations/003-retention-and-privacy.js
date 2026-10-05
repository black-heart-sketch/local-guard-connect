import { Emergency } from "../models/Emergency.js";
import { Report } from "../models/Report.js";

export const id = "003-retention-and-privacy";
export async function up() {
  const evidenceDays = Number(process.env.EVIDENCE_RETENTION_DAYS || 365);
  const emergencyDays = Number(process.env.EMERGENCY_RETENTION_DAYS || 90);
  await Promise.all([
    Report.collection.updateMany({ retentionUntil: { $exists: false } }, [{ $set: { legalHold: false, retentionUntil: { $dateAdd: { startDate: "$createdAt", unit: "day", amount: evidenceDays } } } }]),
    Emergency.collection.updateMany({ retentionUntil: { $exists: false } }, [{ $set: { legalHold: false, retentionUntil: { $dateAdd: { startDate: "$createdAt", unit: "day", amount: emergencyDays } } } }]),
  ]);
}
