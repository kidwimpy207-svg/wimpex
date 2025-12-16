// Upload routes: S3 presigned URLs and multipart uploads
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadLimiter } = require('../services/security');
const { getPresignedUploadUrl } = require('../services/s3');

// Get presigned upload URL
router.post('/presigned', authenticateToken, uploadLimiter, async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType required' });
    }

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (contentType.match(/^image\//)) {
      // Images max 50MB
      res.locals.maxSize = 50 * 1024 * 1024;
    }

    const result = await getPresignedUploadUrl(filename, contentType, 3600);
    if (!result.success) {
      return res.status(400).json({ error: result.message || result.error });
    }

    res.json({
      presignedUrl: result.presignedUrl,
      key: result.key,
      bucket: result.bucket,
      cdnUrl: `https://${result.bucket}.s3.amazonaws.com/${result.key}`, // Will be replaced by CloudFront if configured
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
