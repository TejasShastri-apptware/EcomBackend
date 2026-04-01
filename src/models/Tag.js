import pool from "../config/db.js";

export const Tag = {
  /**
   * Get all tags for an organization
   */
  findAllByOrg: async (orgId) => {
    const [rows] = await pool.query(
      "SELECT * FROM tags WHERE org_id = ?",
      [orgId]
    );
    return rows;
  },

  /**
   * Get all tags globally
   */
  findAllGlobal: async () => {
    const [rows] = await pool.query("SELECT * FROM tags");
    return rows;
  },

  /**
   * Create a new tag
   */
  create: async (orgId, { tag_name, tag_type }) => {
    const [result] = await pool.query(
      "INSERT INTO tags (org_id, tag_name, tag_type) VALUES (?, ?, ?)",
      [orgId, tag_name, tag_type]
    );
    return result.insertId;
  },

  /**
   * Update a tag
   */
  update: async (id, orgId, data) => {
    const [result] = await pool.query(
      "UPDATE tags SET ? WHERE tag_id = ? AND org_id = ?",
      [data, id, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Delete a tag
   */
  delete: async (id, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM tags WHERE tag_id = ? AND org_id = ?",
      [id, orgId]
    );
    return result.affectedRows > 0;
  }
};
