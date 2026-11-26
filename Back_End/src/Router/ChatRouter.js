import express from "express";
import { chatWithAssistant } from "../Controller/chatController.js";
import { chatRateLimiter } from "../middleware/chatRateLimiter.js";

const router = express.Router();

// POST /api/chat  ->  chatWithAssistant
router.post("/", chatRateLimiter,chatWithAssistant);

export default router;