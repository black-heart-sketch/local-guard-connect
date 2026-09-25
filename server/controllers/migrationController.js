import { Migration } from "../models/Migration.js";
export async function listMigrations(_req, res, next) { try { res.json(await Migration.find().sort({ appliedAt: 1 })); } catch (error) { next(error); } }
