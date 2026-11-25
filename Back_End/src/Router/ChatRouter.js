import express from "express";
import { chatWithAssistant } from "../Controller/chatController.js";

const router = express.Router();

// POST /api/chat  ->  chatWithAssistant
router.post("/", chatWithAssistant);

export default router;