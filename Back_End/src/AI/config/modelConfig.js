
import { GoogleGenAI } from "@google/genai";

// Make sure the API key exists before creating the client.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from your environment variables");
}

// Create one reusable Gemini client.
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Model configuration
export const CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash";

export const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    