const cloudinary = require('./cnary');
const pool = require('../config/db');

/**
 * POST /api/upload/product/:product_id
 * Accepts multipart/form-data with field "image".
 * Uploads to Cloudinary → saves to product_images table → syncs products.image_url if primary.
 * Query params: ?is_primary=true (optional)
 */
exports.uploadProductImage = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { product_id } = req.params;
        const orgId = req.org_id;
        const is_primary = req.query.is_primary === 'true' || req.body.is_primary === 'true';

        // Verify product belongs to this org
        const [prodCheck] = await connection.query(
            'SELECT product_id FROM products WHERE product_id = ? AND org_id = ?',
            [product_id, orgId]
        );
        if (prodCheck.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Upload buffer to Cloudinary
        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
            folder: `furn/products/${product_id}`,
            resource_type: 'image',
        });

        console.log("Image upload result : ", uploadResult);

        const imageUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;

        // Check if this is the first image → auto-primary
        const [existing] = await connection.query(
            'SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = ?',
            [product_id]
        );
        const makeItPrimary = is_primary || existing[0].cnt === 0;

        if (makeItPrimary) {
            await connection.query(
                'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
                [product_id]
            );
            // Keep products.image_url in sync for backward compat
            await connection.query(
                'UPDATE products SET image_url = ? WHERE product_id = ? AND org_id = ?',
                [imageUrl, product_id, orgId]
            );
        }

        const [result] = await connection.query(
            'INSERT INTO product_images (product_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)',
            [product_id, imageUrl, existing[0].cnt, makeItPrimary]
        );

        await connection.commit();

        res.status(201).json({
            image_id: result.insertId,
            image_url: imageUrl,
            public_id: publicId,
            is_primary: makeItPrimary,
            message: 'Image uploaded successfully',
        });
    } catch (error) {
        await connection.rollback();
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message || 'Image upload failed' });
    } finally {
        connection.release();
    }
};