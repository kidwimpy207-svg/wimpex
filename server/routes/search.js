const express = require('express');
const router = express.Router();
const { state } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// Simple cache for search
const simpleCache = new Map();
function cacheGet(key) { return simpleCache.get(key); }
function cacheSet(key, value, ttl = 30000) {
    simpleCache.set(key, value);
    setTimeout(() => simpleCache.delete(key), ttl);
}

router.get('/', authenticateToken, (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);

    const cacheKey = `search:${q}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const results = Object.values(state.users)
        .filter(u => !u.deleted)
        .filter(u => (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
        .slice(0, 20)
        .map(u => ({
            userId: u.userId,
            username: u.username,
            avatar: u.avatar,
            bio: u.bio,
            gender: u.gender,
            isFriend: (state.users[req.user.userId]?.friends || []).includes(u.userId)
        }));

    cacheSet(cacheKey, results, 15000);
    res.json(results);
});

module.exports = router;
