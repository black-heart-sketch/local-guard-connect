import mongoose from "mongoose";
import { Emergency } from "../models/index.js";

export const id = "005-continuous-emergency-streams";

export async function up() {
  await mongoose.connection.collection("emergencies").updateMany(
    { chunks: { $exists: true } },
    { $unset: { chunks: "" } },
  );
  await Emergency.syncIndexes();
}
