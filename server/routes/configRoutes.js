import { Router } from "express";
import { cameroonConfig, health, reverseGeocode } from "../controllers/configController.js";

const router = Router();
router.get("/health", health);
router.get("/config/cameroon", cameroonConfig);
router.get("/geocode/reverse", reverseGeocode);
export default router;
