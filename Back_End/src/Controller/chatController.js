import { chat } from "../AI/services/chatService.js";

// POST /api/chat
// Body: { message: "...", history: [ { role, text }, ... ] }
export const chatWithAssistant = async (req, res) => {
  const { message, history = [] } = req.body;

  // 1. Check the request BEFORE spending a Gemini call on it.
  if (typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ message: "Message is required." });
  }

  if (message.length > 500) {
    return res.status(400).json({ message: "Message is too long (max 500 characters)." });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ message: "History must be an array." });
  }

  // 2. Ask the bot.
  try {
    const result = await chat(message.trim(), history);
    return res.json(result);
  } catch (error) {
    // 3. Gemini still failing after all retries: a friendly message, not a crash.
    console.error("Chat error:", error);
    return res.status(503).json({
      message: "The assistant is busy right now. Please try again in a moment.",
    });
  }
};