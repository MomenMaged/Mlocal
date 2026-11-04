
import mongoose from "mongoose";

const TokenBlacklistSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
});

const TokenBlacklist = mongoose.model(
  "TokenBlacklist",
  TokenBlacklistSchema
);

export default TokenBlacklist;
