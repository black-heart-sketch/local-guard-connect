import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "../config.js";
import { Report } from "../models/Report.js";
import { Notification } from "../models/Notification.js";
import { Agency } from "../models/Agency.js";
import { operationalRoles } from "../middleware/auth.js";
import { audit, coordinatesFrom, fileKind, hash, recoveryCode, reference, serializeLocation } from "../lib/utils.js";
import { sendPushToUsers } from "../services/pushService.js";

export function serializeReport(doc, privileged = false) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  const attachments = privileged ? (r.attachments || []).map(item => ({ ...item, name: item.originalName, type: item.mimeType, url: `/api/reports/${r.id}/evidence/${item.id}` })) : [];
  return { ...r, crime_type: r.category, location: r.addressText, coordinates: serializeLocation(r.location, !privileged), is_anonymous: r.isAnonymous, user_id: privileged ? r.reporter : null, user_email: null, created_at: r.createdAt, updated_at: r.updatedAt, attachments };
}

export async function createReport(req, res, next) {
  try {
    const body = req.body;
    if (!body.category || !body.description || !body.addressText) return res.status(400).json({ error: "Category, description and location are required" });
    const isAnonymous = body.isAnonymous === true || body.isAnonymous === "true";
    const requestedSecret = String(body.recoveryCode || "");
    if (isAnonymous && requestedSecret && !/^[A-Za-z0-9_-]{10,64}$/.test(requestedSecret)) return res.status(400).json({ error: "Invalid recovery code" });
    const secret = isAnonymous ? (requestedSecret || recoveryCode()) : null;
    const attachments = (req.files || []).map(file => ({ originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size, sha256: hash(fs.readFileSync(file.path)), kind: fileKind(file.mimetype) }));
    const report = await Report.create({
      reference: reference("CMR"), category: body.category, severity: body.severity || "medium", description: body.description,
      addressText: body.addressText, jurisdiction: body.jurisdiction ? JSON.parse(body.jurisdiction) : undefined,
      location: coordinatesFrom(body), isAnonymous, sensitive: body.sensitive === true || body.sensitive === "true",
      reporter: isAnonymous ? null : req.user?._id, recoveryHash: secret ? hash(secret) : undefined,
      contactPreference: body.contactPreference || "app", safeContactTime: body.safeContactTime, attachments,
      clientSubmissionId: body.clientSubmissionId || undefined,
      retentionUntil: new Date(Date.now() + Number(process.env.EVIDENCE_RETENTION_DAYS || 365) * 86400000),
      timeline: [{ status: "received", note: "Report received", actor: req.user?._id }],
    });
    await Notification.create({ title: { en: "New incident report", fr: "Nouveau signalement" }, message: { en: `${report.category} reported in ${report.addressText}`, fr: `${report.category} signalé à ${report.addressText}` }, type: "jurisdiction", jurisdiction: report.jurisdiction, sender: req.user?._id, actionUrl: `/dashboard?report=${report.id}` });
    await audit(req, "report.create", "Report", report.id, { anonymous: isAnonymous, category: report.category });
    res.status(201).json({ report: serializeReport(report, true), recoveryCode: secret });
  } catch (error) {
    if (error?.code === 11000 && req.body.clientSubmissionId) return res.status(409).json({ error: "This offline report was already submitted" });
    next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const privileged = req.user && operationalRoles.includes(req.user.role);
    const publicFilter = { publicVisibility: true, status: "resolved", sensitive: false, publicAfter: { $lte: new Date() } };
    const filter = privileged ? {} : req.user ? { $or: [{ reporter: req.user._id }, publicFilter] } : publicFilter;
    if (req.query.status && privileged) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 200, 500));
    res.json(reports.map(report => serializeReport(report, Boolean(privileged || String(report.reporter) === req.user?.id))));
  } catch (error) { next(error); }
}

export async function getReport(req, res, next) {
  try {
    const identifier = req.params.id || req.params.reference;
    const query = mongoose.isValidObjectId(identifier) ? { $or: [{ _id: identifier }, { reference: identifier.toUpperCase() }] } : { reference: identifier.toUpperCase() };
    const report = await Report.findOne(query).select("+recoveryHash");
    if (!report) return res.status(404).json({ error: "Report not found" });
    const recovery = req.headers["x-recovery-code"];
    const privileged = req.user && (operationalRoles.includes(req.user.role) || String(report.reporter) === req.user.id);
    const recovered = recovery && hash(String(recovery)) === report.recoveryHash;
    if (!privileged && !recovered && !(report.publicVisibility && report.status === "resolved" && !report.sensitive)) return res.status(403).json({ error: "Access denied" });
    res.json(serializeReport(report, Boolean(privileged || recovered)));
  } catch (error) { next(error); }
}

export async function updateReportStatus(req, res, next) {
  try {
    const allowed = ["received", "triaged", "assigned", "dispatched", "action_taken", "resolved", "rejected"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
    const report = await Report.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status, publicVisibility: req.body.publicVisibility ?? undefined, publicAfter: req.body.publicVisibility ? new Date(Date.now() + 3600000) : undefined }, $push: { timeline: { status: req.body.status, note: req.body.note, actor: req.user._id } } }, { returnDocument: "after" });
    if (!report) return res.status(404).json({ error: "Report not found" });
    await audit(req, "report.status", "Report", report.id, { status: req.body.status });
    res.json(serializeReport(report, true));
  } catch (error) { next(error); }
}

export async function assignReport(req, res, next) {
  try {
    if (req.body.agencyId && !(await Agency.exists({ _id: req.body.agencyId, verified: true }))) return res.status(400).json({ error: "A verified agency is required" });
    const report = await Report.findByIdAndUpdate(req.params.id, {
      $set: { assignedAgency: req.body.agencyId || undefined, assignedTo: req.body.userId || undefined, status: "assigned" },
      $push: { timeline: { status: "assigned", note: req.body.note || "Assigned to responder", actor: req.user._id } },
    }, { returnDocument: "after", runValidators: true });
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (req.body.userId) {
      await Notification.create({ title: { en: "Case assigned", fr: "Dossier assigné" }, message: { en: `${report.reference} was assigned to you`, fr: `${report.reference} vous a été assigné` }, type: "targeted", targetUser: req.body.userId, sender: req.user._id, actionUrl: `/dashboard?report=${report.id}` });
      void sendPushToUsers([req.body.userId], { title: "Case assigned", body: report.reference, url: `/dashboard?report=${report.id}` });
    }
    await audit(req, "report.assign", "Report", report.id, { agencyId: req.body.agencyId, userId: req.body.userId });
    res.json(serializeReport(report, true));
  } catch (error) { next(error); }
}

export async function reportAnalytics(req, res, next) {
  try {
    const match = req.user.role === "admin" ? {} : req.user.jurisdiction?.region ? { "jurisdiction.region": req.user.jurisdiction.region } : {};
    const [byStatus, byCategory, byRegion] = await Promise.all([
      Report.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $match: match }, { $group: { _id: "$jurisdiction.region", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);
    res.json({ byStatus, byCategory, byRegion, generatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
}

export async function readEvidence(req, res, next) {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report || !(operationalRoles.includes(req.user.role) || String(report.reporter) === req.user.id)) return res.status(403).json({ error: "Access denied" });
    const attachment = report.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ error: "File not found" });
    await audit(req, "evidence.read", "Report", report.id, { attachmentId: attachment.id });
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
    res.sendFile(path.resolve(config.uploadDir, "evidence", attachment.storedName));
  } catch (error) { next(error); }
}
