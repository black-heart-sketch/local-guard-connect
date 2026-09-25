import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { config } from "../config.js";

const storage = multer.diskStorage({
  destination: (req, _file, callback) => callback(null, path.join(config.uploadDir, req.uploadKind || "evidence")),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, callback) => callback(null, /^(image|video|audio)\//.test(file.mimetype) || file.mimetype === "application/pdf"),
});

export const uploadKind = (kind) => (req, _res, next) => {
  req.uploadKind = kind;
  next();
};
