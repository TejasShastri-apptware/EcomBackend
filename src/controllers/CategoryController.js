import { Category } from "../models/Category.js";

/**
 * POST /categories/
 */
const createCat = async (req, res) => {
  try {
    const { category_name, description, image_url } = req.body;
    const orgId = req.org_id;

    const categoryId = await Category.create(orgId, { category_name, description, image_url });

    res.status(201).json({
      category_id: categoryId,
      org_id: orgId,
      category_name,
      message: "Category created successfully"
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "Category name already exists in this organization" });
    }
    console.error("Error in createCat:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * GET /categories/
 */
const getAllCategories = async (req, res) => {
  try {
    const orgId = req.org_id;
    const rows = await Category.findAllUnderOrg(orgId);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({ message: "Error fetching categories" });
  }
};

/**
 * GET /categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const category = await Category.findByIdUnderOrg(id, orgId);

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error(`Error in getCategoryById for ${req.params.id}:`, error);
    res.status(500).json({ message: "Error fetching category" });
  }
};

/**
 * PUT /categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;
    const orgId = req.org_id;

    const updated = await Category.update(id, orgId, { category_name, description });

    if (!updated) return res.status(404).json({ message: "Category not found or not owned by you" });
    res.status(200).json({ message: "Category Updated" });
  } catch (error) {
    console.error(`Error in updateCategory for ${req.params.id}:`, error);
    res.status(500).json({ message: "Error updating category" });
  }
};

/**
 * DELETE /categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const deleted = await Category.delete(id, orgId);

    if (!deleted) return res.status(404).json({ message: "Category Not Found" });
    res.status(200).json({ message: `Category(${id}) Deleted` });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        message: "This category contains products and cannot be deleted. Move products first."
      });
    }
    console.error(`Error in deleteCategory for ${req.params.id}:`, error);
    res.status(500).json({ message: "Error deleting category" });
  }
};

export default {
  createCat,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
