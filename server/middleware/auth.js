import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/index.js";

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.crimex_token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = await User.findById(payload.sub);
    }
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user?.active) return res.status(401).json({ error: "Authentication required" });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

export const operationalRoles = ["dispatcher", "police", "gendarmerie", "fire", "medical", "ngo", "council", "admin"];
