const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const fetchFn = require('../utils/fetch');
const { MEDIA_DIR } = require('../services/store');

function safeFilename(base, ext) {
  const b = (base || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0,40);
  return `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${b}.${ext}`;
}

// Generate an image from prompt (uses provider if configured, otherwise falls back to a placeholder)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, size = 512 } = req.body || {};
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'prompt required' });

    const intSize = parseInt(size, 10) || 512;
    // If an OpenAI-style key is available, attempt to call provider
      if (process.env.OPENAI_API_KEY && fetchFn) {
      try {
        const endpoint = 'https://api.openai.com/v1/images/generations';
        const body = { prompt: String(prompt), n: 1, size: `${intSize}x${intSize}` };
          const r = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(body)
        });
        const j = await r.json().catch(() => null);
        // OpenAI may return a URL or base64; look for b64_json first
        if (j && j.data && j.data[0]) {
          if (j.data[0].b64_json) {
            const b64 = j.data[0].b64_json;
            const buf = Buffer.from(b64, 'base64');
            const outName = safeFilename('gen', 'png');
            const outPath = path.join(MEDIA_DIR, outName);
            fs.writeFileSync(outPath, buf);
            return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}`, raw: j });
          }
          if (j.data[0].url) {
            // fetch remote URL and save
            const imageResp = await fetchFn(j.data[0].url);
            const buf = Buffer.from(await imageResp.arrayBuffer());
            const outName = safeFilename('gen', 'png');
            const outPath = path.join(MEDIA_DIR, outName);
            fs.writeFileSync(outPath, buf);
            return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}`, raw: j });
          }
        }
        // fallback: return raw response for debugging
        return res.status(502).json({ error: 'Bad response from image provider', raw: j });
      } catch (err) {
        console.error('Image provider error', err);
        // continue to placeholder fallback
      }
    }

    // Fallback: use a placeholder image service and save locally
    const text = encodeURIComponent(String(prompt).slice(0, 40));
    const placeholder = `https://via.placeholder.com/${intSize}x${intSize}.png?text=${text}`;
    if (!fetchFn) return res.status(500).json({ error: 'Server has no fetch implementation' });
    const r = await fetchFn(placeholder);
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch placeholder' });
    const buf = Buffer.from(await r.arrayBuffer());
    const outName = safeFilename('placeholder', 'png');
    const outPath = path.join(MEDIA_DIR, outName);
    fs.writeFileSync(outPath, buf);
    return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}` });

  } catch (err) {
    console.error('Generate image error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Public generation endpoint (no auth) for demo / quick use; same behavior as /generate
router.post('/generate-public', async (req, res) => {
  try {
    // Delegate to same logic by reusing body parameters
    const { prompt, size } = req.body || {};
    // reuse the same handler logic by calling the internal function path (simple inline copy)
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'prompt required' });
    const intSize = parseInt(size, 10) || 512;
    if (process.env.OPENAI_API_KEY && fetchFn) {
      try {
        const endpoint = 'https://api.openai.com/v1/images/generations';
        const body = { prompt: String(prompt), n: 1, size: `${intSize}x${intSize}` };
          const r = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(body)
        });
        const j = await r.json().catch(() => null);
        if (j && j.data && j.data[0]) {
          if (j.data[0].b64_json) {
            const b64 = j.data[0].b64_json;
            const buf = Buffer.from(b64, 'base64');
            const outName = safeFilename('gen', 'png');
            const outPath = path.join(MEDIA_DIR, outName);
            fs.writeFileSync(outPath, buf);
            return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}`, raw: j });
          }
          if (j.data[0].url) {
            const imageResp = await fetchFn(j.data[0].url);
            const buf = Buffer.from(await imageResp.arrayBuffer());
            const outName = safeFilename('gen', 'png');
            const outPath = path.join(MEDIA_DIR, outName);
            fs.writeFileSync(outPath, buf);
            return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}`, raw: j });
          }
        }
        return res.status(502).json({ error: 'Bad response from image provider', raw: j });
      } catch (err) {
        console.error('Image provider error', err);
      }
    }
    const text = encodeURIComponent(String(prompt).slice(0, 40));
    const placeholder = `https://via.placeholder.com/${intSize}x${intSize}.png?text=${text}`;
    if (!fetchFn) return res.status(500).json({ error: 'Server has no fetch implementation' });
    const r = await fetchFn(placeholder);
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch placeholder' });
    const buf = Buffer.from(await r.arrayBuffer());
    const outName = safeFilename('placeholder', 'png');
    const outPath = path.join(MEDIA_DIR, outName);
    fs.writeFileSync(outPath, buf);
    return res.json({ ok: true, url: `/media/${encodeURIComponent(outName)}` });
  } catch (err) {
    console.error('Generate-public error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

module.exports = router;
