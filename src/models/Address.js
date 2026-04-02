import pool from "../config/db.js";

export const Address = {
  
  findByUser: async (userId, orgId) => {
    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE user_id = ? AND org_id = ?",
      [userId, orgId]
    );
    return rows;
  },

  
  findByIdUnderOrg: async (id, userId, orgId) => {
    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE address_id = ? AND user_id = ? AND org_id = ?",
      [id, userId, orgId]
    );
    return rows[0];
  },

  
  create: async (data, connection = pool) => {
    const [result] = await connection.query(
      `INSERT INTO addresses (org_id, user_id, label, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.org_id, data.user_id, data.label || 'Home', data.address_line1, 
        data.address_line2 || null, data.city, data.state, data.postal_code, 
        data.country, data.is_default || false
      ]
    );
    return result.insertId;
  },

  
  update: async (id, orgId, data) => {
    const [result] = await pool.query(
      "UPDATE addresses SET ? WHERE address_id = ? AND org_id = ?",
      [data, id, orgId]
    );
    return result.affectedRows > 0;
  },

  
  delete: async (id, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM addresses WHERE address_id = ? AND org_id = ?",
      [id, orgId]
    );
    return result.affectedRows > 0;
  },

  
  setDefault: async (id, userId, orgId, connection = pool) => {
    // Unset current default
    await connection.query(
      "UPDATE addresses SET is_default = FALSE WHERE user_id = ?",
      [userId]
    );
    // Set new default
    const [result] = await connection.query(
      "UPDATE addresses SET is_default = TRUE WHERE address_id = ? AND user_id = ?",
      [id, userId]
    );
    return result.affectedRows > 0;
  }
};
