import express from 'express';
const router = express.Router();
import cartController from "../controllers/CartController.js";
import injectContext from "../middleware/injectContext.js";

// Scope - organization and user
router.get("/", injectContext, cartController.getCart);
router.post("/add", injectContext, cartController.addToCart);
router.put("/update/:cart_item_id", injectContext, cartController.updateCartQuantity);
router.delete("/remove/:cart_item_id", injectContext, cartController.removeFromCart);

export default router;