import { Tag } from "../models/Tag.js";

/**
 * POST /tags/
 */
const createTag = async (req, res) => {
  try {
    const { tag_name, tag_type } = req.body;
    const orgId = req.org_id;

    const tagId = await Tag.create(orgId, { tag_name, tag_type });

    res.status(201).json({ tag_id: tagId, tag_name, tag_type });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "Tag already exists in this organization" });
    }
    console.error("Error in createTag:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /tags/org
 */
const getOrgTags = async (req, res) => {
  try {
    const orgId = req.org_id;
    const rows = await Tag.findAllByOrg(orgId);
    res.json(rows);
  } catch (error) {
    console.error("Error in getOrgTags:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /tags/all
 */
const getAllTags = async (req, res) => {
  try {
    const rows = await Tag.findAllGlobal();
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllTags:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  createTag,
  getOrgTags,
  getAllTags
};