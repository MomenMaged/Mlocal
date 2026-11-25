import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import Category from "../../models/Category.js";
import searchProducts from "../services/productSearchService.js";

const printResults = (results) => {
  results.forEach(({ product, similarity, typeBoost, activityBoost, score }, index) => {
    console.log(
      `${index + 1}. ${product.name} | sim ${similarity.toFixed(3)} + type ${typeBoost} + activity ${activityBoost} = ${score.toFixed(3)}`
    );
  });
};

const run = async () => {
  try {
    await connectDB();

    const query = "I need comfortable shoes for running";

    // Way 1: no intent given -> Gemini works it out (2 Gemini calls)
    console.log("\nWAY 1: without intent");
    let start = Date.now();
    let results = await searchProducts(query);
    console.log(`Time: ${Date.now() - start} ms`);
    printResults(results);

    // Way 2: intent given (like the chatbot will do) -> 1 Gemini call
    console.log("\nWAY 2: with intent");
    start = Date.now();
    results = await searchProducts(query, {
      intent: { productType: "shoes", activity: "running", relatedProducts: [] },
    });
    console.log(`Time: ${Date.now() - start} ms`);
    printResults(results);
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();