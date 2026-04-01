import pool from "../config/db.js";

export const Cart = {
  /**
   * Get all items in a user's cart including product details (price, stock)
   * Uses FOR UPDATE to lock rows during checkout
   */
  getItemsForCheckout: async (userId, orgId, connection = pool) => {
    const [rows] = await connection.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock_quantity
       FROM cart_items c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.user_id = ? AND c.org_id = ? FOR UPDATE`,
      [userId, orgId]
    );
    return rows;
  },

  /**
   * Clear a user's cart
   */
  clear: async (userId, orgId, connection = pool) => {
    await connection.query(
      "DELETE FROM cart_items WHERE user_id = ? AND org_id = ?",
      [userId, orgId]
    );
  },

  /**
   * Get simple cart items for current view
   */
  findAllByUser: async (userId, orgId) => {
    const [rows] = await pool.query(
      `SELECT c.cart_item_id, c.product_id, p.name, p.price, p.image_url, c.quantity, 
              (p.price * c.quantity) AS subtotal
       FROM cart_items c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.user_id = ? AND c.org_id = ?`,
      [userId, orgId]
    );
    return rows;
  },

  /**
   * Add or update an item in the cart
   */
  addItem: async (userId, orgId, { product_id, quantity = 1 }) => {
    const [result] = await pool.query(
      `INSERT INTO cart_items (user_id, org_id, product_id, quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [userId, orgId, product_id, quantity]
    );
    return result;
  },

  /**
   * Update item quantity in cart
   */
  updateQuantity: async (cartItemId, userId, orgId, quantity) => {
    const [result] = await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND user_id = ? AND org_id = ?",
      [quantity, cartItemId, userId, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Remove item from cart
   */
  removeItem: async (cartItemId, userId, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ? AND org_id = ?",
      [cartItemId, userId, orgId]
    );
    return result.affectedRows > 0;
  }
};
