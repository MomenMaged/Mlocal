// Pause for a number of milliseconds (1000 ms = 1 second).
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Run a task. If it fails with a TEMPORARY Gemini error (429 or 503),
// wait and try again. Waits grow each time: baseDelayMs, then 2x, then 3x...
export const withRetry = async (
  task,
  { maxAttempts = 3, baseDelayMs = 20000 } = {},
) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      const message = error.message || "";
      const isTemporary =
        error.status === 429 ||
        error.status === 503 ||
        message.includes("429") ||
        message.includes("503");

      // Permanent error, or no attempts left: give up.
      if (!isTemporary || attempt === maxAttempts) {
        throw error;
      }

      const waitMs = attempt * baseDelayMs;
      console.log(
        `   Gemini busy, waiting ${waitMs / 1000}s then retrying (attempt ${attempt}/${maxAttempts})...`,
      );
      await sleep(waitMs);
    }
  }
};
