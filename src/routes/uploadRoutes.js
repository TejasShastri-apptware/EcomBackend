const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../cloudinary/ImageController');
const injectContext = require('../middleware/injectContext');

// Store file in memory buffer (no temp disk writes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// POST /api/upload/product/:product_id
// Accepts a single "image" field in multipart/form-data
router.post('/product/:product_id', injectContext, upload.single('image'), imageController.uploadProductImage);

module.exports = router;
