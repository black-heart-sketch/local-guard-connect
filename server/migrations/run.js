import mongoose from "mongoose";
import { config } from "../config.js";
import { Migration } from "../models/index.js";
import * as first from "./001-initialize-indexes.js";
import * as second from "./002-cameroon-fields.js";
import * as third from "./003-retention-and-privacy.js";
import * as fourth from "./004-operational-domains.js";
import * as fifth from "./005-continuous-emergency-streams.js";

await mongoose.connect(config.mongoUri);
for (const migration of [first, second, third, fourth, fifth]) {
  if (await Migration.exists({ _id: migration.id })) continue;
  await migration.up();
  await Migration.create({ _id: migration.id });
  console.log(`Applied ${migration.id}`);
}
await mongoose.disconnect();
