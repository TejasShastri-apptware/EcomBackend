const pool = require("../config/db");

/**
 * POST /users/login
 * Body: { email, password }
 * org_id comes from injectContext middleware (x-org-id header).
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const orgId = req.org_id;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!orgId) {
      return res.status(400).json({ message: 'Organization context is missing (x-org-id header)' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = ? AND u.org_id = ?`,
      [email.trim().toLowerCase(), orgId]
    );

    console.log("Login Attempt:", { email: email.trim().toLowerCase(), orgId });
    console.log("Rows Found:", rows.length);

    if (rows.length === 0) {
      const [existCheck] = await pool.query(`SELECT org_id FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
      console.log("Email exists in these Orgs:", existCheck);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Plain-text comparison (to be upgraded to bcrypt later)
    if (user.password_hash !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    return res.json({ message: 'Login successful', user: safeUser });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

 /* Requires x-user-id and x-org-id headers (via injectContext).*/
exports.getMe = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;

    if (!userId) return res.status(401).json({ message: 'User ID missing from request context' });

    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.org_id, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ? AND u.org_id = ?`,
      [userId, orgId]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /users/me
 * Updates full_name and phone for the currently logged-in user.
 * Email and password changes are intentionally excluded here.
 */
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;
    const { full_name, phone } = req.body;

    if (!userId) return res.status(401).json({ message: 'User ID missing from request context' });
    if (!full_name) return res.status(400).json({ message: 'full_name is required' });

    const [result] = await pool.query(
      `UPDATE users SET full_name = ?, phone = ? WHERE user_id = ? AND org_id = ?`,
      [full_name, phone || null, userId, orgId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error in updateMe:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsersUnderOrg = async (req, res) => {
  try {
    const orgId = req.org_id;
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.created_at, u.org_id 
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.org_id = ?`,
      [orgId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Global
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.phone, r.role_name, u.created_at, u.org_id 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.org_id
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserByIdUnderOrg = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.org_id, u.created_at, r.role_name, a.address_id 
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN addresses a ON u.user_id = a.user_id AND a.is_default = TRUE
       WHERE u.user_id = ? AND u.org_id = ?`,
      [id, orgId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Global
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT user_id, full_name, email, phone, role_id, org_id FROM users WHERE user_id = ?",
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: `User by id ${id} not found` });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createUser = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      full_name, email, password_hash, phone, role_id,
      address_line1, address_line2, city, state, postal_code, country, label
    } = req.body;
    const orgId = req.org_id;
    console.log("user data received for registration:", req.body);

    // Insert user (no default_shipping_address column anymore)
    const [userResult] = await connection.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role_id, org_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email.trim().toLowerCase(), password_hash, phone, role_id || 2, orgId]
    );

    const newUserId = userResult.insertId;

    // Insert the registration address as the default
    await connection.query(
      `INSERT INTO addresses (org_id, user_id, label, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [orgId, newUserId, label || 'Home', address_line1, address_line2 || null, city, state, postal_code, country]
    );

    await connection.commit();

    res.status(201).json({
      message: "User and default address created",
      user_id: newUserId,
      email
    });

  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: `Email already registered.` });
    }
    res.status(500).json({ message: "Server error during user creation", error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * PUT /users/org/:id  — Admin updates any user under this org.
 * Only updates name and phone (not address — use /addresses for that).
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone } = req.body;
    const orgId = req.org_id;

    const [result] = await pool.query(
      `UPDATE users SET full_name = ?, phone = ? WHERE user_id = ? AND org_id = ?`,
      [full_name, phone || null, id, orgId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// Org Check
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ? AND org_id = ?", [id, orgId]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};