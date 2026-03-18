const pool = require("../config/db");

exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.user_id;
    const orgId = req.org_id;

    // Security check -- does the org own the product?
    const [productCheck] = await pool.query(
      "SELECT product_id FROM products WHERE product_id = ? AND org_id = ?",
      [product_id, orgId]
    );

    if (productCheck.length === 0) {
      return res.status(404).json({ message: "Product not found in this organization" });
    }

    // The UNIQUE (user_id, org_id, product_id) constraint handles the collision during updation
    const query = `
      INSERT INTO cart_items (user_id, org_id, product_id, quantity)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;

    await pool.query(query, [userId, orgId, product_id, quantity]);

    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Error updating cart" });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;

    // Org specific cart isolation
    const [items] = await pool.query(`
      SELECT c.cart_item_id, c.product_id, p.name, p.price, p.image_url, c.quantity,
      (p.price * c.quantity) AS item_total
      FROM cart_items c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ? AND c.org_id = ?
    `, [userId, orgId]);

    res.json(items);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Error fetching cart" });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const { cart_item_id } = req.params;
    const { quantity } = req.body;
    const orgId = req.org_id;

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    // cross-tenant manipulation must be avoidd. My d-button stops working for some reason I need to buy a keyboard.
    const [result] = await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND org_id = ?",
      [quantity, cart_item_id, orgId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Quantity updated" });
  } catch (error) {
    res.status(500).json({ message: "Error updating quantity" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { cart_item_id } = req.params;
    const orgId = req.org_id;

    const [result] = await pool.query(
      "DELETE FROM cart_items WHERE cart_item_id = ? AND org_id = ?", 
      [cart_item_id, orgId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ message: "Error removing item" });
  }
};