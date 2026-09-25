import { Router } from "express";
import { createNotification, deleteNotification, listNotifications, markNotificationRead } from "../controllers/notificationController.js";
import { operationalRoles, requireAuth, requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications", requireRole(...operationalRoles), createNotification);
router.patch("/notifications/:id/read", requireAuth, markNotificationRead);
router.delete("/notifications/:id", requireRole(...operationalRoles), deleteNotification);
export default router;
