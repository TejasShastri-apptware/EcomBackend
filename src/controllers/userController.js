import { User } from "../models/User.js";
import { Address } from "../models/Address.js";
import pool from "../config/db.js";

/**
 * POST /users/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const orgId = req.org_id;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!orgId) {
      return res.status(400).json({ message: 'Organization context is missing (x-org-id header)' });
    }

    const user = await User.findByEmailAndOrg(email, orgId);

    console.log("Login Attempt:", { email: email.trim().toLowerCase(), orgId });

    if (!user) {
      const existCheck = await User.checkEmailExistsGlobal(email);
      console.log("Email exists in these Orgs:", existCheck);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

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

/**
 * GET /users/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;

    if (!userId) return res.status(401).json({ message: 'User ID missing from request context' });

    const user = await User.findByIdWithRole(userId, orgId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /users/me
 */
const updateMe = async (req, res) => {
  try {
    const userId = req.user_id;
    const orgId = req.org_id;
    const { full_name, phone } = req.body;

    if (!userId) return res.status(401).json({ message: 'User ID missing from request context' });
    if (!full_name) return res.status(400).json({ message: 'full_name is required' });

    const updated = await User.updateProfile(userId, orgId, { full_name, phone });

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error in updateMe:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /users/ (Admin)
 */
const getAllUsersUnderOrg = async (req, res) => {
  try {
    const orgId = req.org_id;
    const rows = await User.findAllByOrg(orgId);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllUsersUnderOrg:', error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/**
 * GET /users/global/all (Global Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const rows = await User.findAllGlobal();
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /users/:id (Admin)
 */
const getUserByIdUnderOrg = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const user = await User.findDetailByIdUnderOrg(id, orgId);

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error('Error in getUserByIdUnderOrg:', error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /users/:id (Global Admin)
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdGlobal(id);

    if (!user) return res.status(404).json({ message: `User by id ${id} not found` });
    res.json(user);
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /users/register
 */
const createUser = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      full_name, email, password_hash, phone, role_id,
      address_line1, address_line2, city, state, postal_code, country, label
    } = req.body;
    const orgId = req.org_id;
    
    // Insert user
    const userId = await User.create({
      full_name, email, password_hash, phone, role_id, org_id: orgId
    }, connection);

    // Insert the registration address as the default
    await Address.create({
      org_id: orgId,
      user_id: userId,
      label: label || 'Home',
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      is_default: true
    }, connection);

    await connection.commit();

    res.status(201).json({
      message: "User and default address created",
      user_id: userId,
      email
    });

  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: `Email already registered.` });
    }
    console.error("Error in createUser:", error);
    res.status(500).json({ message: "Server error during user creation", error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * PUT /users/org/:id (Admin Update)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone } = req.body;
    const org_id = req.org_id;

    const updated = await User.updateProfile(id, org_id, { full_name, phone });

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: "Update failed" });
  }
};

/**
 * DELETE /users/org/:id (Admin Delete)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;
    const deleted = await User.delete(id, orgId);

    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  login,
  getMe,
  updateMe,
  getAllUsersUnderOrg,
  getAllUsers,
  getUserByIdUnderOrg,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};