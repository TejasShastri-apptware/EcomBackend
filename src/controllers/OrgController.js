const pool = require("../config/db");

exports.createOrganization = async (req, res) => {
    try {
        const { org_name, org_contact, org_email } = req.body;

        const [result] = await pool.query(
            "INSERT INTO organization (org_name, org_contact, org_email) VALUES (?, ?, ?)",
            [org_name, org_contact, org_email]
        );

        res.status(201).json({
            org_id: result.insertId,
            org_name,
            org_contact,
            org_email
        });
    } catch (e) {
        console.error("Error in createOrganization:", e);
        res.status(500).json({ message: "Error creating org" });
    }
}


exports.getAllOrganizations = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM organization");
        res.json(rows);
    } catch (e) {
        console.error("Error in getAllOrganizations:", e);
        res.status(500).json({ message: "Error getting all orgs" });
    }
}


exports.getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT * FROM organization WHERE org_id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Org not found" });
        res.json(rows[0]);
    } catch (e) {
        console.error("Error in getOrganizationById:", e);
        res.status(500).json({ message: "Error getting org by id" });
    }
}

/**
 * Resolve an org by slug (maps to org_name — the unique human-readable identifier).
 * Used by the frontend to translate a URL slug into an org_id before making
 * tenant-scoped API calls.
 * Route: GET /api/orgs/resolve/:slug
 */
exports.getOrgBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const [rows] = await pool.query(
            "SELECT org_id, org_name, org_email, org_contact FROM organization WHERE org_name = ?",
            [slug]
        );
        if (rows.length === 0) return res.status(404).json({ message: "Organization not found" });
        res.json(rows[0]);
    } catch (e) {
        console.error("Error in getOrgBySlug:", e);
        res.status(500).json({ message: "Error resolving org slug" });
    }
}