// Pause for a number of milliseconds (1000 ms = 1 second).
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Is this a TEMPORARY Gemini error (too many requests, or Google overloaded)?
// Used by withRetry AND by the chat controller.
export const isTemporaryError = (error) => {
  const message = error?.message || "";

  return (
    error?.status === 429 ||
    error?.status === 503 ||
    message.includes("429") ||
    message.includes("503")
  );
};

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
           // Permanent error, or no attempts left: give up.
      if (!isTemporaryError(error) || attempt === maxAttempts) {
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
