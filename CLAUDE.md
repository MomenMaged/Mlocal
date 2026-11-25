# CLAUDE.md

Project rules, commands and gotchas live in AGENTS.md (shared with other agents). Read it first:

@AGENTS.md

## AI product search / chatbot (`Back_End/src/AI/`)

Work in progress: an AI shopping assistant that understands a customer's query with Gemini and ranks products by embedding similarity. It is **not wired into the API yet** — no router or controller imports from `src/AI/`, so it only runs through its scripts and tests.

### Layout
- `Config/modelConfig.js` — single shared `GoogleGenAI` client (`@google/genai`), plus `CHAT_MODEL` and `EMBEDDING_MODEL`.
- `services/queryUnderstandingService.js` — `understandQuery(query)` asks the chat model for JSON `{ productType, activity, attributes, relatedProducts }` (`responseMimeType: "application/json"`, then `JSON.parse`).
- `services/productSearchService.js` — `searchProducts(query)`: understand intent → embed query (`taskType: "RETRIEVAL_QUERY"`) → load every product with a non-empty `embedding` → cosine similarity → add a type boost (+0.12 exact `productType`, +0.04 related) → return top 5 `{ product, similarity, typeBoost, score }`.
- `utils/productTextBuilder.js` — builds the text that gets embedded: name, category name, description.
- `utils/cosineSimilarity.js`, `utils/detectSearchIntent.js` (keyword-based activity detection; currently unused by the search service).
- `scripts/` — one-off maintenance scripts that connect to MongoDB directly (`generateProductEmbeddings.js`, `draftProductDescriptions.js`, `updateProductDescriptions.js`).
- `test/` — manual scripts run with node; they are not a test suite and there is no test runner.

### Running
From `Back_End/`:
- `node src/AI/scripts/generateProductEmbeddings.js` — (re)embeds every product (`taskType: "RETRIEVAL_DOCUMENT"`) and saves it to `Product.embedding`.
- `node src/AI/test/<file>.js` — e.g. `testProductSearch.js`, `testQueryUnderstanding.js`, `testGemini.js`.

### Environment
Add to `Back_End/.env` (not listed in AGENTS.md):
- `GEMINI_API_KEY` — required. `modelConfig.js` **throws at import time** if it is missing, so importing any AI module into the server makes the whole API fail to start without it.
- `GEMINI_CHAT_MODEL` (optional, default `gemini-3.8-flash`), `GEMINI_EMBEDDING_MODEL` (optional, default `gemini-embedding-001`).

### Gotchas
- **Folder case mismatch:** the folder is `src/AI/Config/` but code imports `../config/modelConfig.js`. This works on Windows (case-insensitive) but breaks on Linux and on Vercel. Fix the folder name or the imports before deploying.
- Re-run `generateProductEmbeddings.js` after changing a product's name, description or category, after adding products, or after changing `EMBEDDING_MODEL` / `buildProductText`. Query and document embeddings must come from the same model, or similarity scores are meaningless.
- Products with an empty `embedding` are silently excluded from search results.
- Search loads all embedded products into memory and scores them in JS on every query. Fine for the current small catalog; consider MongoDB Atlas Vector Search if the catalog grows.
- `getProductType` in `productSearchService.js` uses a hand-written regex list. A product type missing from it (or from the model's `productType` vocabulary) gets no boost.
- `understandQuery` does `JSON.parse(response.text)` with no error handling; a malformed model response throws.
- Each search makes two Gemini calls (understanding + embedding), which adds latency and cost per request.
- `embedding` is a field on the `Product` schema. Don't return it to the frontend in API responses (it is large); use a projection such as `.select("-embedding")`.

## How to work with this developer (read first)

- The developer is learning to become an AI engineer. Teach step by step, in beginner-friendly language, and explain *why* each change is needed.
- **Do not edit project files yourself.** Show the code in the chat, explain it, and let the developer type it into VS Code. Only `CLAUDE.md` may be edited directly.
- One small step at a time. Don't jump ahead or touch several files at once. Ask the developer to run each test and paste the output before moving on.
- Preserve the existing semantic search (embeddings + cosine similarity). Avoid hand-written keyword rules; use Gemini for understanding, but always validate its output against the real catalog.
- Run backend commands from `Back_End/` (not the repo root), e.g. `node src/AI/test/testProductSearch.js`.
- The developer's `.env` sets `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite` (`gemini-3.8-flash` returned 503 errors).

## Current progress: activity-aware ranking

Goal: products made for the customer's activity (e.g. running shoes for a running query) rank above similar products for other activities (e.g. Barricade Tennis Shoes), using a small boost rather than a filter so related products still appear.

Plan:
1. **Tag products with activities (in progress)**
   - 1a. Add `activities: { type: [String], default: [] }` to `models/Product.js` (after `embedding`).
   - 1b. Create `src/AI/utils/activities.js` with `ALLOWED_ACTIVITIES` (running, gym, football, basketball, tennis, swimming) and `cleanActivities()`, which lowercases, keeps only allowed values, and removes duplicates. Test with a one-line `node --input-type=module -e` command from `Back_End/`; expected output `[ 'running', 'gym' ]` then `[]`.
   - 1c. Create `src/AI/scripts/tagProductActivities.js`: for each product, ask Gemini which allowed activities it is designed for, clean the answer with `cleanActivities()`, print the tags, and save with `bulkWrite` only when run with `--apply` (dry run by default, same pattern as `updateProductDescriptions.js`).
2. Make `queryUnderstandingService.js` return `activity` using only `ALLOWED_ACTIVITIES` (or null), validated with the same helper.
3. In `productSearchService.js`, add an activity boost when `product.activities` includes `intent.activity`, then re-run `testProductSearch.js` and compare. Also print similarity, boost, and score as separate columns (the current test labels `score` as "Similarity").

Status: 1a and 1b have been explained. The developer is about to run the 1b test (the first attempt failed only because it ran from the repo root instead of `Back_End/`). 1c is next.
