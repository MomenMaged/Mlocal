import express from "express"

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { authorizeRoles } from "../middleware/AuthRole.js";

import { getAllCategories, createCategory, deleteCategory } from "../Controller/CategoryController.js";


const router = express.Router();

router.get('/', getAllCategories),
router.post('/', createCategory);
router.delete('/:id', authMiddleware, authorizeRoles("admin"), deleteCategory);

export default router;