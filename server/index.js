import mongoose from "mongoose";
import { createApp } from "./app.js";
import { config } from "./config.js";

await mongoose.connect(config.mongoUri);
const server = createApp().listen(config.port, () => console.log(`CrimeX API listening on http://localhost:${config.port}`));

async function shutdown() {
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
