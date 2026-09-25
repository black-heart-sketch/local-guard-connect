import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogController.js";
import { requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/audit-logs", requireRole("admin"), listAuditLogs);
export default router;
