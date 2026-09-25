import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { OtpCode } from "../models/OtpCode.js";
import { User } from "../models/User.js";
import { publicUser } from "./userController.js";
import { sendSms } from "../services/smsService.js";
import { audit } from "../lib/utils.js";

function normalizePhone(value = "") { return value.replace(/\s/g, ""); }

export async function requestOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!/^\+2376\d{8}$/.test(phone)) return res.status(400).json({ error: "Use +2376XXXXXXXX" });
    await OtpCode.deleteMany({ phone, consumedAt: null });
    const code = String(crypto.randomInt(100000, 999999));
    await OtpCode.create({ phone, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + 10 * 60_000) });
    const delivery = await sendSms({ to: phone, message: `CrimeX: votre code / your code is ${code}. Valid 10 minutes.` });
    res.status(201).json({ sent: delivery.delivered, expiresInSeconds: 600, ...(config.nodeEnv === "production" ? {} : { developmentCode: code }) });
  } catch (error) { next(error); }
}

export async function verifyOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = await OtpCode.findOne({ phone, consumedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).select("+codeHash");
    if (!otp || otp.attempts >= 5) return res.status(401).json({ error: "Code invalid or expired" });
    if (!(await bcrypt.compare(String(req.body.code), otp.codeHash))) {
      otp.attempts += 1;
      await otp.save();
      return res.status(401).json({ error: "Code invalid or expired" });
    }
    otp.consumedAt = new Date();
    await otp.save();
    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone, passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12), fullName: req.body.fullName, locale: req.body.locale || "fr", consent: { privacyVersion: "2026-09", acceptedAt: new Date() } });
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.cookie("crimex_token", token, { httpOnly: true, sameSite: "lax", secure: config.nodeEnv === "production", maxAge: 7 * 86400000 });
    await audit({ ...req, user }, "auth.otp", "User", user.id);
    res.json({ token, user: publicUser(user), profile: publicUser(user) });
  } catch (error) { next(error); }
}
