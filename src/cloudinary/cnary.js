import dotenv from "dotenv";
dotenv.config();

import cloudinary from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true,
});

// Verification logs
console.log('--- Cloudinary Config ---');
console.log('Cloud Name:', process.env.CLOUDINARY_NAME || 'MISSING');
console.log('API Key:', process.env.CLOUDINARY_KEY ? '****' + process.env.CLOUDINARY_KEY.slice(-4) : 'MISSING');
console.log('API Secret:', process.env.CLOUDINARY_SECRET ? 'PRESENT' : 'MISSING');
console.log('-------------------------');

export default cloudinary;