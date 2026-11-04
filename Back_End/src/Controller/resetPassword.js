import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function ResetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    } catch {
      return res.status(400).json({
        message: "Reset token is invalid or expired",
      });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({
        message: "Invalid reset token",
      });
    }

    const user = await User.findById(decoded.UserId);

    if (!user) {
      return res.status(400).json({
        message: "Invalid reset token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}