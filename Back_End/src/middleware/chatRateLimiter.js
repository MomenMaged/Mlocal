import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// A separate, stricter limit just for the chatbot:
// each visitor can send 10 messages per minute.
const chatLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "ratelimit:chat",
});

// Who is this visitor? We use their IP address.
const getVisitorKey = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  return ip || "unknown";
};

export const chatRateLimiter = async (req, res, next) => {
  try {
    const { success } = await chatLimit.limit(getVisitorKey(req));

    if (!success) {
      return res.status(429).json({
        message: "You're sending messages too fast. Please wait a minute and try again.",
      });
    }

    return next();
  } catch (error) {
    // If the limiter itself breaks, let the message through (see below).
    console.error("Chat rate limiter error:", error);
    return next();
  }
};