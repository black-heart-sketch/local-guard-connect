import { Router } from "express";
import { createAiChatCompletion } from "../controllers/aiChatController.js";

const router = Router();
router.post("/ai/chat", createAiChatCompletion);

export default router;
