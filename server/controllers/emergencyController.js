import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config, emergencyDirectory } from "../config.js";
import { Emergency } from "../models/Emergency.js";
import { Notification } from "../models/Notification.js";
import { operationalRoles } from "../middleware/auth.js";
import { audit, coordinatesFrom, hash, recoveryCode, reference, serializeLocation } from "../lib/utils.js";
import { sendSms } from "../services/smsService.js";

export async function createEmergency(req, res, next) {
  try {
    const sessionId = req.body.recordingSessionId || crypto.randomUUID();
    const secret = req.user ? null : recoveryCode();
    const emergency = await Emergency.create({ reference: reference("EMG"), user: req.user?._id, recoveryHash: secret ? hash(secret) : undefined, type: req.body.type || "general", location: coordinatesFrom(req.body), jurisdiction: req.body.jurisdiction || req.user?.jurisdiction, recordingSessionId: sessionId, retentionUntil: new Date(Date.now() + Number(process.env.EMERGENCY_RETENTION_DAYS || 90) * 86400000), events: [{ type: "queued", note: "Emergency received by dispatch queue", actor: req.user?._id }] });
    const contacts = req.user?.trustedContacts?.filter(contact => contact.enabled && contact.phone) || [];
    if (contacts.length) {
      const outcomes = await Promise.allSettled(contacts.map(contact => sendSms({ to: contact.phone, message: `CrimeX emergency ${emergency.reference}: ${req.user.fullName || 'Your contact'} activated an alert. Police 117, Gendarmerie 113, Fire 118, SAMU 119.` })));
      emergency.trustedContactsNotified = outcomes.some(outcome => outcome.status === "fulfilled" && outcome.value.delivered);
      emergency.events.push({ type: "trusted_contacts", note: `${contacts.length} trusted contact notification(s) attempted`, actor: req.user._id });
      await emergency.save();
    }
    await Notification.create({ title: { en: "Emergency queued", fr: "Urgence mise en file" }, message: { en: `${emergency.reference} needs acknowledgement`, fr: `${emergency.reference} attend un accusé de réception` }, type: "emergency", jurisdiction: emergency.jurisdiction, sender: req.user?._id, actionUrl: "/dashboard?tab=emergencies" });
    res.status(201).json({ emergency, recoveryCode: secret, directory: emergencyDirectory, authorityNotified: false, trustedContactsNotified: emergency.trustedContactsNotified, message: "Emergency saved. Call the displayed official number until a responder acknowledges in the app." });
  } catch (error) { next(error); }
}

export async function uploadChunk(req, res, next) {
  try {
    const emergency = await Emergency.findOne({ recordingSessionId: req.params.session }).select("+recoveryHash");
    if (!emergency) return res.status(404).json({ error: "Emergency session not found" });
    const owner = req.user && String(emergency.user) === req.user.id;
    const recovered = req.headers["x-recovery-code"] && hash(String(req.headers["x-recovery-code"])) === emergency.recoveryHash;
    if (!owner && !recovered) return res.status(403).json({ error: "Emergency recovery code required" });
    if (!req.file) return res.status(400).json({ error: "Recording chunk required" });
    emergency.chunks.push({ storedName: req.file.filename, size: req.file.size, index: Number(req.body.index) || emergency.chunks.length });
    await emergency.save();
    res.json({ received: true, chunkCount: emergency.chunks.length, sessionId: emergency.recordingSessionId });
  } catch (error) { next(error); }
}

