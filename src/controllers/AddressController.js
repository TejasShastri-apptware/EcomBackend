const pool = require("../config/db");

exports.addAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orgId = req.org_id;
        const userId = req.user_id; // From middleware — never trust body for identity

        const {
            label, address_line1, address_line2, city,
            state, postal_code, country, is_default
        } = req.body;

        if (is_default) {
            // Unset existing defaults
            await connection.query(
                "UPDATE addresses SET is_default = FALSE WHERE user_id = ? AND org_id = ?",
                [userId, orgId]
            );
        }

        const [result] = await connection.query(
            `INSERT INTO addresses 
            (org_id, user_id, label, address_line1, address_line2, city, state, postal_code, country, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orgId, userId, label || null, address_line1, address_line2 || null, city, state, postal_code, country, is_default || false]
        );

        await connection.commit();
        res.status(201).json({ address_id: result.insertId, message: "Address added successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error adding address:", error);
        res.status(500).json({ message: "Server error adding address" });
    } finally {
        connection.release();
    }
};

exports.getUserAddresses = async (req, res) => {
    try {
        const { user_id } = req.params;
        const orgId = req.org_id;

        const [rows] = await pool.query(
            "SELECT * FROM addresses WHERE user_id = ? AND org_id = ? ORDER BY is_default DESC, created_at ASC",
            [user_id, orgId]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching addresses" });
    }
};

/**
 * PUT /addresses/set-default/:address_id
 * Sets the given address as default for the currently logged-in user.
 * user_id is taken from req.user_id (x-user-id header), NOT the body.
 */
exports.setDefaultAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { address_id } = req.params;
        const userId = req.user_id; // From middleware — secure
        const orgId = req.org_id;

        // Unset current defaults for this user
        await connection.query(
            "UPDATE addresses SET is_default = FALSE WHERE user_id = ? AND org_id = ?",
            [userId, orgId]
        );

        // Set new default
        const [result] = await connection.query(
            "UPDATE addresses SET is_default = TRUE WHERE address_id = ? AND user_id = ? AND org_id = ?",
            [address_id, userId, orgId]
        );

        if (result.affectedRows === 0) throw new Error("Address not found");

        await connection.commit();
        res.json({ message: "Default address updated" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message || "Error setting default address" });
    } finally {
        connection.release();
    }
};

/**
 * PUT /addresses/:address_id
 * Edit an existing address. Only the owning user (via x-user-id) can edit it.
 */
exports.updateAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const userId = req.user_id;
        const orgId = req.org_id;

        const {
            label, address_line1, address_line2,
            city, state, postal_code, country
        } = req.body;

        if (!address_line1 || !city || !postal_code || !country) {
            return res.status(400).json({ message: "address_line1, city, postal_code, and country are required" });
        }

        const [result] = await pool.query(
            `UPDATE addresses 
             SET label = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?
             WHERE address_id = ? AND user_id = ? AND org_id = ?`,
            [label || null, address_line1, address_line2 || null, city, state || null, postal_code, country, address_id, userId, orgId]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Address not found" });
        res.json({ message: "Address updated successfully" });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: "Server error updating address" });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const userId = req.user_id;
        const orgId = req.org_id;

        const [result] = await pool.query(
            "DELETE FROM addresses WHERE address_id = ? AND user_id = ? AND org_id = ?",
            [address_id, userId, orgId]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Address not found" });
        res.json({ message: "Address deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting address" });
    }
};