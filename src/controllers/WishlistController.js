import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";

const getWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;

    const items = await Wishlist.findAllByUser(userId, orgId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: "Error fetching wishlist" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const userId = req.user_id;
    const orgId = req.org_id;

    if (!product_id) return res.status(400).json({ message: "Product ID is required" });

    // Verify product belongs to organization
    const product = await Product.findByIdUnderOrg(product_id, orgId);
    if (!product) {
      return res.status(404).json({ message: "Product not found in this organization" });
    }

    const added = await Wishlist.addItem(userId, orgId, product_id);
    if (added) {
      res.status(201).json({ message: "Product added to wishlist" });
    } else {
      res.status(200).json({ message: "Product already in wishlist" });
    }
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ message: "Error adding to wishlist" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;
    const orgId = req.org_id;

    const removed = await Wishlist.removeItem(id, userId, orgId);
    if (!removed) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ message: "Error removing from wishlist" });
  }
};

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
