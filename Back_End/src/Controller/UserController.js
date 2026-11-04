import User from "../models/User.js"


import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import TokenBlacklist from "../models/TokenBlacklist.js"

import bcrypt from "bcrypt";


export async function createUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      // The schema default assigns role: "user".
    });

    const savedUser = await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}



export async function getAllUsers(req, res) {
  try {
    const {
      search = "",
      role = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Number(page);
    const pageLimit = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isInteger(pageLimit) ||
      pageLimit < 1 ||
      pageLimit > 100
    ) {
      return res.status(400).json({
        message: "Invalid pagination values",
      });
    }

    const filter = {};

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (role) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }

      filter.role = role;
    }

    const skip = (currentPage - 1) * pageLimit;

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalUsers / pageLimit),
        totalUsers,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      message: "Could not retrieve users",
    });
  }
}

export async function getUserByID(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      message: "Could not retrieve user",
    });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either user or admin",
      });
    }

    // Prevent an admin from changing their own role.
    if (userId === req.user.id) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return res.status(500).json({
      message: "Could not update user role",
    });
  }
}

export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;

    // Prevent an admin from deleting their own account.
    if (userId === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent deleting the last admin account.
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "You cannot delete the last admin account",
        });
      }
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      message: "Could not delete user",
    });
  }
}


export async function LoginUser(req,res){

  const authHeader = req.headers.authorization;

if (authHeader && authHeader.startsWith("Bearer ")) {
  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);

    return res.status(400).json({
      message: "You are already logged in.",
    });
  } catch (error) {
    // Token is invalid or expired; continue with normal login.
  }
}

  try {
const { email, password} = req.body;

const user = await User.findOne({email});

if (!user) { return res.status(401).json({ message: "Invalid email or password" });}

const isPasswordValid = await bcrypt.compare(password, user.password);

if (!isPasswordValid) { return res.status(401).json({ message: "Invalid email or password" });}

const token = jwt.sign({ UserId: user._id, role: user.role}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN} )

 return res.status(200).json({message: "Login successfully",token ,  id:user.id , name: user.name, email: user.email, role: user.role})

  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }

}


export async function LogoutUser(req, res) {
  try {
    const token = req.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const decoded = jwt.decode(token);

    if (!decoded?.exp) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    await TokenBlacklist.updateOne(
      { tokenHash },
      {
        $setOnInsert: {
          tokenHash,
          expiresAt: new Date(decoded.exp * 1000),
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error(error);

   return res.status(500).json({
    message: error.message,
  });
  }
}

  

export async function getMyProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Could not retrieve profile",
    });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const { name, email } = req.body;

    // Only allow these two fields to be updated here.
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      updates.email = email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Please provide a name or email to update",
      });
    }

    // Check whether another account already uses this email.
    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user.id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    // Also handle a duplicate email if two requests race.
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Could not update profile",
    });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isValid) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}