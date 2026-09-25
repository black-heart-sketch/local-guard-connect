import { Router } from "express";
import { assignReport, createReport, getReport, listReports, readEvidence, reportAnalytics, updateReportStatus } from "../controllers/reportController.js";
import { operationalRoles, requireAuth, requireRole } from "../middleware/auth.js";
import { upload, uploadKind } from "../middleware/upload.js";

const router = Router();
router.post("/reports", uploadKind("evidence"), upload.array("files", 6), createReport);
router.get("/reports", listReports);
router.get("/reports-analytics", requireRole(...operationalRoles), reportAnalytics);
router.get("/reports/track/:reference", getReport);
router.get("/reports/:id", getReport);
router.patch("/reports/:id/status", requireRole(...operationalRoles), updateReportStatus);
router.patch("/reports/:id/assign", requireRole(...operationalRoles), assignReport);
router.get("/reports/:reportId/evidence/:attachmentId", requireAuth, readEvidence);
export default router;
