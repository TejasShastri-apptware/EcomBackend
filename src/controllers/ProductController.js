import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import pool from "../config/db.js";


const getAllProductsGlobal = async (req, res) => {
  try {
    const rows = await Product.findAllGlobal();
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllProductsGlobal:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllProductsUnderOrg = async (req, res) => {
  try {
    const orgId = req.org_id;
    const rows = await Product.findByOrg(orgId);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllProductsUnderOrg:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const getProductByIdUnderOrg = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;
    const product = await Product.findByIdUnderOrg(id, orgId);
    if (!product) return res.status(404).json({ message: "Product Not Found" });
    res.json(product);
  } catch (error) {
    console.error(`Error getting product by ID ${req.params.id} under org ${req.org_id}:`, error);
    res.status(500).json({ message: "Error getting product details" });
  }
};

/**
 * GET /products/tags?tags=1,2
 */
const getProductByTags = async (req, res) => {
  try {
    const orgId = req.org_id;
    const tagIds = req.query.tags ? req.query.tags.split(',').map(Number) : [];

    if (tagIds.length === 0) return res.status(400).json({ message: "No Tags provided for filtering" });

    const rows = await Product.findByTags(orgId, tagIds);
    res.json(rows);
  } catch (error) {
    console.error("Issue fetching product by tags:", error);
    res.status(500).json({ message: "Error fetching products by tags" });
  }
};

/**
 * POST /products/with-tags
 */
const createProductWithTags = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orgId = req.org_id;
    const {
      category_id, name, description, price, discount_price,
      material, color, length, width, height,
      stock_quantity, tag_ids
    } = req.body;

    const catCheck = await Category.findByIdUnderOrg(category_id, orgId);
    if (!catCheck) throw new Error("Invalid category for this organization");

    const productId = await Product.create({
      org_id: orgId, category_id, name, description, price, discount_price,
      material, color, length, width, height, stock_quantity
    }, connection);

    if (tag_ids && tag_ids.length > 0) {
      await Product.tags.sync(productId, tag_ids, orgId, connection);
    }

    await connection.commit();
    res.status(201).json({ product_id: productId, message: "Product and tags created successfully" });

  } catch (error) {
    await connection.rollback();
    res.status(400).json({ message: error.message || "Failed to create product" });
  } finally {
    connection.release();
  }
};

/**
 * PUT /products/:id
 */
const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orgId = req.org_id;
    const { id } = req.params;
    const { tag_ids, ...updateData } = req.body;

    delete updateData.org_id;
    delete updateData.product_id;

    const updated = await Product.update(id, orgId, updateData, connection);
    if (!updated) throw new Error("Product not found");

    if (tag_ids !== undefined) {
      await Product.tags.sync(id, tag_ids, orgId, connection);
    }

    await connection.commit();
    res.json({ message: "Product and tags updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateProduct:", error);
    res.status(error.message === "Product not found" ? 404 : 500).json({ message: error.message || "Server error" });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const orgId = req.org_id;
    const { id } = req.params;
    const deleted = await Product.softDelete(id, orgId);

    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: `Product ${id} deleted(soft) under org ${orgId}.` });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Could not soft delete the product" });
  }
};

/**
 * PUT /products/updateStock/:id
 */
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const orgId = req.org_id;

    const updated = await Product.updateStock(id, orgId, quantity);
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: `Stock updated for product ${id} ; New Stock : ${quantity}` });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Could not update stock" });
  }
};

/**
 * GET /products/search
 */
const searchProduct = async (req, res) => {
  try {
    const orgId = req.org_id;
    const rows = await Product.search(orgId, req.query);
    res.json(rows);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Error searching products" });
  }
};

/**
 * GET /products/:id/tags
 */
const getProductTags = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;
    const rows = await Product.tags.getForProduct(id, orgId);
    res.json(rows);
  } catch (error) {
    console.error("Error in getProductTags:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /products/:id/tags
 */
const addTagToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_id } = req.body;
    const orgId = req.org_id;

    // Check product
    const product = await Product.findByIdUnderOrg(id, orgId);
    if (!product) return res.status(404).json({ message: "Product not found in this organization" });

    // Assuming a Tag model would exist, but let's use Product.tags logic or check it manually
    // For simplicity, let's just use the direct model method
    await Product.tags.add(id, tag_id);

    res.status(201).json({ message: "Tag added to product successfully" });
  } catch (error) {
    console.error("Error in addTagToProduct:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /products/:id/tags/:tag_id
 */
const removeTagFromProduct = async (req, res) => {
  try {
    const { id, tag_id } = req.params;
    const orgId = req.org_id;

    const product = await Product.findByIdUnderOrg(id, orgId);
    if (!product) return res.status(404).json({ message: "Product not found in this organization" });

    const removed = await Product.tags.remove(id, tag_id);
    if (!removed) return res.status(404).json({ message: "Tag is not associated with this product" });

    res.json({ message: "Tag removed from product successfully" });
  } catch (error) {
    console.error("Error in removeTagFromProduct:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /products/:id/images
 */
const getProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const prodCheck = await Product.findByIdUnderOrg(id, orgId);
    if (!prodCheck) return res.status(404).json({ message: "Product not found" });

    const rows = await Product.images.getAll(id);
    res.json(rows);
  } catch (error) {
    console.error("Error in getProductImages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /products/:id/images
 */
const addProductImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const orgId = req.org_id;
    const { image_url, display_order = 0, is_primary = false } = req.body;

    if (!image_url) return res.status(400).json({ message: "image_url is required" });

    const prodCheck = await Product.findByIdUnderOrg(id, orgId);
    if (!prodCheck) throw new Error("Product not found");

    const imageId = await Product.images.add(id, orgId, { image_url, display_order, is_primary }, connection);

    await connection.commit();
    res.status(201).json({ image_id: imageId, message: "Image added" });
  } catch (error) {
    await connection.rollback();
    console.error("Error in addProductImage:", error);
    res.status(500).json({ message: error.message || "Server error" });
  } finally {
    connection.release();
  }
};

/**
 * PUT /products/:id/images/:image_id/set-primary
 */
const setPrimaryImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id, image_id } = req.params;
    const orgId = req.org_id;

    const prodCheck = await Product.findByIdUnderOrg(id, orgId);
    if (!prodCheck) throw new Error("Product not found");

    await Product.images.setPrimary(id, orgId, image_id, connection);

    await connection.commit();
    res.json({ message: "Primary image updated" });
  } catch (error) {
    await connection.rollback();
    console.error("Error in setPrimaryImage:", error);
    res.status(500).json({ message: error.message || "Server error" });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /products/:id/images/:image_id
 */
const deleteProductImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id, image_id } = req.params;
    const orgId = req.org_id;

    const prodCheck = await Product.findByIdUnderOrg(id, orgId);
    if (!prodCheck) throw new Error("Product not found");

    await Product.images.delete(id, orgId, image_id, connection);

    await connection.commit();
    res.json({ message: "Image deleted" });
  } catch (error) {
    await connection.rollback();
    console.error("Error in deleteProductImage:", error);
    res.status(500).json({ message: error.message || "Server error" });
  } finally {
    connection.release();
  }
};

export default {
  getAllProductsGlobal,
  getAllProductsUnderOrg,
  searchProduct,
  getProductByTags,
  getProductByIdUnderOrg,
  getProductTags,
  createProductWithTags,
  updateStock,
  updateProduct,
  deleteProduct,
  addTagToProduct,
  removeTagFromProduct,
  getProductImages,
  addProductImage,
  setPrimaryImage,
  deleteProductImage
};