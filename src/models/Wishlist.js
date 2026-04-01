import pool from "../config/db.js";

export const Wishlist = {
  findAllByUser: async (userId, orgId) => {
    const [rows] = await pool.query(
      `SELECT w.wishlist_id, w.product_id, p.name, p.price, p.image_url, w.added_at
       FROM wishlists w
       JOIN products p ON w.product_id = p.product_id
       WHERE w.user_id = ? AND w.org_id = ?`,
      [userId, orgId]
    );
    return rows;
  },

  addItem: async (userId, orgId, productId) => {
    const [result] = await pool.query(
      "INSERT IGNORE INTO wishlists (user_id, org_id, product_id) VALUES (?, ?, ?)",
      [userId, orgId, productId]
    );
    return result.affectedRows > 0;
  },

  removeItem: async (wishlistId, userId, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM wishlists WHERE wishlist_id = ? AND user_id = ? AND org_id = ?",
      [wishlistId, userId, orgId]
    );
    return result.affectedRows > 0;
  },

  checkItemExists: async (userId, orgId, productId) => {
    const [rows] = await pool.query(
      "SELECT wishlist_id FROM wishlists WHERE user_id = ? AND org_id = ? AND product_id = ?",
      [userId, orgId, productId]
    );
    return rows.length > 0;
  }
};
