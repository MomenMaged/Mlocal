
import cosineSimilarity from "../utils/cosineSimilarity.js";

const vectorA = [1, 2, 3];
const vectorB = [1, 2, 3];
const vectorC = [3, 2, 1];

console.log(
  "Same vectors:",
  cosineSimilarity(vectorA, vectorB)
);

console.log(
  "Different vectors:",
  cosineSimilarity(vectorA, vectorC)
);
