import { config } from "../config.js";
import { ChannelEvent } from "../models/ChannelEvent.js";
import { Report } from "../models/Report.js";
import { hash, recoveryCode, reference } from "../lib/utils.js";
import { sendSms } from "../services/smsService.js";

function authorized(req) {
  const expected = process.env.CHANNEL_WEBHOOK_SECRET;
  return expected ? req.headers["x-webhook-secret"] === expected : config.nodeEnv !== "production";
}

function parseReportText(text = "") {
  const parts = text.split("|").map(value => value.trim());
  if (parts[0]?.toUpperCase() !== "REPORT" || parts.length < 4) return null;
  return { category: parts[1], addressText: parts[2], description: parts.slice(3).join(" | ") };
}

async function createChannelReport({ channel, phone, input, externalId, metadata }) {
  const event = await ChannelEvent.create({ channel, phone, input, externalId, metadata });
  const parsed = parseReportText(input);
  if (!parsed) {
    event.status = "rejected";
    event.response = "Format: REPORT|TYPE|LOCATION|DESCRIPTION";
    await event.save();
    return { event, accepted: false };
  }
  const secret = recoveryCode();
  const report = await Report.create({ reference: reference("CMR"), ...parsed, isAnonymous: true, recoveryHash: hash(secret), contactPreference: "sms", retentionUntil: new Date(Date.now() + Number(process.env.EVIDENCE_RETENTION_DAYS || 365) * 86400000), timeline: [{ status: "received", note: `Submitted through ${channel.toUpperCase()}` }] });
  event.status = "processed";
  event.report = report._id;
  event.response = `CrimeX ${report.reference}. Recovery code: ${secret}`;
  await event.save();
  return { event, report, recoveryCode: secret, accepted: true };
}

export async function receiveSms(req, res, next) {
  try {
    if (!authorized(req)) return res.status(401).json({ error: "Invalid webhook signature" });
    const result = await createChannelReport({ channel: "sms", phone: req.body.phone, input: req.body.message, externalId: req.body.messageId, metadata: req.body.metadata });
    await sendSms({ to: req.body.phone, message: result.event.response });
    res.status(result.accepted ? 201 : 400).json({ accepted: result.accepted, reference: result.report?.reference, response: result.event.response });
  } catch (error) { next(error); }
}

export async function receiveUssd(req, res, next) {
  try {
    if (!authorized(req)) return res.status(401).json({ error: "Invalid webhook signature" });
    if (!req.body.text) return res.json({ end: false, response: "CrimeX: REPORT|TYPE|LOCATION|DESCRIPTION" });
    const result = await createChannelReport({ channel: "ussd", phone: req.body.phone, input: req.body.text, externalId: req.body.sessionId, metadata: req.body.metadata });
    res.status(result.accepted ? 201 : 200).json({ end: true, accepted: result.accepted, reference: result.report?.reference, response: result.event.response });
  } catch (error) { next(error); }
}

export async function listChannelEvents(_req, res, next) { try { res.json(await ChannelEvent.find().populate("report", "reference category status").sort({ createdAt: -1 }).limit(500)); } catch (error) { next(error); } }
