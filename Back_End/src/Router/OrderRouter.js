import express from "express";
import {
  cancelOrder,
  createOrder,
  getOrder,
  getOrderByID,
  updateOrderStatus,
} from "../Controller/orderController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { authorizeRoles } from "../middleware/AuthRole.js";
import {
  createCheckoutSession,
  verifyCheckoutSession,
} from "../Controller/paymentController.js";
import {
  getAllOrdersAdmin,
  getOrderDetailsAdmin,
} from "../Controller/orderController.js";


const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.get("/", authMiddleware, getOrder);

// Admin routes
router.get(
  "/admin",
  authMiddleware,
  authorizeRoles("admin"),
  getAllOrdersAdmin
);

router.get(
  "/admin/:id",
  authMiddleware,
  authorizeRoles("admin"),
  getOrderDetailsAdmin
);

router.post("/:id/checkout", authMiddleware, createCheckoutSession);
router.get(
  "/payment/verify-session/:sessionId",
  authMiddleware,
  verifyCheckoutSession,
);
router.get("/:id", authMiddleware, getOrderByID);
router.patch("/:id/cancel", authMiddleware, cancelOrder);
router.patch(
  "/status/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateOrderStatus,
);


export default router;
