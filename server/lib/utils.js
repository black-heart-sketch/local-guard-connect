import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { AuditLog } from "../models/index.js";

export function ensureUploadDirs() {
  for (const folder of ["evidence", "emergency", "avatars"]) fs.mkdirSync(path.join(config.uploadDir, folder), { recursive: true });
}

export function reference(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function recoveryCode() {
  return crypto.randomBytes(9).toString("base64url").toUpperCase();
}

export function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function fileKind(mime = "") {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export async function audit(req, action, resourceType, resourceId, metadata = {}) {
  await AuditLog.create({ actor: req.user?._id, action, resourceType, resourceId: String(resourceId), metadata, ip: req.ip });
}

export function coordinatesFrom(body) {
  const latitude = Number(body.latitude ?? body.coordinates?.latitude ?? body.coordinates?.lat);
  const longitude = Number(body.longitude ?? body.coordinates?.longitude ?? body.coordinates?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return { type: "Point", coordinates: [longitude, latitude], accuracy: Number(body.accuracy) || undefined };
}

export function serializeLocation(location, approximate = false) {
  if (!location?.coordinates?.length) return null;
  let [longitude, latitude] = location.coordinates;
  if (approximate) {
    longitude = Math.round(longitude * 100) / 100;
    latitude = Math.round(latitude * 100) / 100;
  }
  return { longitude, latitude, lng: longitude, lat: latitude, accuracy: approximate ? undefined : location.accuracy };
}
