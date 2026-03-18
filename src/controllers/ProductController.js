const pool = require("../config/db");


// All products in the table
exports.getAllProductsGlobal = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      where p.is_active = TRUE
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Global query
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Product not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// All products under an organization
exports.getAllProductsUnderOrg = async (req, res) => {
  try {
    const orgId = req.org_id;
    const [rows] = await pool.query(`
      SELECT p.*, c.category_name, 
             GROUP_CONCAT(t.tag_name) AS tags,
             GROUP_CONCAT(t.tag_id) AS tag_ids
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_tags pt ON p.product_id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.tag_id
      WHERE p.org_id = ? AND p.is_active = TRUE
      GROUP BY p.product_id
      ORDER BY p.created_at DESC
    `, [orgId]);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProductByIdUnderOrg = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;
    const [rows] = await pool.query(
      "SELECT * from products WHERE product_id = ? AND org_id = ?", [id, orgId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Product Not Found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error getting product by ID under org : ", id, " ", orgId);
    res.status(500).json({ message: "Error getting product by ID under org" });
  }
}

exports.getProductByTags = async (req, res) => {
  try {
    const orgId = req.org_id;
    const tagIds = req.query.tags ? req.query.tags.split(',').map(Number) : [];

    if (tagIds.length === 0) return res.status(400).json({ message: "No Tags provided for filtering" });

    // FLOW : Join with protags -> filter by org_id -> group by Product id -> use having count
    const [rows] = await pool.query(
      `
      SELECT p.*, c.category_name, GROUP_CONCAT(t.tag_name) AS tags
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN product_tags pt ON p.product_id = pt.product_id
      JOIN tags t ON pt.tag_id = t.tag_id
      WHERE p.org_id = ?
        AND p.is_active = TRUE 
        AND pt.tag_id IN (?)
      GROUP BY p.product_id
      HAVING COUNT(DISTINCT pt.tag_id) = ?
      ORDER BY p.created_at DESC
      `,
      [orgId, tagIds, tagIds.length]
    );

    res.json(rows);
  } catch (e) {
    console.error(`Issue fetching product by tags : ${tagIds}`, e);
    res.status(500).json({ message: "Error fetching products by tags" });
  }
}

// fuxk I forgot tags. Another function could be added I guess
exports.createProduct = async (req, res) => {
  try {
    const orgId = req.org_id;
    const {
      category_id, name, description, image_url,
      price, discount_price, material, color, length, width, height, stock_quantity
    } = req.body;

    const [catCheck] = await pool.query(
      "SELECT category_id FROM categories WHERE category_id = ? AND org_id = ?",
      [category_id, orgId]
    );
    if (catCheck.length === 0) return res.status(400).json({ message: "Category invalid for this organization" });

    const [result] = await pool.query(
      `INSERT INTO products 
            (org_id, category_id, name, description, price, discount_price, material, color, length, width, height, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orgId, category_id, name, description, price, discount_price, material, color, length, width, height, stock_quantity]
    );

    res.status(201).json({
      product_id: result.insertId,
      name,
      message: `Product added successfully under org ${orgId}`
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createProductWithTags = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orgId = req.org_id;
    const {
      category_id, name, description, price, discount_price,
      material, color, length, width, height,
      stock_quantity, tag_ids
    } = req.body;

    const [catCheck] = await connection.query(
      "SELECT category_id FROM categories WHERE category_id = ? AND org_id = ?",
      [category_id, orgId]
    );
    if (catCheck.length === 0) throw new Error("Invalid category for this organization");

    const [productResult] = await connection.query(
      `INSERT INTO products 
            (org_id, category_id, name, description, price, discount_price, material, color, length, width, height, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orgId, category_id, name, description, price, discount_price, material, color, length, width, height, stock_quantity]
    );
    const productId = productResult.insertId;

    if (tag_ids && tag_ids.length > 0) {
      const [validTags] = await connection.query(
        "SELECT tag_id FROM tags WHERE tag_id IN (?) AND org_id = ?",
        [tag_ids, orgId]
      );

      if (validTags.length !== tag_ids.length) {
        throw new Error("One or more Tag IDs are invalid or belong to another organization");
      }

      const tagRows = validTags.map(t => [productId, t.tag_id]);
      await connection.query(
        "INSERT INTO product_tags (product_id, tag_id) VALUES ?",
        [tagRows]
      );
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


exports.updateProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orgId = req.org_id;
    const { id } = req.params;
    const { tag_ids, ...updateData } = req.body;

    delete updateData.org_id;
    delete updateData.product_id;

    // 1. Update product details
    const [result] = await connection.query(
      "UPDATE products SET ? WHERE product_id = ? AND org_id = ?",
      [updateData, id, orgId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Product not found");
    }

    // 2. Sync Tags if tag_ids provided
    if (tag_ids !== undefined) {
      // Clear existing tags
      await connection.query("DELETE FROM product_tags WHERE product_id = ?", [id]);

      if (tag_ids && tag_ids.length > 0) {
        // Verify tags belong to org
        const [validTags] = await connection.query(
          "SELECT tag_id FROM tags WHERE tag_id IN (?) AND org_id = ?",
          [tag_ids, orgId]
        );

        if (validTags.length !== tag_ids.length) {
          throw new Error("One or more Tag IDs are invalid or belong to another organization");
        }

        const tagRows = validTags.map(t => [id, t.tag_id]);
        await connection.query(
          "INSERT INTO product_tags (product_id, tag_id) VALUES ?",
          [tagRows]
        );
      }
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

exports.deleteProduct = async (req, res) => {
  try {
    const orgId = req.org_id;
    const { id } = req.params;
    // soft deletion seems to be the way for now.
    // Order items depends on this, history fetching will break if I clean delete a product
    const [result] = await pool.query(
      "UPDATE products SET is_active = FALSE WHERE product_id = ? AND org_id = ?",
      [id, orgId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found, delete Product Endpoint" });
    res.status(200).json({ message: `Product ${id} deleted(soft) under org ${orgId}.` });
  } catch (e) {
    console.error("Error deleting PiD: ", e);
    res.status(500).json({ message: "Could not soft delete the product" });
  }
}


exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const orgId = req.org_id;

    const [result] = await pool.query(
      "UPDATE products SET stock_quantity = ? WHERE product_id = ? AND org_id = ?", [quantity, id, orgId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found, update Endpoint" });
    res.status(200).json({ message: `Stock updated for product ${id} ; New Stock : ${quantity}` });
  } catch (e) {
    console.error("Error updating stock: ", e);
    res.status(500).json({ message: "Could not update stock" });
  }
}



// Search, Filter and other queries to be done here:
exports.searchProduct = async (req, res) => {
  try {
    const orgId = req.org_id;
    const { keyword, category_id, min_price, max_price } = req.query;

    let query = "SELECT * FROM products WHERE org_id = ? AND is_active = TRUE";
    let params = [orgId];

    if (keyword) {
      query += " AND (name like ? OR description LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category_id) {
      query += " AND category_id = ?";
      params.push(category_id);
    }

    if (min_price) {
      query += " AND price >= ?";
      params.push(min_price);
    }

    if (max_price) {
      query += " AND price <= ?";
      params.push(max_price);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error("Error searching products: ", e);
    res.status(500).json({ message: "Error searching products, ProductController -> searchProduct" });
  }
}

// Get tags for a specific product
exports.getProductTags = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.org_id;

    const [rows] = await pool.query(`
      SELECT t.* 
      FROM tags t
      JOIN product_tags pt ON t.tag_id = pt.tag_id
      JOIN products p ON pt.product_id = p.product_id
      WHERE p.product_id = ? AND p.org_id = ?
    `, [id, orgId]);

    res.json(rows);
  } catch (error) {
    console.error("Error in getProductTags:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a tag to a product
exports.addTagToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_id } = req.body;
    const orgId = req.org_id;

    // Verify product belongs to org
    const [productCheck] = await pool.query(
      "SELECT product_id FROM products WHERE product_id = ? AND org_id = ?",
      [id, orgId]
    );
    if (productCheck.length === 0) return res.status(404).json({ message: "Product not found in this organization" });

    // Verify tag belongs to org
    const [tagCheck] = await pool.query(
      "SELECT tag_id FROM tags WHERE tag_id = ? AND org_id = ?",
      [tag_id, orgId]
    );
    if (tagCheck.length === 0) return res.status(400).json({ message: "Tag not found in this organization" });

    await pool.query(
      "INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)",
      [id, tag_id]
    );

    res.status(201).json({ message: "Tag added to product successfully" });
  } catch (error) {
    console.error("Error in addTagToProduct:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove a tag from a product
exports.removeTagFromProduct = async (req, res) => {
  try {
    const { id, tag_id } = req.params;
    const orgId = req.org_id;

    // Verify product belongs to org (implicit auth check)
    const [productCheck] = await pool.query(
      "SELECT product_id FROM products WHERE product_id = ? AND org_id = ?",
      [id, orgId]
    );
    if (productCheck.length === 0) return res.status(404).json({ message: "Product not found in this organization" });

    const [result] = await pool.query(
      "DELETE FROM product_tags WHERE product_id = ? AND tag_id = ?",
      [id, tag_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Tag is not associated with this product" });

    res.json({ message: "Tag removed from product successfully" });
  } catch (error) {
    console.error("Error in removeTagFromProduct:", error);
    res.status(500).json({ message: "Server error" });
  }
};