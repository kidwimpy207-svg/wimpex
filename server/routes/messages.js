const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const { sendPush } = require('../services/notification');

function genId() { return crypto.randomBytes(6).toString('hex'); }

router.get('/:userId', authenticateToken, (req, res) => {
    const convoId = [req.user.userId, req.params.userId].sort().join('-');
    const convoMessages = state.messages[convoId] || [];
    res.json(convoMessages);
});

router.post('/', authenticateToken, (req, res) => {
    const { toId, text } = req.body;
    if (!toId || !text) return res.status(400).json({ error: 'Missing fields' });

    const convoId = [req.user.userId, toId].sort().join('-');
    if (!state.messages[convoId]) state.messages[convoId] = [];

    const msg = {
        id: genId(),
        from: req.user.userId,
        to: toId,
        text,
        timestamp: Date.now(),
        read: false
    };
    state.messages[convoId].push(msg);
    save.messages();

    // Send push
    const fromUser = state.users[req.user.userId];
    sendPush(toId, {
        title: `${fromUser?.username || 'Someone'} sent a message`,
        body: text.slice(0, 120),
        url: '/',
        actions: [{ action: 'view', title: 'Open' }]
    }).catch(console.error);

    // Todo: Realtime WS notification via event bus

    res.json(msg);
});

router.post('/ack', authenticateToken, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    let updated = 0;
    Object.values(state.messages).forEach(arr => {
        arr.forEach(m => {
            if (ids.includes(m.id)) { m.delivered = true; m.read = true; updated++; }
        });
    });
    save.messages();
    res.json({ ok: true, updated });
});

router.get('/sync', authenticateToken, (req, res) => {
    const uid = req.user.userId;
    const undelivered = [];
    Object.values(state.messages).forEach(arr => {
        arr.forEach(m => {
            if (m.to === uid && !m.delivered) undelivered.push(m);
        });
    });
    res.json({ undelivered });
});

module.exports = router;
