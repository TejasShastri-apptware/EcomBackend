const pool = require("../config/db");

exports.createCat = async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const orgId = req.org_id; // From middleware

        const [result] = await pool.query(
            "INSERT INTO categories (org_id, category_name, description) VALUES (?, ?, ?)",
            [orgId, category_name, description]
        );

        res.status(201).json({
            category_id: result.insertId,
            org_id: orgId,
            category_name,
            message: "Category created successfully"
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Category name already exists in this organization" });
        }
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const orgId = req.org_id;
        const [rows] = await pool.query(
            "SELECT * FROM categories WHERE org_id = ? ORDER BY category_name ASC",
            [orgId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: "Error fetching categories" });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.org_id;

        const [rows] = await pool.query(
            "SELECT * FROM categories WHERE category_id = ? AND org_id = ?",
            [id, orgId]
        );

        if (rows.length === 0) return res.status(404).json({ message: "Category not found" });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ message: "Error fetching category" });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, description } = req.body;
        const orgId = req.org_id;

        const [results] = await pool.query(
            "UPDATE categories SET category_name = ?, description = ? WHERE category_id = ? AND org_id = ?",
            [category_name, description, id, orgId]
        );

        if (results.affectedRows === 0) return res.status(404).json({ message: "Category not found or not owned by you" });
        res.status(200).json({ message: "Category Updated" });
    } catch (e) {
        res.status(500).json({ message: "Error updating category" });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.org_id;

        const [result] = await pool.query(
            "DELETE FROM categories WHERE category_id = ? AND org_id = ?", 
            [id, orgId]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Category Not Found" });
        res.status(200).json({ message: `Category(${id}) Deleted` });
    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                message: "This category contains products and cannot be deleted. Move products first."
            });
        }
        res.status(500).json({ message: "Error deleting category" });
    }
};