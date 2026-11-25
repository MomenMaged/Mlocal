
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import understandQuery from "../services/queryUnderstandingService.js";

const testQueries = [
  "I need comfortable shoes for running",
  "Something warm for winter",
  "I want clothes for playing basketball",
  "I need something for the gym",
  "Show me casual clothes for everyday use",
    "I need workout gear",
  "jogging shoes",
  "something for yoga",
];

const runTests = async () => {
  try {
    for (const query of testQueries) {
      console.log(`\nCustomer query: "${query}"`);
      console.log("--------------------------------");

      const intent = await understandQuery(query);

      console.log(JSON.stringify(intent, null, 2));
    }
  } catch (error) {
    console.error("Query understanding test failed:", error);
  }
};

runTests();
