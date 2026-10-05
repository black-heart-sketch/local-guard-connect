import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { Agency, CommunityPost, Notification, Report, User } from "../models/index.js";
import { config } from "../config.js";

const consent = { privacyVersion: "2026-09", acceptedAt: new Date() };

const accounts = [
  { email: "citizen@crimex.cm", fullName: "Amina Njoya", role: "citizen", phone: "+237699100001", locale: "fr", verified: true, jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé", quarter: "Melen" } },
  { email: "dispatcher@crimex.cm", fullName: "Centre Dispatcher", role: "dispatcher", phone: "+237699100002", locale: "fr", verified: true, jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé" } },
  { email: "police@crimex.cm", fullName: "Police Demo Officer", role: "police", phone: "+237699100003", locale: "fr", verified: true, jurisdiction: { region: "Littoral", division: "Wouri", town: "Douala" } },
  { email: "admin@crimex.cm", fullName: "CrimeX Administrator", role: "admin", phone: "+237699100004", locale: "en", verified: true, jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé" } },
];

async function upsertUser(account, passwordHash) {
  return User.findOneAndUpdate(
    { email: account.email },
    { $set: { ...account, passwordHash, active: true, consent } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
}

export async function seedDatabase({ mongoUri = config.mongoUri, seedPassword = process.env.SEED_PASSWORD || "Cameroon@2026" } = {}) {
  if (config.nodeEnv === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Production seeding is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional demo environment.");
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const users = {};
  for (const account of accounts) users[account.role] = await upsertUser(account, passwordHash);

  const policeAgency = await Agency.findOneAndUpdate(
    { name: "Police Secours — Douala" },
    { $set: { type: "police", verified: true, phones: ["117"], jurisdiction: { region: "Littoral", division: "Wouri", town: "Douala" }, members: [users.police._id] } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  await Agency.findOneAndUpdate(
    { name: "Centre d'écoute VBG — Yaoundé" },
    { $set: { type: "ngo", verified: true, phones: ["+237699200001"], jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé" } } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );

  const reportSeeds = [
    { reference: "CMR-DEMO-0001", category: "theft", severity: "medium", description: "Motorcycle theft reported near Marché Central.", addressText: "Marché Central, Douala", jurisdiction: { region: "Littoral", division: "Wouri", town: "Douala", quarter: "Akwa", landmark: "Marché Central" }, location: { type: "Point", coordinates: [9.7043, 4.0511] }, reporter: users.citizen._id, status: "assigned", assignedAgency: policeAgency._id, assignedTo: users.police._id, moderationStatus: "pending", publicVisibility: false, timeline: [{ status: "received", note: "Demo report received", actor: users.citizen._id }, { status: "triaged", note: "Location and category reviewed", actor: users.dispatcher._id }, { status: "assigned", note: "Assigned to verified agency", actor: users.dispatcher._id }] },
    { reference: "CMR-DEMO-0002", category: "road_safety", severity: "low", description: "Resolved road obstruction previously reported near Carrefour Warda.", addressText: "Carrefour Warda, Yaoundé", jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé", quarter: "Warda", landmark: "Carrefour Warda" }, location: { type: "Point", coordinates: [11.508, 3.879] }, reporter: users.citizen._id, status: "resolved", moderationStatus: "verified", publicVisibility: true, publicAfter: new Date(Date.now() - 86400000), timeline: [{ status: "received", note: "Demo report received" }, { status: "resolved", note: "Obstruction cleared" }] },
  ];
  for (const report of reportSeeds) await Report.findOneAndUpdate({ reference: report.reference }, { $set: report }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });

  await CommunityPost.findOneAndUpdate(
    { title: "Conseils de sécurité pour les déplacements du soir" },
    { $set: { author: users.citizen._id, title: "Conseils de sécurité pour les déplacements du soir", content: "Privilégiez les axes éclairés, partagez votre trajet avec un proche et utilisez des points de repère connus.", category: "prevention", jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaoundé" }, verificationStatus: "verified", moderationStatus: "visible" } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  await Notification.findOneAndUpdate(
    { "title.en": "Welcome to the CrimeX demo" },
    { $set: { title: { en: "Welcome to the CrimeX demo", fr: "Bienvenue dans la démo CrimeX" }, message: { en: "Use the seeded cases to test triage and case tracking.", fr: "Utilisez les dossiers de démonstration pour tester le triage et le suivi." }, type: "general", sender: users.admin._id, actionUrl: "/dashboard" } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );

  console.log(`Seed complete: ${accounts.length} users, 2 agencies, ${reportSeeds.length} reports, 1 community post, 1 notification.`);
  console.log(`Quick login password: ${seedPassword}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await seedDatabase(); } finally { await mongoose.disconnect(); }
}