export async function streamRecording(req, res, next) {
  let temporaryPath;
  try {
    const emergency = await Emergency.findOne({ recordingSessionId: req.params.session }).select("+recoveryHash");
    if (!emergency) return res.status(404).json({ error: "Emergency session not found" });
    const owner = req.user && String(emergency.user) === req.user.id;
    const recovered = req.headers["x-recovery-code"] && hash(String(req.headers["x-recovery-code"])) === emergency.recoveryHash;
    if (!owner && !recovered) return res.status(403).json({ error: "Emergency recovery code required" });
    if (emergency.recording?.storedName) return res.status(409).json({ error: "A recording already exists for this emergency" });

    const storedName = `${crypto.randomUUID()}.webm`;
    const finalPath = path.resolve(config.uploadDir, "emergency", storedName);
    temporaryPath = `${finalPath}.part`;
    const output = fs.createWriteStream(temporaryPath, { flags: "wx" });
    const maximumBytes = Number(process.env.MAX_EMERGENCY_STREAM_BYTES || 250 * 1024 * 1024);
    let size = 0;
    let rejected = false;
    emergency.recording = { storedName, mimeType: req.headers["content-type"] || "video/webm", size: 0, startedAt: new Date() };
    await emergency.save();

    req.on("data", data => {
      size += data.length;
      if (size > maximumBytes && !rejected) {
        rejected = true;
        req.unpipe(output);
        output.destroy();
        req.resume();
        fs.rmSync(temporaryPath, { force: true });
        emergency.recording = undefined;
        void emergency.save();
        if (!res.headersSent) res.status(413).json({ error: "Emergency recording exceeds the configured limit" });
      }
    });
    req.on("aborted", () => {
      if (rejected) return;
      rejected = true;
      output.destroy();
      fs.rmSync(temporaryPath, { force: true });
      emergency.recording = undefined;
      void emergency.save();
    });
    output.on("error", error => { if (!rejected) next(error); });
    output.on("finish", async () => {
      if (rejected) return;
      fs.renameSync(temporaryPath, finalPath);
      emergency.recording.size = size;
      emergency.recording.completedAt = new Date();
      emergency.events.push({ type: "recording_completed", note: `Private recording stream stored (${size} bytes)`, actor: req.user?._id });
      await emergency.save();
      res.json({ received: true, size, sessionId: emergency.recordingSessionId });
    });
    req.pipe(output);
  } catch (error) {
    if (temporaryPath) fs.rmSync(temporaryPath, { force: true });
    next(error);
  }
}

export async function updateEmergencyStatus(req, res, next) {
  try {
    const allowed = ["queued", "acknowledged", "dispatched", "completed", "failed", "cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid emergency status" });
    const update = { $set: { status: req.body.status }, $push: { events: { type: req.body.status, note: req.body.note, actor: req.user._id } } };
    if (req.body.status === "acknowledged") update.$set.acknowledgement = { responder: req.user._id, at: new Date(), note: req.body.note };
    const emergency = await Emergency.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });
    await audit(req, "emergency.status", "Emergency", emergency.id, { status: req.body.status });
    res.json(emergency);
  } catch (error) { next(error); }
}

export async function listEmergencies(req, res, next) {
  try {
    const filter = operationalRoles.includes(req.user.role) ? {} : { user: req.user._id };
    const rows = await Emergency.find(filter).populate("user", "fullName phone email").sort({ createdAt: -1 });
    res.json(rows.map(e => ({ ...e.toJSON(), user_id: e.user?.id || e.user, emergency_type: e.type, location_data: serializeLocation(e.location), video_path: e.recording?.storedName || e.chunks.length ? `/api/emergencies/${e.id}/recording` : null, recording_session_id: e.recordingSessionId, stream_size: e.recording?.size || 0, chunk_count: e.chunks.length, created_at: e.createdAt, updated_at: e.updatedAt })));
  } catch (error) { next(error); }
}

export async function deleteEmergency(req, res, next) {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });
    for (const chunk of emergency.chunks) fs.rmSync(path.join(config.uploadDir, "emergency", chunk.storedName), { force: true });
    if (emergency.recording?.storedName) fs.rmSync(path.join(config.uploadDir, "emergency", emergency.recording.storedName), { force: true });
    await emergency.deleteOne();
    await audit(req, "emergency.delete", "Emergency", req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function readRecording(req, res, next) {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency || (!operationalRoles.includes(req.user.role) && String(emergency.user) !== req.user.id)) return res.status(403).json({ error: "Access denied" });
    const chunk = req.params.chunkId ? emergency.chunks.id(req.params.chunkId) : emergency.chunks[0];
    const storedName = emergency.recording?.storedName || chunk?.storedName;
    if (!storedName) return res.status(404).json({ error: "Recording not found" });
    await audit(req, "emergency.recording.read", "Emergency", emergency.id);
    res.type(emergency.recording?.mimeType || "video/webm");
    res.sendFile(path.resolve(config.uploadDir, "emergency", storedName));
  } catch (error) { next(error); }
}
