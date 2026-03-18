const express = require("express");
const router = express.Router();
const cartController = require("../controllers/CartController");
const injectContext = require("../middleware/injectContext");

// Scope - organization and user
router.get("/", injectContext, cartController.getCart);
router.post("/add", injectContext, cartController.addToCart);
router.put("/update/:cart_item_id", injectContext, cartController.updateCartQuantity);
router.delete("/remove/:cart_item_id", injectContext, cartController.removeFromCart);

module.exports = router;