import pool from "../config/db.js";

export const Category = {
  findByIdUnderOrg: async (id, orgId) => {
    const [rows] = await pool.query(
      "SELECT category_id FROM categories WHERE category_id = ? AND org_id = ?",
      [id, orgId]
    );
    return rows[0];
  },

  findAllUnderOrg: async (orgId) => {
    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE org_id = ?",
      [orgId]
    );
    return rows;
  },

  create: async (orgId, data) => {
    const [result] = await pool.query(
      "INSERT INTO categories (org_id, category_name, description, image_url) VALUES (?, ?, ?, ?)",
      [orgId, data.category_name, data.description, data.image_url]
    );
    return result.insertId;
  },

  update: async (id, orgId, data) => {
    const [result] = await pool.query(
      "UPDATE categories SET ? WHERE category_id = ? AND org_id = ?",
      [data, id, orgId]
    );
    return result.affectedRows > 0;
  },

  delete: async (id, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM categories WHERE category_id = ? AND org_id = ?",
      [id, orgId]
    );
    return result.affectedRows > 0;
  }
};
