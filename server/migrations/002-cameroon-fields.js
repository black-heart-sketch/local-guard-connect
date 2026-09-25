import { Report, User } from "../models/index.js";

export const id = "002-cameroon-fields";
export async function up() {
  await User.updateMany({ locale: { $exists: false } }, { $set: { locale: "fr", verified: false, active: true } });
  await Report.updateMany({ status: "pending" }, { $set: { status: "received" } });
}
