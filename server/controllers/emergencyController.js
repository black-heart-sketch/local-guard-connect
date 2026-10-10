import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { config, emergencyDirectory } from "../config.js";
import { Emergency } from "../models/Emergency.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { operationalRoles } from "../middleware/auth.js";
import { audit, coordinatesFrom, hash, recoveryCode, reference, serializeLocation } from "../lib/utils.js";
import { sendSms } from "../services/smsService.js";

function recordingExtension(mimeType = "") {
  return String(mimeType).toLowerCase().includes("mp4") ? "mp4" : "webm";
}

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

export async function streamRecording(req, res, next) {
  let temporaryPath;
  try {
    const emergency = await Emergency.findOne({ recordingSessionId: req.params.session }).select("+recoveryHash");
    if (!emergency) return res.status(404).json({ error: "Emergency session not found" });
    const owner = req.user && String(emergency.user) === req.user.id;
    const recovered = req.headers["x-recovery-code"] && hash(String(req.headers["x-recovery-code"])) === emergency.recoveryHash;
    if (!owner && !recovered) return res.status(403).json({ error: "Emergency recovery code required" });
    if (emergency.recording?.storedName) return res.status(409).json({ error: "A recording already exists for this emergency" });

    const mimeType = req.headers["content-type"] || "video/webm";
    const storedName = `${crypto.randomUUID()}.${recordingExtension(mimeType)}`;
    const finalPath = path.resolve(config.uploadDir, "emergency", storedName);
    temporaryPath = `${finalPath}.part`;
    const output = fs.createWriteStream(temporaryPath, { flags: "wx" });
    const maximumBytes = Number(process.env.MAX_EMERGENCY_STREAM_BYTES || 250 * 1024 * 1024);
    let size = 0;
    let rejected = false;
    emergency.recording = { storedName, mimeType, size: 0, startedAt: new Date() };
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

export function handleEmergencyStreamSocket(socket, sessionId) {
  let emergency;
  let output;
  let temporaryPath;
  let finalPath;
  let size = 0;
  let ready = false;
  let completed = false;
  let cleaning = false;
  const maximumBytes = Number(process.env.MAX_EMERGENCY_STREAM_BYTES || 250 * 1024 * 1024);

  const send = payload => {
    if (socket.readyState === 1) socket.send(JSON.stringify(payload));
  };
  const cleanup = async () => {
    if (cleaning || completed) return;
    cleaning = true;
    output?.destroy();
    if (temporaryPath) fs.rmSync(temporaryPath, { force: true });
    if (emergency?.recording && !emergency.recording.completedAt) {
      emergency.recording = undefined;
      await emergency.save().catch(() => undefined);
    }
  };
  const fail = async (message, closeCode = 1008) => {
    send({ type: "error", error: message });
    await cleanup();
    socket.close(closeCode, message.slice(0, 120));
  };

  socket.on("message", async (data, isBinary) => {
    try {
      if (!ready) {
        if (isBinary) return void fail("Authenticate before streaming");
        const input = JSON.parse(data.toString());
        if (input.type !== "authenticate") return void fail("Authentication message required");
        emergency = await Emergency.findOne({ recordingSessionId: sessionId }).select("+recoveryHash");
        if (!emergency) return void fail("Emergency session not found");
        let user = null;
        if (input.token) {
          try { const payload = jwt.verify(input.token, config.jwtSecret); user = await User.findById(payload.sub); } catch { user = null; }
        }
        const owner = user && String(emergency.user) === user.id;
        const recovered = input.recoveryCode && hash(String(input.recoveryCode)) === emergency.recoveryHash;
        if (!owner && !recovered) return void fail("Emergency recovery code required");
        if (emergency.recording?.storedName) return void fail("A recording already exists for this emergency", 1008);

        const mimeType = input.mimeType || "video/webm";
        const storedName = `${crypto.randomUUID()}.${recordingExtension(mimeType)}`;
        finalPath = path.resolve(config.uploadDir, "emergency", storedName);
        temporaryPath = `${finalPath}.part`;
        output = fs.createWriteStream(temporaryPath, { flags: "wx" });
        output.on("error", error => void fail(error.message, 1011));
        emergency.recording = { storedName, mimeType, size: 0, startedAt: new Date() };
        await emergency.save();
        ready = true;
        send({ type: "ready", sessionId });
        return;
      }

      if (isBinary) {
        size += data.length;
        if (size > maximumBytes) return void fail("Emergency recording exceeds the configured limit", 1009);
        if (!output.write(data)) {
          socket._socket?.pause();
          output.once("drain", () => socket._socket?.resume());
        }
        return;
      }

      const input = JSON.parse(data.toString());
      if (input.type === "abort") return void fail("Recording cancelled", 1000);
      if (input.type !== "complete" || completed) return;
      completed = true;
      output.end(async () => {
        try {
          fs.renameSync(temporaryPath, finalPath);
          emergency.recording.size = size;
          emergency.recording.completedAt = new Date();
          emergency.events.push({ type: "recording_completed", note: `Private WebSocket stream stored (${size} bytes)`, actor: emergency.user });
          await emergency.save();
          send({ type: "completed", received: true, size, sessionId });
          socket.close(1000, "Recording stored");
        } catch (error) {
          completed = false;
          await fail(error.message, 1011);
        }
      });
    } catch (error) {
      await fail(error instanceof Error ? error.message : "Stream processing failed", 1011);
    }
  });
  socket.on("close", () => { if (!completed) void cleanup(); });
  socket.on("error", () => { if (!completed) void cleanup(); });
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
    res.json(rows.map(e => ({ ...e.toJSON(), user_id: e.user?.id || e.user, emergency_type: e.type, location_data: serializeLocation(e.location), video_path: e.recording?.storedName ? `/api/emergencies/${e.id}/recording` : null, recording_session_id: e.recordingSessionId, stream_size: e.recording?.size || 0, created_at: e.createdAt, updated_at: e.updatedAt })));
  } catch (error) { next(error); }
}

export async function deleteEmergency(req, res, next) {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });
    if (emergency.recording?.storedName) fs.rmSync(path.join(config.uploadDir, "emergency", emergency.recording.storedName), { force: true });
    await emergency.deleteOne();
    await audit(req, "emergency.delete", "Emergency", req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function readRecording(req, res, next) {
  try {
    const emergency = await Emergency.findById(req.params.id).select("+recoveryHash");
    if (!emergency) return res.status(404).json({ error: "Emergency not found" });
    const owner = req.user && String(emergency.user) === req.user.id;
    const operator = req.user && operationalRoles.includes(req.user.role);
    const recovered = req.headers["x-recovery-code"] && hash(String(req.headers["x-recovery-code"])) === emergency.recoveryHash;
    if (!owner && !operator && !recovered) return res.status(403).json({ error: "Access denied" });
    const storedName = emergency.recording?.storedName;
    if (!storedName) return res.status(404).json({ error: "Recording not found" });
    const recordingPath = path.resolve(config.uploadDir, "emergency", storedName);
    const { size } = await fs.promises.stat(recordingPath);
    const mimeType = emergency.recording?.mimeType || "video/webm";
    await audit(req, "emergency.recording.read", "Emergency", emergency.id);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);

    const requestedRange = req.headers.range;
    if (!requestedRange) {
      res.setHeader("Content-Length", size);
      return fs.createReadStream(recordingPath).on("error", next).pipe(res);
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
    if (!match) {
      res.setHeader("Content-Range", `bytes */${size}`);
      return res.status(416).end();
    }

    let start;
    let end;
    if (match[1] === "") {
      const suffixLength = Number(match[2]);
      if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
        res.setHeader("Content-Range", `bytes */${size}`);
        return res.status(416).end();
      }
      start = Math.max(size - suffixLength, 0);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Number(match[2]);
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) {
      res.setHeader("Content-Range", `bytes */${size}`);
      return res.status(416).end();
    }
    end = Math.min(end, size - 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", end - start + 1);
    return fs.createReadStream(recordingPath, { start, end }).on("error", next).pipe(res);
  } catch (error) { next(error); }
}
