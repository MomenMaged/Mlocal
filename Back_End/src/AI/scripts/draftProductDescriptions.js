
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "../../config/db.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";

import { ai, CHAT_MODEL } from "../config/modelConfig.js";

const draftProductDescriptions = async () => {
  try {
    // 1. Connect to MongoDB.
    await connectDB();

    // 2. Fetch all products with their category names.
    const products = await Product.find().populate("categories", "name");

    console.log(`Found ${products.length} products.`);

    // 3. Prepare product information for Gemini.
    const productData = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      category: product.categories?.name || "Unknown",
    }));

    // 4. Ask Gemini to draft conservative descriptions.
   
const prompt = `
You are generating concise product descriptions for an e-commerce catalog.

For every product:
- Write one natural description between 12 and 25 words.
- Identify the product type.
- Use activity or purpose only when explicitly supported by the product name.
- Include useful distinguishing terms from the product name.
- Do not invent materials, colors, technologies, performance,
  comfort, durability, waterproofing, or other specifications.
- Do not add generic marketing language.
- Do not repeat category information unnecessarily.
- Preserve every product ID exactly.

Return valid JSON only, as an array of objects:
[
  {
    "id": "product_id",
    "description": "description"
  }
]

Products:
${JSON.stringify(productData, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    // 5. Parse and display the generated descriptions.
    const descriptions = JSON.parse(response.text);

    console.log("\nGenerated product descriptions:\n");

    console.log(JSON.stringify(descriptions, null, 2));

    console.log("\nDraft generation completed.");
    console.log("No products were modified.");
  } catch (error) {
    console.error("Description generation failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

draftProductDescriptions();
