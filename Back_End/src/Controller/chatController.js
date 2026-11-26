import { chat } from "../AI/services/chatService.js";
import { isTemporaryError } from "../AI/utils/retry.js";
import { withTimeout, TimeoutError } from "../AI/utils/timeout.js";

// Give up after 20 seconds. The website waits 30 seconds,
// so our friendly message always arrives BEFORE the website gives up.
const CHAT_TIMEOUT_MS = 20000;

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

  // 2. Ask the bot, with a time limit.
  try {
    const result = await withTimeout(chat(message.trim(), history), CHAT_TIMEOUT_MS);
    return res.json(result);
  } catch (error) {
    // 3. Sort the error into one of 3 kinds.

    // a) Too slow
    if (error instanceof TimeoutError) {
      console.warn("Chat timeout:", error.message);
      return res.status(504).json({
        message: "The assistant is taking too long right now. Please try again.",
      });
    }

    // b) Gemini busy (still failing after all retries)
    if (isTemporaryError(error)) {
      console.warn("Chat: Gemini busy:", error.message);
      return res.status(503).json({
        message: "The assistant is busy right now. Please try again in a moment.",
      });
    }

    // c) Anything else = probably a bug in OUR code
    console.error("Chat BUG:", error);
    return res.status(500).json({
      message: "Sorry, something went wrong on our side.",
    });
  }
};