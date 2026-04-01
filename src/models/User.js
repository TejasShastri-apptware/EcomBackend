import pool from "../config/db.js";

export const User = {
  /**
   * Find a user by email and organization (for login)
   */
  findByEmailAndOrg: async (email, orgId) => {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = ? AND u.org_id = ?`,
      [email.trim().toLowerCase(), orgId]
    );
    return rows[0];
  },

  /**
   * Check if an email exists in any organization
   */
  checkEmailExistsGlobal: async (email) => {
    const [rows] = await pool.query(
      `SELECT org_id FROM users WHERE email = ?`, 
      [email.trim().toLowerCase()]
    );
    return rows;
  },

  /**
   * Find a user by ID with role info
   */
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

  /**
   * Get all users under an organization
   */
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

  /**
   * Get all users globally (Admin)
   */
  findAllGlobal: async () => {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.created_at, u.org_id 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.org_id
    `);
    return rows;
  },

  /**
   * Get full user info including default address (Admin/Detail)
   */
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

  /**
   * Find user by ID global
   */
  findByIdGlobal: async (id) => {
    const [rows] = await pool.query(
      "SELECT user_id, full_name, email, phone, role_id, org_id FROM users WHERE user_id = ?",
      [id]
    );
    return rows[0];
  },

  /**
   * Create a new user
   */
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

  /**
   * Update user profile
   */
  updateProfile: async (userId, orgId, { full_name, phone }) => {
    const [result] = await pool.query(
      `UPDATE users SET full_name = ?, phone = ? WHERE user_id = ? AND org_id = ?`,
      [full_name, phone || null, userId, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Delete a user
   */
  delete: async (userId, orgId) => {
    const [result] = await pool.query(
      "DELETE FROM users WHERE user_id = ? AND org_id = ?", 
      [userId, orgId]
    );
    return result.affectedRows > 0;
  }
};
