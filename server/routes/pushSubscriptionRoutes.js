import { Router } from "express";
import { pushConfig, subscribe, unsubscribe } from "../controllers/pushSubscriptionController.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.get("/push/config", pushConfig);
router.post("/push/subscriptions", requireAuth, subscribe);
router.delete("/push/subscriptions", requireAuth, unsubscribe);
export default router;
