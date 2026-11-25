import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";
import { ai, CHAT_MODEL } from "../config/modelConfig.js";
import { buildProductText } from "../utils/productTextBuilder.js";
import { ALLOWED_ACTIVITIES, cleanActivities } from "../utils/activities.js";
import { sleep, withRetry } from "../utils/retry.js";

const askGeminiForActivities = async (productText) => {
  const prompt = `
You are tagging products for an Adidas-style e-commerce store.

Decide which sports or activities this product is specifically designed for.

Allowed activities (use ONLY these exact words):
${ALLOWED_ACTIVITIES.join(", ")}

Return ONLY valid JSON using this exact structure:

{
  "activities": ["string"]
}

RULES:
- Only include an activity if the product is clearly made for it.
- Lifestyle or casual products (sneakers, slides, casual T-shirts, caps) usually get [].
- "training" or "workout" products belong to "gym".
- A product can have more than one activity, but most have zero or one.
- Do not guess. When unsure, return an empty array.

Product:
${productText}
`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const data = JSON.parse(response.text);

  return cleanActivities(data.activities);
};

const run = async () => {
  const shouldApply = process.argv.includes("--apply");

  try {
    await connectDB();

    const products = await Product.find().populate("categories", "name");

    console.log(`Found ${products.length} products.`);
    console.log(`Using model: ${CHAT_MODEL}\n`);

    const operations = [];
    const failed = [];

    for (const product of products) {
      const productText = buildProductText(product);

      try {
       const activities = await withRetry(() => askGeminiForActivities(productText));

        console.log(
          `${product.name} | ${product.categories?.name} -> [${activities.join(", ")}]`,
        );

        operations.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { activities } },
          },
        });
      } catch (error) {
        console.error(`FAILED: ${product.name} -> ${error.message}`);
        failed.push(product.name);
      }
       await sleep(4500);
    }

    console.log(`\nTagged: ${operations.length} | Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log("Failed products:", failed.join(", "));
    }
        if (!shouldApply) {
      console.log("\nDRY RUN: No database changes were made.");
      console.log("Check the tags above, then run with --apply to save them.");
      return;
    }

    if (operations.length === 0) {
      console.log("Nothing to save.");
      return;
    }

    const result = await Product.bulkWrite(operations);

    console.log("\nActivities saved successfully!");
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Tagging failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

run();