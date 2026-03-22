const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { v2: cloudinary } = require('cloudinary');
const stream  = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only image files are allowed'),
       allowed.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/upload/image
router.post('/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const url = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'echoguitars', resource_type: 'image' },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      const s = new stream.PassThrough();
      s.end(req.file.buffer);
      s.pipe(uploadStream);
    });

    res.json({ url });
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
