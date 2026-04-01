import pool from "../config/db.js";

export const User = {

  findByEmailAndOrg: async (email, orgId) => {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = ? AND u.org_id = ?`,
      [email.trim().toLowerCase(), orgId]
    );
    return rows[0];
  },

 
  checkEmailExistsGlobal: async (email) => {
    const [rows] = await pool.query(
      `SELECT org_id FROM users WHERE email = ?`, 
      [email.trim().toLowerCase()]
    );
    return rows;
  },


  findByIdWithRole: async (userId, orgId) => {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.org_id, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ? AND u.org_id = ?`,
      [userId, orgId]
    );
    return rows[0];
  },

  findAllByOrg: async (orgId) => {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.created_at, u.org_id 
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.org_id = ?`,
      [orgId]
    );
    return rows;
  },


  findAllGlobal: async () => {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.created_at, u.org_id 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.org_id
    `);
    return rows;
  },


  findDetailByIdUnderOrg: async (id, orgId) => {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.org_id, u.created_at, r.role_name, a.address_id 
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN addresses a ON u.user_id = a.user_id AND a.is_default = TRUE
       WHERE u.user_id = ? AND u.org_id = ?`,
      [id, orgId]
    );
    return rows[0];
  },

  findByIdGlobal: async (id) => {
    const [rows] = await pool.query(
      "SELECT user_id, full_name, email, phone, role_id, org_id FROM users WHERE user_id = ?",
      [id]
    );
    return rows[0];
  },


  create: async (data, connection = pool) => {
    const [result] = await connection.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role_id, org_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.full_name, 
        data.email.trim().toLowerCase(), 
        data.password_hash, 
        data.phone, 
        data.role_id || 2, 
        data.org_id
      ]
    );
    return result.insertId;
  },

  updateProfile: async (userId, orgId, { full_name, phone }) => {
    const [result] = await pool.query(
      `UPDATE users SET full_name = ?, phone = ? WHERE user_id = ? AND org_id = ?`,
      [full_name, phone || null, userId, orgId]
    );
    return result.affectedRows > 0;
  },

  delete: async (userId, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM users WHERE user_id = ? AND org_id = ?", 
      [userId, orgId]
    );
    return result.affectedRows > 0;
  }
};
