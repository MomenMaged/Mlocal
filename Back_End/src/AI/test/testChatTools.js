import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import Category from "../../models/Category.js";
import { chat } from "../services/chatService.js";
import { sleep } from "../utils/retry.js";

const messages = [
  "Can you recommend running shoes?",
  "Something comfortable for the gym",
  "Do you have Nike Pegasus?",
  "مرحبا، عندكم شنط؟",
  "What is the capital of France?",
];

const run = async () => {
  try {
    await connectDB();

    for (const message of messages) {
      console.log(`\nCustomer: ${message}`);

      const start = Date.now();
      const { reply, products } = await chat(message);
      const time = Date.now() - start;

      console.log(`Bot: ${reply}`);

      if (products.length > 0) {
        console.log(`Searched -> ${products.map((p) => p.name).join(", ")}`);
      } else {
        console.log("Searched -> (no search)");
      }

      console.log(`Time: ${time} ms`);

      await sleep(3000); // stay under the free limit of 15 requests per minute
    }
  } catch (error) {
    console.error("Chat test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();