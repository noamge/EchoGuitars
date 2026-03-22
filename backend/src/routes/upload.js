const express = require('express');
const router = express.Router();
const multer = require('multer');
const stream = require('stream');
const { google } = require('googleapis');

// Use memory storage — we pipe directly to Drive, no local disk needed
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only image files are allowed'),
       allowed.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

// POST /api/upload/image
router.post('/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const drive = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Pipe the buffer into a readable stream for Drive
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const fileRes = await drive.files.create({
      requestBody: {
        name: `guitar_${Date.now()}_${req.file.originalname}`,
        parents: folderId ? [folderId] : [],
      },
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id',
    });

    const fileId = fileRes.data.id;

    // Make the file publicly viewable
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const url = `https://drive.google.com/file/d/${fileId}/view`;
    res.json({ url, fileId });
  } catch (err) {
    console.error('Drive upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
