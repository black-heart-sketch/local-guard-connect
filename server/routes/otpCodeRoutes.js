import { Router } from "express";
import { requestOtp, verifyOtp } from "../controllers/otpCodeController.js";
const router = Router();
router.post("/auth/otp/request", requestOtp);
router.post("/auth/otp/verify", verifyOtp);
export default router;
