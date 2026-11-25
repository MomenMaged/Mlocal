import "dotenv/config";
import { ai, CHAT_MODEL } from "../config/modelConfig.js";
import { chat } from "../services/chatService.js";

const run = async () => {
  try {
    const question = "Can you recommend running shoes?";

    // 1) Plain Gemini, NO rules: what would happen without a system prompt?
    console.log("\n=== WITHOUT RULES ===");
    console.log(`Customer: ${question}`);
    const raw = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: question,
    });
    console.log(`Gemini: ${raw.text}`);

        // 2) Our bot, WITH rules
    console.log("\n=== WITH RULES ===");

    const messages = [
      question,
      "What is the capital of France?",
      "Hi! I'm looking for something for the gym",
      "مرحبا، عندكم شنط؟",
    ];

    for (const message of messages) {
      console.log(`\nCustomer: ${message}`);
      const reply = await chat(message);
      console.log(`Bot: ${reply}`);
    }

      } catch (error) {
    console.error("Chat test failed:", error.message);
  }
};

run();