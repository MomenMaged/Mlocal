import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";
import { ai, EMBEDDING_MODEL } from "../config/modelConfig.js";
import { buildProductText } from "../utils/productTextBuilder.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";

const generateProductEmbeddings = async () => {
  try {
    // 1. Connect to MongoDB.
    await connectDB();

    // 2. Fetch products and populate their categories.
    const products = await Product.find().populate("categories", "name");

    console.log(`Found ${products.length} products.`);

    // 3. Generate and save an embedding for each product.
    for (const product of products) {
      const productText = buildProductText(product);

      if (!productText) {
        console.log(`Skipping product: ${product._id} (no text available)`);
        continue;
      }

      console.log(`Generating embedding for: ${product.name}`);

      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: productText,
        config: {
          taskType: "RETRIEVAL_DOCUMENT",
        },
      });

       const embedding = response.embeddings[0].values;

      // 4. Save the embedding in the product document.
      product.embedding = embedding;
      await product.save();

      console.log(
        `Saved embedding for ${product.name} (${embedding.length} dimensions)`
      );
    }

    console.log("\nAll product embeddings generated successfully!");
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
  } finally {
    // 5. Close the MongoDB connection.
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

generateProductEmbeddings();
