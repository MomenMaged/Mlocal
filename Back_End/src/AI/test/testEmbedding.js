
import "dotenv/config";
import { ai, EMBEDDING_MODEL } from "../Config/modelConfig.js";

const testEmbedding = async () => {
  try {
    const texts = [
      "Comfortable shoes designed for running",
      "Running footwear with excellent cushioning",
      "A cotton t-shirt for everyday wear",
    ];

    console.log("Generating embeddings...");

    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: {
        taskType: "SEMANTIC_SIMILARITY",
      },
    });

    response.embeddings.forEach((embedding, index) => {
      console.log(`\nText: ${texts[index]}`);
      console.log("Vector dimensions:", embedding.values.length);
      console.log("First 10 values:", embedding.values.slice(0, 10));
    });
  } catch (error) {
    console.error("Embedding API error:", error.message);
  }
};

testEmbedding();
