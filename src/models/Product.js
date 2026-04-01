import pool from "../config/db.js";

export const Product = {
 
  findAllGlobal: async () => {
    const [rows] = await pool.query(`
      SELECT p.*, c.category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = TRUE
      ORDER BY p.created_at DESC
    `);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );
    return rows[0];
  },

 
  findByOrg: async (orgId) => {
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
    return rows;
  },

  findByIdUnderOrg: async (id, orgId) => {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE product_id = ? AND org_id = ?", 
      [id, orgId]
    );
    return rows[0];
  },


  findByTags: async (orgId, tagIds) => {
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
    return rows;
  },

  search: async (orgId, { keyword, category_id, min_price, max_price }) => {
    let query = "SELECT * FROM products WHERE org_id = ? AND is_active = TRUE";
    let params = [orgId];

    if (keyword) {
      query += " AND (name LIKE ? OR description LIKE ?)";
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
    return rows;
  },

  /**
   * Create a new product
   */
  create: async (data, connection = pool) => {
    const [result] = await connection.query(
      `INSERT INTO products 
       (org_id, category_id, name, description, price, discount_price, material, color, length, width, height, stock_quantity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.org_id, data.category_id, data.name, data.description, 
        data.price, data.discount_price, data.material, data.color, 
        data.length, data.width, data.height, data.stock_quantity
      ]
    );
    return result.insertId;
  },

  /**
   * Update product details
   */
  update: async (id, orgId, data, connection = pool) => {
    const [result] = await connection.query(
      "UPDATE products SET ? WHERE product_id = ? AND org_id = ?",
      [data, id, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Soft delete a product
   */
  softDelete: async (id, orgId) => {
    const [result] = await pool.query(
      "UPDATE products SET is_active = FALSE WHERE product_id = ? AND org_id = ?",
      [id, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Update stock quantity
   */
  updateStock: async (id, orgId, quantity) => {
    const [result] = await pool.query(
      "UPDATE products SET stock_quantity = ? WHERE product_id = ? AND org_id = ?", 
      [quantity, id, orgId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Tag Management
   */
  tags: {
    getForProduct: async (productId, orgId) => {
      const [rows] = await pool.query(`
        SELECT t.* 
        FROM tags t
        JOIN product_tags pt ON t.tag_id = pt.tag_id
        JOIN products p ON pt.product_id = p.product_id
        WHERE p.product_id = ? AND p.org_id = ?
      `, [productId, orgId]);
      return rows;
    },

    add: async (productId, tagId) => {
      await pool.query(
        "INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)",
        [productId, tagId]
      );
    },

    remove: async (productId, tagId) => {
      const [result] = await pool.query(
        "DELETE FROM product_tags WHERE product_id = ? AND tag_id = ?",
        [productId, tagId]
      );
      return result.affectedRows > 0;
    },

    sync: async (productId, tagIds, orgId, connection = pool) => {
      // Clear existing
      await connection.query("DELETE FROM product_tags WHERE product_id = ?", [productId]);

      if (tagIds && tagIds.length > 0) {
        // Verify tags belong to org
        const [validTags] = await connection.query(
          "SELECT tag_id FROM tags WHERE tag_id IN (?) AND org_id = ?",
          [tagIds, orgId]
        );

        if (validTags.length !== tagIds.length) {
          throw new Error("One or more Tag IDs are invalid or belong to another organization");
        }

        const tagRows = validTags.map(t => [productId, t.tag_id]);
        await connection.query(
          "INSERT INTO product_tags (product_id, tag_id) VALUES ?",
          [tagRows]
        );
      }
    }
  },

  /**
   * Image Management
   */
  images: {
    getAll: async (productId) => {
      const [rows] = await pool.query(
        "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC, image_id ASC",
        [productId]
      );
      return rows;
    },

    findById: async (imageId, productId) => {
      const [rows] = await connection.query(
        "SELECT image_id, image_url, is_primary FROM product_images WHERE image_id = ? AND product_id = ?",
        [imageId, productId]
      );
      return rows[0];
    },

    // Transactional image addition
    add: async (productId, orgId, { image_url, display_order = 0, is_primary = false }, connection = pool) => {
      // Check if this is the first image
      const [existing] = await connection.query(
        "SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = ?",
        [productId]
      );
      const makeItPrimary = is_primary || existing[0].cnt === 0;

      if (makeItPrimary) {
        // Unset existing primaries
        await connection.query(
          "UPDATE product_images SET is_primary = FALSE WHERE product_id = ?",
          [productId]
        );
        // Sync products.image_url
        await connection.query(
          "UPDATE products SET image_url = ? WHERE product_id = ? AND org_id = ?",
          [image_url, productId, orgId]
        );
      }

      const [result] = await connection.query(
        "INSERT INTO product_images (product_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)",
        [productId, image_url, display_order, makeItPrimary]
      );
      return result.insertId;
    },

    setPrimary: async (productId, orgId, imageId, connection = pool) => {
      const [imgCheck] = await connection.query(
        "SELECT image_url FROM product_images WHERE image_id = ? AND product_id = ?",
        [imageId, productId]
      );
      if (imgCheck.length === 0) throw new Error("Image not found");

      await connection.query(
        "UPDATE product_images SET is_primary = FALSE WHERE product_id = ?",
        [productId]
      );

      await connection.query(
        "UPDATE product_images SET is_primary = TRUE WHERE image_id = ? AND product_id = ?",
        [imageId, productId]
      );

      await connection.query(
        "UPDATE products SET image_url = ? WHERE product_id = ? AND org_id = ?",
        [imgCheck[0].image_url, productId, orgId]
      );
    },

    delete: async (productId, orgId, imageId, connection = pool) => {
      const [imgCheck] = await connection.query(
        "SELECT image_id, is_primary FROM product_images WHERE image_id = ? AND product_id = ?",
        [imageId, productId]
      );
      if (imgCheck.length === 0) throw new Error("Image not found");

      const wasPrimary = imgCheck[0].is_primary;
      await connection.query("DELETE FROM product_images WHERE image_id = ?", [imageId]);

      if (wasPrimary) {
        const [remaining] = await connection.query(
          "SELECT image_id, image_url FROM product_images WHERE product_id = ? ORDER BY display_order ASC, image_id ASC LIMIT 1",
          [productId]
        );
        if (remaining.length > 0) {
          await connection.query(
            "UPDATE product_images SET is_primary = TRUE WHERE image_id = ?",
            [remaining[0].image_id]
          );
          await connection.query(
            "UPDATE products SET image_url = ? WHERE product_id = ? AND org_id = ?",
            [remaining[0].image_url, productId, orgId]
          );
        } else {
          await connection.query(
            "UPDATE products SET image_url = NULL WHERE product_id = ? AND org_id = ?",
            [productId, orgId]
          );
        }
      }
    }
  }
};
