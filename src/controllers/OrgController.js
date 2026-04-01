import { Org } from "../models/Org.js";

/**
 * POST /org/
 */
const createOrganization = async (req, res) => {
    try {
        const { org_name, org_contact, org_email } = req.body;

        const orgId = await Org.create({ org_name, org_contact, org_email });

        res.status(201).json({
            org_id: orgId,
            org_name,
            org_contact,
            org_email
        });
    } catch (error) {
        console.error("Error in createOrganization:", error);
        res.status(500).json({ message: "Error creating org" });
    }
};

/**
 * GET /org/
 */
const getAllOrganizations = async (req, res) => {
    try {
        const rows = await Org.findAll();
        res.json(rows);
    } catch (error) {
        console.error("Error in getAllOrganizations:", error);
        res.status(500).json({ message: "Error getting all orgs" });
    }
};

/**
 * GET /org/:id
 */
const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;
        const org = await Org.findById(id);

        if (!org) {
            return res.status(404).json({ message: "Org not found" });
        }

        res.json(org);
    } catch (error) {
        console.error("Error in getOrganizationById:", error);
        res.status(500).json({ message: "Error getting org by id" });
    }
};


const getOrgBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const org = await Org.findByName(slug);

        if (!org) {
            return res.status(404).json({ message: "Organization not found" });
        }

        res.json(org);
    } catch (error) {
        console.error("Error in getOrgBySlug:", error);
        res.status(500).json({ message: "Error resolving org slug" });
    }
};

export default {
    createOrganization,
    getAllOrganizations,
    getOrganizationById,
    getOrgBySlug
};