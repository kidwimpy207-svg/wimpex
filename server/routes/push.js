const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const { webpush, sendPush } = require('../services/notification');

router.get('/publicKey', (req, res) => {
    try {
        const key = webpush.getVapidPublicKey();
        res.json({ publicKey: key });
    } catch (e) {
        res.status(500).json({ error: 'VAPID key not available' });
    }
});

router.post('/subscribe', authenticateToken, (req, res) => {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });

    const userId = req.user.userId;
    if (!state.pushSubscriptions[userId]) state.pushSubscriptions[userId] = [];

    const exists = state.pushSubscriptions[userId].some(s => s.endpoint === subscription.endpoint);
    if (!exists) state.pushSubscriptions[userId].push(subscription);
    save.pushSubscriptions();

    res.json({ ok: true });
});

router.post('/unsubscribe', authenticateToken, (req, res) => {
    const { endpoint } = req.body;
    const userId = req.user.userId;
    if (state.pushSubscriptions[userId]) {
        state.pushSubscriptions[userId] = state.pushSubscriptions[userId].filter(s => s.endpoint !== endpoint);
        save.pushSubscriptions();
    }
    res.json({ ok: true });
});

router.post('/send', authenticateToken, (req, res) => {
    const { userId, title, body, url } = req.body;
    const payload = { title: title || 'Wimpex', body: body || '', url: url || '/' };

    // Allow user to send push to themselves or others?
    // Original logic allowed sending to specific userId or broadcast if no userId
    // Assuming strict security for now, or just mimicking original

    const targets = userId ? [userId] : Object.keys(state.pushSubscriptions);

    // Async fire and forget
    targets.forEach(uid => sendPush(uid, payload));

    res.json({ ok: true, message: 'Notifications queued' });
});

module.exports = router;
