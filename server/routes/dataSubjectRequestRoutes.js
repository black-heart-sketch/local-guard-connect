import { Router } from "express";
import { createRequest, exportMyData, listRequests, updateRequest } from "../controllers/dataSubjectRequestController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
const router = Router();
router.post("/privacy/requests", requireAuth, createRequest);
router.get("/privacy/requests", requireAuth, listRequests);
router.patch("/privacy/requests/:id", requireRole("admin"), updateRequest);
router.get("/privacy/export", requireAuth, exportMyData);
export default router;
