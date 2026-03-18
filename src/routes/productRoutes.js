const express = require("express");
const router = express.Router();
const productController = require("../controllers/ProductController");
const injectContext = require("../middleware/injectContext");

// NOTE: Route order matters — specific paths before /:id to avoid shadowing.
// Global routes first so they aren't caught by /:id
router.get("/global/all", productController.getAllProductsGlobal);

// Org-scoped browsing
router.get("/", injectContext, productController.getAllProductsUnderOrg);
router.get("/search", injectContext, productController.searchProduct);
router.get("/tags", injectContext, productController.getProductByTags); // ?tags=1,2
router.get("/:id", injectContext, productController.getProductByIdUnderOrg);
router.get("/:id/tags", injectContext, productController.getProductTags);

// Org-scoped management
router.post("/with-tags", injectContext, productController.createProductWithTags);
router.post("/", injectContext, productController.createProductWithTags);
router.put("/updateStock/:id", injectContext, productController.updateStock);
router.put("/:id", injectContext, productController.updateProduct);
router.delete("/:id", injectContext, productController.deleteProduct);

router.post("/:id/tags", injectContext, productController.addTagToProduct);
router.delete("/:id/tags/:tag_id", injectContext, productController.removeTagFromProduct);

module.exports = router;