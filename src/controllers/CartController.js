import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";

const addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.user_id;
    const orgId = req.org_id;

    // Security check
    const product = await Product.findByIdUnderOrg(product_id, orgId);
    if (!product) {
      return res.status(404).json({ message: "Product not found in this organization" });
    }

    await Cart.addItem(userId, orgId, { product_id, quantity });

    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Error updating cart" });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;

    const items = await Cart.findAllByUser(userId, orgId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Error fetching cart" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { cart_item_id } = req.params;
    const { quantity } = req.body;
    const userId = req.user_id;
    const orgId = req.org_id;

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const updated = await Cart.updateQuantity(cart_item_id, userId, orgId, quantity);

    if (!updated) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Quantity updated" });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Error updating quantity" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { cart_item_id } = req.params;
    const userId = req.user_id;
    const orgId = req.org_id;

    const removed = await Cart.removeItem(cart_item_id, userId, orgId);

    if (!removed) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ message: "Error removing item" });
  }
};

export default {
    addToCart,
    getCart,
    updateCartQuantity,
    removeFromCart
};