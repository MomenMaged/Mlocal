// A special error type, so we can recognise "too slow" later.
export class TimeoutError extends Error {
  constructor(ms) {
    super(`Timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

// Run a task, but give up if it takes longer than `ms` milliseconds.
export const withTimeout = (promise, ms) => {
  let timer;

  // A promise that FAILS after `ms` milliseconds.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });

  // Whichever finishes first wins: the real task, or the stopwatch.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};