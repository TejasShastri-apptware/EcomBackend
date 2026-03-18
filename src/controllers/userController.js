const pool = require("../config/db");

/**
 * POST /users/login
 * Body: { email, password, org_id (optional — also read from x-org-id header via injectContext) }
 * Plain-text comparison (no hashing yet — security hardening is deferred).
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // org_id comes from injectContext middleware (x-org-id header)
    const orgId = req.org_id;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!orgId) {
      return res.status(400).json({ message: 'Organization context is missing (x-org-id header)' });
    }

    // const [rows] = await pool.query(
    //   `SELECT u.user_id, u.full_name, u.email, u.phone, u.password_hash, u.org_id, r.role_name
    //    FROM users u
    //    JOIN roles r ON u.role_id = r.role_id
    //    WHERE u.email = ? AND u.org_id = ?
    //    LIMIT 1`,
    //   [email.trim().toLowerCase(), orgId]
    // );

    const [rows] = await pool.query(
    `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id 
     WHERE u.email = ? AND u.org_id = ?`,
    [email.trim().toLowerCase(), orgId]
);

console.log("Login Attempt:", { email: email.trim().toLowerCase(), orgId: orgId });
console.log("Rows Found:", rows.length);

if (rows.length === 0) {
    // Check if the user exists AT ALL without the org_id restriction
    const [existCheck] = await pool.query(`SELECT org_id FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
    console.log("Email exists in these Orgs:", existCheck);
    return res.status(401).json({ message: 'Invalid email or password' });
}

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Plain-text comparison (no bcrypt — to be upgraded later)
    if (user.password_hash !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Never send the password hash back to the client
    const { password_hash, ...safeUser } = user;
    return res.json({ message: 'Login successful', user: safeUser });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.getAllUsersUnderOrg = async (req, res) => {
  try {
    const orgId = req.org_id;
    const [rows] = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, u.phone, u.default_shipping_address, r.role_name, u.created_at, u.org_id 
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
      SELECT u.user_id, u.full_name, u.email, u.phone, u.default_shipping_address, r.role_name, u.created_at, u.org_id 
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
            `SELECT u.*, a.address_id 
             FROM users u
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
      "SELECT user_id, full_name, email, phone, default_shipping_address, role_id, org_id FROM users WHERE user_id = ?",
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
            address_line1, city, state, postal_code, country 
        } = req.body;
        const orgId = req.org_id;
        console.log("user data received for registration : ", req.body);

        // 1. Format a single string for the users table "default_shipping_address"
        const fullAddressString = `${address_line1}, ${city}, ${postal_code}, ${country}`;

        // 2. Insert into users table
        const [userResult] = await connection.query(
            `INSERT INTO users (full_name, email, password_hash, phone, role_id, org_id, default_shipping_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, password_hash, phone, role_id || 2, orgId, fullAddressString]
        );

        const newUserId = userResult.insertId;

        // 3. Insert into addresses table for relational consistency
        await connection.query(
            `INSERT INTO addresses (org_id, user_id, address_line1, city, state, postal_code, country, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [orgId, newUserId, address_line1, city, state, postal_code, country]
        );

        await connection.commit();

        res.status(201).json({
            message: "NEW USER AND ADDRESS CREATED",
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

exports.updateUser = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params; // user_id
        const { full_name, phone, address_line1, city, state, postal_code, country } = req.body;
        const orgId = req.org_id;

        const newAddressString = `${address_line1}, ${city}, ${postal_code}, ${country}`;

        // 1. Update User Table
        const [userUpdate] = await connection.query(
            `UPDATE users SET full_name = ?, phone = ?, default_shipping_address = ? 
             WHERE user_id = ? AND org_id = ?`,
            [full_name, phone, newAddressString, id, orgId]
        );

        if (userUpdate.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Update Address Table (Assuming the singular "default" address exists)
        await connection.query(
            `UPDATE addresses 
             SET address_line1 = ?, city = ?, state = ?, postal_code = ?, country = ?
             WHERE user_id = ? AND org_id = ? AND is_default = TRUE`,
            [address_line1, city, state, postal_code, country, id, orgId]
        );

        await connection.commit();
        res.json({ message: "User and address updated successfully" });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: "Update failed" });
    } finally {
        connection.release();
    }
};

// Org Check
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id
    const [result] = await pool.query("DELETE FROM users WHERE user_id = ? AND org_id = ?", [id, orgId]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};