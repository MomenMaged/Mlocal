import express from "express";
import { getAdminDashboard } from "../Controller/adminController.js";
import { authorizeRoles } from "../middleware/AuthRole.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminDashboard
);

export default router;