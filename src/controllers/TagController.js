const pool = require("../config/db");

exports.createTag = async (req, res) => {
    try {
        const { tag_name, tag_type } = req.body;
        const orgId = req.org_id;

        const [result] = await pool.query(
            "INSERT INTO tags (org_id, tag_name, tag_type) VALUES (?, ?, ?)",
            [orgId, tag_name, tag_type]
        );

        res.status(201).json({ tag_id: result.insertId, tag_name, tag_type });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Tag already exists in this organization" });
        }
        res.status(500).json({ message: "Server error" });
    }
};

exports.getOrgTags = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM tags WHERE org_id = ?",
            [req.org_id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.getAllTags = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM tags"
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};