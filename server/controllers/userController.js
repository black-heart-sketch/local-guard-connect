import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { audit } from "../lib/utils.js";

function tokenFor(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
}

export function publicUser(user) {
  return { id: user.id, email: user.email, phone: user.phone, full_name: user.fullName, avatar_url: user.avatarUrl, role: user.role, locale: user.locale, location: user.jurisdiction, verified: user.verified, user_id: user.id, created_at: user.createdAt, updated_at: user.updatedAt };
}

function setSession(res, user) {
  const token = tokenFor(user);
  res.cookie("crimex_token", token, { httpOnly: true, sameSite: "lax", secure: config.nodeEnv === "production", maxAge: 7 * 86400000 });
  return token;
}

export async function register(req, res, next) {
  try {
    const { email, phone, password, fullName, locale = "fr", consentVersion } = req.body;
    if ((!email && !phone) || !password || password.length < 8) return res.status(400).json({ error: "Email or phone and a password of at least 8 characters are required" });
    if (phone && !/^\+2376\d{8}$/.test(phone.replace(/\s/g, ""))) return res.status(400).json({ error: "Use a valid Cameroon phone number in +2376XXXXXXXX format" });
    const match = await User.findOne({ $or: [email ? { email: email.toLowerCase() } : null, phone ? { phone: phone.replace(/\s/g, "") } : null].filter(Boolean) });
    if (match) return res.status(409).json({ error: "An account already exists" });
    const user = await User.create({ email, phone: phone?.replace(/\s/g, ""), passwordHash: await bcrypt.hash(password, 12), fullName, locale, consent: { privacyVersion: consentVersion || "2026-09", acceptedAt: new Date() } });
    const token = setSession(res, user);
    await audit({ ...req, user }, "auth.register", "User", user.id);
    res.status(201).json({ token, user: publicUser(user), profile: publicUser(user) });
  } catch (error) { next(error); }
}

export async function login(req, res, next) {
  try {
    const loginValue = String(req.body.email || req.body.phone || "").trim();
    const user = await User.findOne(loginValue.startsWith("+") ? { phone: loginValue.replace(/\s/g, "") } : { email: loginValue.toLowerCase() }).select("+passwordHash");
    if (!user || !user.active || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ error: "Invalid credentials" });
    const token = setSession(res, user);
    await audit({ ...req, user }, "auth.login", "User", user.id);
    res.json({ token, user: publicUser(user), profile: publicUser(user) });
  } catch (error) { next(error); }
}

export function logout(_req, res) { res.clearCookie("crimex_token"); res.status(204).end(); }
export function me(req, res) { res.json({ user: publicUser(req.user), profile: publicUser(req.user) }); }

export async function updateProfile(req, res, next) {
  try {
    for (const key of ["fullName", "phone", "locale", "jurisdiction", "trustedContacts"]) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    await audit(req, "profile.update", "User", req.user.id);
    res.json({ profile: publicUser(req.user) });
  } catch (error) { next(error); }
}

export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "Avatar file required" });
    req.user.avatarUrl = `/api/files/avatar/${req.file.filename}`;
    await req.user.save();
    res.json({ url: req.user.avatarUrl, profile: publicUser(req.user) });
  } catch (error) { next(error); }
}

export function avatar(req, res) { res.sendFile(path.resolve(config.uploadDir, "avatars", path.basename(req.params.name))); }
export async function listUsers(_req, res, next) { try { res.json((await User.find().sort({ createdAt: -1 })).map(publicUser)); } catch (error) { next(error); } }
export async function updateUser(req, res, next) {
  try {
    const allowed = ["role", "active", "verified", "jurisdiction"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await User.findByIdAndUpdate(req.params.id, updates, { returnDocument: "after", runValidators: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    await audit(req, "user.update", "User", user.id, updates);
    res.json(publicUser(user));
  } catch (error) { next(error); }
}
export async function deactivateUser(req, res, next) { try { const user = await User.findByIdAndUpdate(req.params.id, { active: false }, { returnDocument: "after" }); res.json(publicUser(user)); } catch (error) { next(error); } }
