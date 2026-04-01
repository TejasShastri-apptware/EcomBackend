import express from "express";
import WishlistController from "../controllers/WishlistController.js";
import injectContext from "../middleware/injectContext.js";

const router = express.Router();

// Wishlist endpoints
router.get("/", injectContext, WishlistController.getWishlist);
router.post("/add", injectContext, WishlistController.addToWishlist);
router.delete("/remove/:id", injectContext, WishlistController.removeFromWishlist);

export default router;
