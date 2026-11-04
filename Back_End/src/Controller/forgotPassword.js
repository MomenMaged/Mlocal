// import jwt from "jsonwebtoken";
// import nodemailer from "nodemailer";
// import transporter from "../config/email.js";
// import User from "../models/User.js";

// export async function ForgotPassword(req, res) {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({
//         message: "Email is required",
//       });
//     }

//     const user = await User.findOne({ email });

//     // Avoid revealing whether the email exists.
//     if (!user) {
//       return res.status(404).json({
//         message: "No user found with this email"
//       });
//     }

//     console.log("Generating token...");

//     // Generate a reset token valid for 10 minutes.
//     const resetToken = jwt.sign(
//       {
//         UserId: user._id,
//         purpose: "password-reset",
//       },
//       process.env.JWT_RESET_SECRET,
//       { expiresIn: "10m" }
//     );

//     console.log("Sending email...");


//     // Replace this URL with your frontend reset page later.
//     const resetLink =
//       `http://localhost:3000/reset-password?token=${resetToken}`;

//     // Send the email to Ethereal's test inbox.
//     const info = await transporter.sendMail({
//       from: '"My App" <test@example.com>',
//       to: user.email,
//       subject: "Reset Your Password",
//       text: `Use this link to reset your password. It expires in 10 minutes:\n${resetLink}`,
//       html: `
//         <h2>Password Reset</h2>
//         <p>You requested to reset your password.</p>
//         <p>This link expires in 10 minutes.</p>
//         <a href="${resetLink}">Reset Password</a>
//         <p>If you didn't request this, ignore this email.</p>
//       `,
//     });

//     // Print the Ethereal preview URL in your terminal.

//     console.log("Email sent successfully");

//     const previewUrl = nodemailer.getTestMessageUrl(info);
//     console.log("Ethereal email preview:", previewUrl);

//     return res.status(200).json({
//       message: "If the email exists, a reset link will be sent.",
//     });
//   } catch (error) {
//     console.error("Forgot password error:", error);

//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// }


import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import transporter from "../config/email.js";
import User from "../models/User.js";

export async function ForgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether the email is registered.
    if (!user) {
      return res.status(200).json({
        message: "If the email exists, a reset link will be sent.",
      });
    }

    const resetToken = jwt.sign(
      {
        UserId: user._id,
        purpose: "password-reset",
      },
      process.env.JWT_RESET_SECRET,
      { expiresIn: "10m" }
    );

    // Vite frontend runs on port 5173 by default.
    const resetLink =
      `http://localhost:5173/reset-password?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: '"MLocal Store" <test@example.com>',
      to: user.email,
      subject: "Reset Your Password",
      text: `Use this link to reset your password. It expires in 10 minutes:\n${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
          <h2>Password Reset</h2>
          <p>You requested to reset your password.</p>
          <p>This link expires in 10 minutes.</p>
          <a href="${resetLink}"
             style="background: black; color: white; padding: 12px 20px; text-decoration: none; display: inline-block;">
             Reset Password
          </a>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log("Password reset email sent.");
    console.log("Ethereal preview:", previewUrl);

    return res.status(200).json({
      message: "If the email exists, a reset link will be sent.",
    });

  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
