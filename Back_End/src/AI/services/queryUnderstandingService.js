
import { ai, CHAT_MODEL } from "../config/modelConfig.js";
import { ALLOWED_ACTIVITIES, cleanActivities } from "../utils/activities.js";
import { withRetry } from "../utils/retry.js";

const understandQuery = async (query) => {

const prompt = `
You are an AI shopping search assistant for an Adidas-style e-commerce store.

Analyze the customer's query and extract their shopping intent.

Return ONLY valid JSON using this exact structure:

{
  "productType": "string or null",
  "activity": "string or null",
  "attributes": ["string"],
  "relatedProducts": ["string"]
}

RULES:

1. productType:
- Identify the main product the customer explicitly requests.
- Examples: shoes, hoodie, t-shirt, shorts, pants, leggings, jacket, slides.
- Use null if no specific product type is requested.
- General words like clothes, apparel, or something are not specific product types.

2. activity:
- Must be exactly ONE of these words, or null: ${ALLOWED_ACTIVITIES.join(", ")}
- Map similar words to the closest allowed word, for example:
  workout, training, weightlifting, fitness -> gym
  jogging, marathon -> running
  soccer -> football
- Seasons such as winter and summer are NOT activities.
- Occasions such as everyday use and casual wear are NOT activities.
- If the activity is not in the allowed list (for example yoga or golf), use null.
- Use null when no activity is mentioned.

3. attributes:
- Extract relevant characteristics such as comfortable, warm, lightweight, casual, waterproof.
- Do not invent characteristics.

4. relatedProducts:
- Suggest relevant product types from the store.
- Suggestions must be related to the customer's needs.
- Do not suggest products unrelated to the requested activity or occasion.
- Keep suggestions concise.

5. General:
- Do not invent information.
- Use null when information is unavailable.
- Return JSON only, without explanations.

Customer query: "${query}"
`;


  // Short waits here: a real customer is waiting for search results.
  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: CHAT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      }),
    { maxAttempts: 3, baseDelayMs: 2000 },
  );

    const intent = JSON.parse(response.text);

  // Never trust AI output: keep the activity only if it's an allowed word.
  const cleaned = cleanActivities([intent.activity]);
  intent.activity = cleaned.length > 0 ? cleaned[0] : null;

  return intent;
};

export default understandQuery;
