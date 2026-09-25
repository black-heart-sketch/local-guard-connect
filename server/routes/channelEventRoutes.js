import { Router } from "express";
import { listChannelEvents, receiveSms, receiveUssd } from "../controllers/channelEventController.js";
import { requireRole } from "../middleware/auth.js";
const router = Router();
router.post("/channels/sms/inbound", receiveSms);
router.post("/channels/ussd", receiveUssd);
router.get("/channel-events", requireRole("admin", "dispatcher"), listChannelEvents);
export default router;
