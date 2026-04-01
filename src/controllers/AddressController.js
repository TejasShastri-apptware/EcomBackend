import { Address } from "../models/Address.js";
import pool from "../config/db.js";

/**
 * POST /addresses/
 */
const addAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orgId = req.org_id;
        const userId = req.user_id;

        const {
            label, address_line1, address_line2, city,
            state, postal_code, country, is_default
        } = req.body;

        if (is_default) {
            await Address.setDefault(null, userId, orgId, connection);
        }

        const addressId = await Address.create({
            org_id: orgId,
            user_id: userId,
            label,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            is_default: !!is_default
        }, connection);

        await connection.commit();
        res.status(201).json({ address_id: addressId, message: "Address added successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error adding address:", error);
        res.status(500).json({ message: "Server error adding address" });
    } finally {
        connection.release();
    }
};

/**
 * GET /addresses/user/:user_id
 */
const getUserAddresses = async (req, res) => {
    try {
        const { user_id } = req.params;
        const orgId = req.org_id;

        const rows = await Address.findByUser(user_id, orgId);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching user addresses:", error);
        res.status(500).json({ message: "Error fetching addresses" });
    }
};

/**
 * PUT /addresses/set-default/:address_id
 */
const setDefaultAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { address_id } = req.params;
        const userId = req.user_id;
        const orgId = req.org_id;

        const updated = await Address.setDefault(address_id, userId, orgId, connection);
        if (!updated) throw new Error("Address not found");

        await connection.commit();
        res.json({ message: "Default address updated" });
    } catch (error) {
        await connection.rollback();
        console.error("Error in setDefaultAddress:", error);
        res.status(500).json({ message: error.message || "Error setting default address" });
    } finally {
        connection.release();
    }
};

/**
 * PUT /addresses/:address_id
 */
const updateAddress = async (req, res) => {
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

        const updated = await Address.update(address_id, orgId, {
            label: label || null,
            address_line1,
            address_line2: address_line2 || null,
            city,
            state: state || null,
            postal_code,
            country,
            user_id: userId // Ensure ownership check still works via the WHERE clause if implemented in the model
        });

        if (!updated) return res.status(404).json({ message: "Address not found" });
        res.json({ message: "Address updated successfully" });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: "Server error updating address" });
    }
};

/**
 * DELETE /addresses/:address_id
 */
const deleteAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const userId = req.user_id;
        const orgId = req.org_id;

        const deleted = await Address.delete(address_id, orgId);

        if (!deleted) return res.status(404).json({ message: "Address not found" });
        res.json({ message: "Address deleted" });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ message: "Error deleting address" });
    }
};

export default {
    addAddress,
    getUserAddresses,
    setDefaultAddress,
    updateAddress,
    deleteAddress
};