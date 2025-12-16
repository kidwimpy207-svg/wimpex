const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

function isAdminUser(req) {
    if (!req.user) return false;
    // Simple check: admin_ prefix or isAdmin flag
    const u = state.users[req.user.userId];
    return (req.user.userId.startsWith('admin_') || (u && u.isAdmin));
}

router.get('/', authenticateToken, (req, res) => {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Admin required' });
    res.json(state.moderationQueue || []);
});

router.post('/resolve', authenticateToken, (req, res) => {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Admin required' });
    const { url, action } = req.body;

    const q = state.moderationQueue || [];
    const item = q.find(i => i.url === url);
    if (!item) return res.status(404).json({ error: 'Not found' });

    item.resolved = true;
    item.action = action;
    item.resolvedAt = Date.now();
    save.moderationQueue();

    res.json({ ok: true, item });
});

router.post('/report', authenticateToken, (req, res) => {
    const { targetId, type, reason, details } = req.body;
    if (!targetId || !type) return res.status(400).json({ error: 'targetId and type required' });

    const rep = {
        id: require('crypto').randomBytes(6).toString('hex'),
        reporter: req.user.userId,
        target: targetId,
        type,
        reason: reason || 'unspecified',
        details: details || '',
        ts: Date.now()
    };

    state.reports.push(rep);
    save.reports();

    res.json({ ok: true });
});

module.exports = router;
