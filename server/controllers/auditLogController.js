import { AuditLog } from "../models/AuditLog.js";
export async function listAuditLogs(req, res, next) { try { const query = req.query.resourceType ? { resourceType: req.query.resourceType } : {}; res.json(await AuditLog.find(query).populate("actor", "fullName role").sort({ createdAt: -1 }).limit(500)); } catch (error) { next(error); } }
