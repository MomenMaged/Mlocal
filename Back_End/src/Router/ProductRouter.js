import express from "express"
import { getAllProducts, createProduct, getProductByID, updateProduct, deleteProduct } from "../Controller/ProductController.js"
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { authorizeRoles } from "../middleware/AuthRole.js";

const router = express.Router();

router.get('/', getAllProducts),
router.get('/:id', getProductByID),
router.post('/', authMiddleware, authorizeRoles("admin"), createProduct);
router.put('/:id', authMiddleware, authorizeRoles("admin"), updateProduct);
router.patch('/:id', authMiddleware, authorizeRoles("admin"), updateProduct);
router.delete('/:id', authMiddleware, authorizeRoles("admin"), deleteProduct);

export default router;