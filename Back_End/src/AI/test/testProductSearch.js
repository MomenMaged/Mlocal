import "dotenv/config";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";

import { connectDB } from "../../config/db.js";
import Category from "../../models/Category.js";

import searchProducts from "../services/productSearchService.js";

const testProductSearch = async () => {
  try {
    await connectDB(); 

    const queries = [
      "I need comfortable shoes for running",
      "Something comfortable for the gym",
      "A warm hoodie for winter",
    ];

    for (const query of queries) {
      console.log(`\nCustomer query: "${query}"`);
      console.log("--------------------------------");

      const results = await searchProducts(query);
      results.forEach(({ product, similarity, typeBoost, activityBoost, score }, index) => {
        console.log(
          `${index + 1}. ${product.name} | sim ${similarity.toFixed(3)} + type ${typeBoost} + activity ${activityBoost} = ${score.toFixed(3)}`
        );
      });
    }
  } catch (error) {
    console.error("Search test failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB connection closed.");
  }
};

testProductSearch();
