import express from "express";
import { addToCart , updateCartItem , removeCartItem, clearCart, getCart} from "../Controller/AddtoCartController.js";
import {authMiddleware} from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, addToCart);
router.get("/",authMiddleware,getCart);
router.patch("/items/:itemId", authMiddleware, updateCartItem);
router.delete("/items/:itemId", authMiddleware, removeCartItem);
router.delete("/", authMiddleware, clearCart);


export default router;