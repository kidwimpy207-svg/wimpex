// Upload routes: S3 presigned URLs and multipart uploads
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadLimiter } = require('../services/security');
const { getPresignedUploadUrl } = require('../services/s3');
const { state, save } = require('../services/store');
const fs = require('fs');
const path = require('path');
const { MEDIA_DIR } = require('../services/store');

// Save uploaded image metadata (crop, originalUrl, user)
router.post('/save-image-meta', authenticateToken, async (req, res) => {
  try {
    const { url, crop } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const id = require('crypto').randomBytes(6).toString('hex');
    state.images[id] = {
      id,
      userId: req.user.userId,
      url,
      crop: crop || null,
      timestamp: Date.now()
    };
    save.images();
    res.json({ success: true, id, image: state.images[id] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Fallback endpoint: accept data URLs and save to server media directory
router.post('/cdn', authenticateToken, async (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!data) return res.status(400).json({ error: 'data required' });

    // data expected to be a data URL
    const match = String(data).match(/^data:(.+?);base64,(.*)$/);
    if (!match) return res.status(400).json({ error: 'Invalid data URL' });
    const mime = match[1];
    const b64 = match[2];
    const ext = (mime.split('/')[1] || 'bin').split('+')[0];
    const safeName = (filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const outName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}.${ext}`;
    const outPath = path.join(MEDIA_DIR, outName);
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buf);

    const publicUrl = `/media/${encodeURIComponent(outName)}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error('CDN upload error', err);
    return res.status(500).json({ error: 'Failed to save file' });
  }
});
