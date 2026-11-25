
import { ai, EMBEDDING_MODEL } from "../config/modelConfig.js";
import Product from "../../models/Product.js";
import cosineSimilarity from "../utils/cosineSimilarity.js";
import understandQuery from "./queryUnderstandingService.js";

// The product types our search can recognise (see getProductType below).
// Exported so the chatbot can tell Gemini which types are allowed.
export const PRODUCT_TYPES = [
  "shoes", "hoodie", "leggings", "shorts", "t-shirt", "pants",
  "slides", "socks", "sweatshirt", "jacket", "bag", "cap",
];

const ACTIVITY_BOOST = 0.08;

// Identify the product type using its name and category.
const getProductType = (product) => {
  const name = product.name.toLowerCase();
  const category = product.categories?.name?.toLowerCase() || "";

  const text = `${name} ${category}`;

  if (/\b(shoes?|sneakers?|boots?)\b/.test(text)) return "shoes";
  if (/\b(hoodies?)\b/.test(text)) return "hoodie";
  if (/\b(leggings?)\b/.test(text)) return "leggings";
  if (/\b(shorts?)\b/.test(text)) return "shorts";
  if (/\b(t-?shirts?|tees)\b/.test(text)) return "t-shirt";
  if (/\b(pants?|trousers)\b/.test(text)) return "pants";
  if (/\b(slides?|slippers)\b/.test(text)) return "slides";
  if (/\b(socks?)\b/.test(text)) return "socks";
  if (/\b(sweatshirts?|crewnecks)\b/.test(text)) return "sweatshirt";
  if (/\b(jackets?|windbreakers?)\b/.test(text)) return "jacket";
  if (/\b(bags?|backpacks?|duffels?)\b/.test(text)) return "bag";
  if (/\b(caps?|hats?)\b/.test(text)) return "cap";

  return null;
};

// Check whether a product matches one of Gemini's related product suggestions.
const matchesRelatedProduct = (productType, relatedProducts) => {
  if (!productType || !Array.isArray(relatedProducts)) {
    return false;
  }

  return relatedProducts.some((related) => {
    const normalized = related.toLowerCase();

    return normalized.includes(productType) ||
      (productType === "shoes" && normalized.includes("sneaker"));
  });
};

const searchProducts = async (query, options = {}) => {
  // Step 1: Understand the customer's shopping intent.
    // Use the intent we were given (e.g. from the chatbot).
  // If none was given, ask Gemini to work it out.
  const intent = options.intent ?? (await understandQuery(query));

  // Step 2: Generate the query embedding.
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
    },
  });

  const queryEmbedding = response.embeddings[0].values;

  // Step 3: Retrieve products that have embeddings.
  const products = await Product.find({
    embedding: { $exists: true, $ne: [] },
  }).populate("categories", "name");

  // Step 4: Calculate similarity and ranking boosts.
  const results = products.map((product) => {
    const similarity = cosineSimilarity(
      queryEmbedding,
      product.embedding,
    );

    const productType = getProductType(product);

    const exactMatch =
      intent.productType &&
      productType === intent.productType;

    const relatedMatch = matchesRelatedProduct(
      productType,
      intent.relatedProducts,
    );

    let typeBoost = 0;

    if (exactMatch) {
      typeBoost = 0.12;
    } else if (relatedMatch) {
      typeBoost = 0.04;
    }

       const activityBoost =
      intent.activity && product.activities?.includes(intent.activity)
        ? ACTIVITY_BOOST
        : 0;

    return {
      product,
      similarity,
      typeBoost,
      activityBoost,
      score: similarity + typeBoost + activityBoost,
    };
  });

  // Step 5: Sort by the final score.
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 5);
};

export default searchProducts;
