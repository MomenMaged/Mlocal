
import express from "express";

import { ForgotPassword } from "../Controller/forgotPassword.js";
import { ResetPassword } from "../Controller/resetPassword.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { authorizeRoles } from "../middleware/AuthRole.js";

import {
  createUser,
  getAllUsers,
  deleteUser,
  getUserByID,
  updateUserRole,
  LoginUser,
  LogoutUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
} from "../Controller/UserController.js";

const router = express.Router();

// Public routes
router.post("/", createUser);
router.post("/login", LoginUser); 
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);

// Authenticated user routes
router.get("/profile", authMiddleware, getMyProfile);
router.patch("/profile", authMiddleware, updateMyProfile);
router.patch("/change-password", authMiddleware, changePassword);
router.post("/logout", authMiddleware, LogoutUser);

// Admin-only user management routes
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  getAllUsers
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  getUserByID
);

router.patch(
  "/:id/role",
  authMiddleware,
  authorizeRoles("admin"),
  updateUserRole
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteUser
);

export default router;
