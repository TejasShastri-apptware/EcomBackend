const pool = require("../config/db");

exports.addAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orgId = req.org_id;
        const userId = req.user_id; // Injected by middleware — never trust body for identity
        const {
            address_line1, address_line2, city,
            state, postal_code, country, is_default
        } = req.body;

        if (is_default) {
            await connection.query(
                "UPDATE addresses SET is_default = FALSE WHERE user_id = ? AND org_id = ?",
                [userId, orgId]
            );
            const summary = `${address_line1}, ${city}, ${country}`;
            await connection.query(
                "UPDATE users SET default_shipping_address = ? WHERE user_id = ? AND org_id = ?",
                [summary, userId, orgId]
            );
        }

        const [result] = await connection.query(
            `INSERT INTO addresses 
            (org_id, user_id, address_line1, address_line2, city, state, postal_code, country, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orgId, userId, address_line1, address_line2, city, state, postal_code, country, is_default || false]
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
            "SELECT * FROM addresses WHERE user_id = ? AND org_id = ? ORDER BY is_default DESC",
            [user_id, orgId]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching addresses" });
    }
};

exports.setDefaultAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { address_id } = req.params;
        const { user_id } = req.body; // Would be to scope the unset operation
        const orgId = req.org_id;

        // Unset current defaults
        await connection.query(
            "UPDATE addresses SET is_default = FALSE WHERE user_id = ? AND org_id = ?",
            [user_id, orgId]
        );

        // Set new default
        const [result] = await connection.query(
            "UPDATE addresses SET is_default = TRUE WHERE address_id = ? AND user_id = ? AND org_id = ?",
            [address_id, user_id, orgId]
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

exports.deleteAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const orgId = req.org_id;

        const [result] = await pool.query(
            "DELETE FROM addresses WHERE address_id = ? AND org_id = ?",
            [address_id, orgId]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Address not found" });
        res.json({ message: "Address deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting address" });
    }
};