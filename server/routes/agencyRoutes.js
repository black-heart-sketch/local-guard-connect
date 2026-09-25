import { Router } from "express";
import { createAgency, listAgencies, updateAgency } from "../controllers/agencyController.js";
import { requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/agencies", listAgencies);
router.post("/agencies", requireRole("admin"), createAgency);
router.patch("/agencies/:id", requireRole("admin"), updateAgency);
export default router;
