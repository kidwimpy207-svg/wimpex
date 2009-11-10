const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// Use global fetch when available (Node 18+), otherwise try node-fetch
let fetchFn = null;
if (typeof fetch === 'function') fetchFn = fetch.bind(global); else {
  try { fetchFn = require('node-fetch'); } catch (e) { fetchFn = null; }
}

function extractTextFromGLResponse(json) {
  try {
    if (!json) return null;
    // common layout: candidates -> content -> parts -> { text }
    if (Array.isArray(json.candidates) && json.candidates.length) {
      for (const cand of json.candidates) {
        if (cand.content && Array.isArray(cand.content)) {
          for (const block of cand.content) {
            if (block.parts && Array.isArray(block.parts)) {
              for (const p of block.parts) {
                if (p.text) return p.text;
              }
            }
            if (block.type === 'output_text' && block.text) return block.text;
          }
        }
        if (cand.output) return String(cand.output);
      }
    }
    // fallback common fields
    if (json.outputText) return json.outputText;
    if (json.result && typeof json.result === 'string') return json.result;
    // deep scan for first reasonably-sized text string in object
    const queue = [json];
    while (queue.length) {
      const node = queue.shift();
      if (!node) continue;
      if (typeof node === 'string' && node.length > 0 && node.length < 5000) return node;
      if (typeof node === 'object') {
        for (const k of Object.keys(node)) queue.push(node[k]);
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Simple Gemini integration scaffold.
// If you set GEMINI_API_KEY env var, we will attempt to forward messages to the real Gemini API.
// Otherwise the route responds with a basic mock reply.

function genId() { return 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

const fs = require('fs');
const path = require('path');
const { MEDIA_DIR } = require('../services/store');

function saveDataUrlToMedia(dataUrl, preferredName) {
  if (!dataUrl) return null;
  const m = String(dataUrl).match(/^data:(.+?);base64,(.*)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const ext = (mime.split('/')[1] || 'bin').split('+')[0];
  const base = (preferredName || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');
  const outName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${base}.${ext}`;
  const outPath = path.join(MEDIA_DIR, outName);
  try {
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buf);
    return `/media/${encodeURIComponent(outName)}`;
  } catch (e) {
    console.error('Failed to save dataUrl to media', e);
    return null;
  }
}

// Create or append to a gemini conversation
router.post('/message', authenticateToken, async (req, res) => {
  const { conversationId, text, media } = req.body;
  if (!text && !media) return res.status(400).json({ error: 'text or media required' });

  // decide conversation id
  const convoId = conversationId || (`conv_${req.user.userId}`);
  if (!state.geminiConversations[convoId]) state.geminiConversations[convoId] = { conversationId: convoId, messages: [] };

  const userMsg = { id: genId(), from: req.user.userId, text: text || null, media: media || null, ts: Date.now() };
  state.geminiConversations[convoId].messages.push(userMsg);
  save.geminiConversations();

  // If env var not set, return a canned response
  if (!process.env.GEMINI_API_KEY) {
    const reply = { id: genId(), from: 'gemini', text: `Hi ${req.user.userId}, I received your message: ${text ? text.substring(0,120) : '[media]'}`, ts: Date.now() };
    state.geminiConversations[convoId].messages.push(reply);
    save.geminiConversations();
    return res.json({ conversationId: convoId, reply });
  }
  // Forward to Google's Generative Language API (non-streaming) using API key from env
  try {
    if (!fetchFn) return res.status(500).json({ error: 'Server does not support fetch. Install node-fetch or use Node 18+' });

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    // If media provided as data URL, save and get public URL
    let mediaUrl = null;
    if (media && String(media).startsWith('data:')) {
      mediaUrl = saveDataUrlToMedia(media, 'gemini');
    } else if (media && String(media).startsWith('/media')) {
      mediaUrl = media; // already public
    } else if (media && String(media).startsWith('http')) {
      mediaUrl = media;
    }

    // Prepare contents: primary text part, then optional media reference part
    const contents = [{ parts: [{ text: text || '' }] }];
    if (mediaUrl) {
      contents.push({ parts: [{ text: `User attached image: ${mediaUrl}` }] });
    }
    const body = { contents };

    const r = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    const j = await r.json().catch(() => null);
    let replyText = extractTextFromGLResponse(j) || null;

    if (!replyText) {
      // fallback: stringify a trimmed version
      replyText = j ? JSON.stringify(j).slice(0, 1500) : 'No reply from Gemini';
    }

    const reply = { id: genId(), from: 'gemini', text: replyText, ts: Date.now() };
    state.geminiConversations[convoId].messages.push(reply);
    save.geminiConversations();
    return res.json({ conversationId: convoId, reply, raw: j });
  } catch (e) {
    console.error('Gemini forward error', e);
    return res.status(500).json({ error: 'Failed to contact Gemini' });
  }
});

router.get('/conversations', authenticateToken, (req, res) => {
  // return all conversations for this user (where messages contain their userId)
  const convos = Object.values(state.geminiConversations).filter(c => c.messages.some(m => m.from === req.user.userId || m.from === 'gemini'));
  res.json(convos);
});

router.get('/conversations/:id', authenticateToken, (req, res) => {
  const c = state.geminiConversations[req.params.id];
  if (!c) return res.status(404).json({ error: 'Conversation not found' });
  res.json(c);
});

module.exports = router;
