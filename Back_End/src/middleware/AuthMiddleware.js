import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import TokenBlacklist from "../models/TokenBlacklist.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const blacklistedToken = await TokenBlacklist.findOne({
      tokenHash,
    });

    if (blacklistedToken) {
      return res.status(401).json({
        message: "Token has been invalidated. Please log in again.",
      });
    }

    req.user = { id: decoded.UserId, role: decoded.role };

    req.token = token;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
}
