const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");
const injectContext = require("../middleware/injectContext");

// Tenant scoped
router.post("/", injectContext, CategoryController.createCat);
router.get("/", injectContext, CategoryController.getAllCategories);
router.get("/:id", injectContext, CategoryController.getCategoryById);
router.put("/:id", injectContext, CategoryController.updateCategory);
router.delete("/:id", injectContext, CategoryController.deleteCategory);

module.exports = router;