
import "dotenv/config";

import { ai, CHAT_MODEL } from "../Config/modelConfig.js";

const testGemini = async () => {
  try {
    console.log("Sending request to Gemini...");

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: "Explain artificial intelligence in simple words.",
    });

    console.log("\nGemini response:");
    console.log(response.text);

  } catch (error) {
    console.error("Gemini API error:", error.message);
  }
};

testGemini();
