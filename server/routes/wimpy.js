const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// Use shared safe fetch helper (prefers global.fetch on Node 18+, falls back to node-fetch v2)
const fetchFn = require('../utils/fetch');

function genId() { return 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function extractTextFromOpenRouter(json) {
  try {
    if (!json) return null;
    if (json.choices && Array.isArray(json.choices) && json.choices[0] && json.choices[0].message) {
      const m = json.choices[0].message;
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) return m.content.map(c => c.text || c).join('\n');
    }
    if (json.output && typeof json.output === 'string') return json.output;
    if (json.result && typeof json.result === 'string') return json.result;
    return JSON.stringify(json).slice(0, 1500);
  } catch (e) { return null; }
}

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

// Create or append to a wimpy conversation
router.post('/message', authenticateToken, async (req, res) => {
  const { conversationId, text, media } = req.body;
  if (!text && !media) return res.status(400).json({ error: 'text or media required' });

  const convoId = conversationId || (`conv_${req.user.userId}`);
  if (!state.wimpyConversations[convoId]) state.wimpyConversations[convoId] = { conversationId: convoId, messages: [] };

  const userMsg = { id: genId(), from: req.user.userId, text: text || null, media: media || null, ts: Date.now() };
  state.wimpyConversations[convoId].messages.push(userMsg);
  save.wimpyConversations();

  // If OPENROUTER_API_KEY not set, return canned reply
  if (!process.env.OPENROUTER_API_KEY) {
    const reply = { id: genId(), from: 'wimpy', text: `Hi ${req.user.userId}, I received your message: ${text ? text.substring(0,120) : '[media]'}`, ts: Date.now() };
    state.wimpyConversations[convoId].messages.push(reply);
    save.wimpyConversations();
    return res.json({ conversationId: convoId, reply });
  }

  try {
    if (!fetchFn) {
      console.warn('Wimpy: fetch not available; falling back to canned reply. Install node-fetch or run Node 18+ for provider support.');
      const reply = { id: genId(), from: 'wimpy', text: `Hi ${req.user.userId}, I received your message: ${text ? text.substring(0,120) : '[media]'}`, ts: Date.now() };
      state.wimpyConversations[convoId].messages.push(reply);
      save.wimpyConversations();
      return res.json({ conversationId: convoId, reply, fallback: true });
    }

    const endpoint = process.env.OPENROUTER_ENDPOINT || 'https://api.openrouter.ai/v1/chat/completions';

    let mediaUrl = null;
    if (media && String(media).startsWith('data:')) {
      mediaUrl = saveDataUrlToMedia(media, 'wimpy');
    } else if (media && String(media).startsWith('/media')) {
      mediaUrl = media;
    } else if (media && String(media).startsWith('http')) {
      mediaUrl = media;
    }

    const messages = [{ role: 'user', content: text || '' }];
    if (mediaUrl) messages.push({ role: 'user', content: `User attached media: ${mediaUrl}` });

    const body = {
      model: process.env.OPENROUTER_MODEL || 'gpt-4o-mini',
      messages
    };

    const r = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    let j = null;
    try {
      // If response is not JSON, capture text for debugging
      const ct = r.headers && r.headers.get ? r.headers.get('content-type') : null;
      if (!r.ok) {
        const txt = await (r.text ? r.text() : Promise.resolve(''));
        console.error('OpenRouter returned error', r.status, txt);
        return res.status(502).json({ error: 'OpenRouter error', status: r.status, body: txt });
      }
      if (ct && ct.indexOf('application/json') === -1) {
        const txt = await r.text();
        console.error('OpenRouter returned non-json response', txt.slice(0,1000));
        return res.status(502).json({ error: 'OpenRouter returned non-json', body: txt });
      }
      j = await r.json().catch(() => null);
    } catch (e) {
      console.error('Failed parsing OpenRouter response', e && e.stack ? e.stack : e);
      return res.status(502).json({ error: 'Failed to parse OpenRouter response' });
    }
    let replyText = extractTextFromOpenRouter(j) || null;
    if (!replyText) replyText = j ? JSON.stringify(j).slice(0,1500) : 'No reply from OpenRouter';

    const reply = { id: genId(), from: 'wimpy', text: replyText, ts: Date.now() };
    state.wimpyConversations[convoId].messages.push(reply);
    save.wimpyConversations();
    return res.json({ conversationId: convoId, reply, raw: j });
  } catch (e) {
    console.error('Wimpy forward error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'Failed to contact OpenRouter', detail: String(e && e.message ? e.message : e) });
  }
});

router.get('/conversations', authenticateToken, (req, res) => {
  const convos = Object.values(state.wimpyConversations).filter(c => c.messages.some(m => m.from === req.user.userId || m.from === 'wimpy'));
  res.json(convos);
});

router.get('/conversations/:id', authenticateToken, (req, res) => {
  const c = state.wimpyConversations[req.params.id];
  if (!c) return res.status(404).json({ error: 'Conversation not found' });
  res.json(c);
});

module.exports = router;
