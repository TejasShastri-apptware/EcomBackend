import express from 'express';
const router = express.Router();
import CategoryController from "../controllers/CategoryController.js";
import injectContext from "../middleware/injectContext.js";

// Tenant scoped
router.post("/", injectContext, CategoryController.createCat);
router.get("/", injectContext, CategoryController.getAllCategories);
router.get("/:id", injectContext, CategoryController.getCategoryById);
router.put("/:id", injectContext, CategoryController.updateCategory);
router.delete("/:id", injectContext, CategoryController.deleteCategory);

export default router;