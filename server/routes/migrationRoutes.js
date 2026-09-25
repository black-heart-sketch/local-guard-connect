import { Router } from "express";
import { listMigrations } from "../controllers/migrationController.js";
import { requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/migrations", requireRole("admin"), listMigrations);
export default router;
