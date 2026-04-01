import cloudinary from './cnary.js';
import { Product } from '../models/Product.js';
import pool from '../config/db.js';

/**
 * POST /api/upload/product/:product_id
 * Multipart/form-data handler.
 */
const uploadProductImage = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { product_id } = req.params;
        const orgId = req.org_id;
        const is_primary = req.query.is_primary === 'true' || req.body.is_primary === 'true';

        // 1. Verify existence & ownership via Model
        const prodCheck = await Product.findByIdUnderOrg(product_id, orgId);
        if (!prodCheck) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 2. Cloudinary Upload
        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
            folder: `furn/products/${product_id}`,
            resource_type: 'image',
        });

        const imageUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;

        // 3. Save to database via Model (handles primary logic internally)
        // Note: The model's images.add method already handles is_primary logic
        const imageId = await Product.images.add(product_id, orgId, {
            image_url: imageUrl,
            is_primary: is_primary
        }, connection);

        await connection.commit();

        res.status(201).json({
            image_id: imageId,
            image_url: imageUrl,
            public_id: publicId,
            is_primary: is_primary || false, // The client might want to know if it ended up being primary
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

export default uploadProductImage;