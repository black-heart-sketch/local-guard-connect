import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import multer from "multer";
import path from "node:path";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { optionalAuth } from "./middleware/auth.js";
import { ensureUploadDirs } from "./lib/utils.js";
import configRoutes from "./routes/configRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import communityPostRoutes from "./routes/communityPostRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import agencyRoutes from "./routes/agencyRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import migrationRoutes from "./routes/migrationRoutes.js";
import otpCodeRoutes from "./routes/otpCodeRoutes.js";
import channelEventRoutes from "./routes/channelEventRoutes.js";
import dataSubjectRequestRoutes from "./routes/dataSubjectRequestRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pushSubscriptionRoutes from "./routes/pushSubscriptionRoutes.js";

export function createApp() {
  ensureUploadDirs();
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.clientOrigin.split(","), credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (config.nodeEnv !== "test") app.use(morgan("combined"));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true }));
  app.use("/api", optionalAuth, configRoutes, userRoutes, otpCodeRoutes, channelEventRoutes, dataSubjectRequestRoutes, paymentRoutes, pushSubscriptionRoutes, reportRoutes, notificationRoutes, communityPostRoutes, emergencyRoutes, agencyRoutes, auditLogRoutes, migrationRoutes);
  if (config.nodeEnv === "production") {
    const dist = path.resolve("dist");
    app.use(express.static(dist, { maxAge: "1y", index: false }));
    app.get(["/", "/*splat"], (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    if (error?.name === "ValidationError") return res.status(400).json({ error: error.message });
    if (error?.code === 11000) return res.status(409).json({ error: "A record with this value already exists" });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: config.nodeEnv === "production" ? "Internal server error" : error.message });
  });
  return app;
}
