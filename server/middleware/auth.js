const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // mask token for safe logging (show start/end only)
    const maskToken = (t) => {
        if (!t || t.length < 10) return t;
        return `${t.slice(0, 6)}...${t.slice(-4)}`;
    };

    if (!token) {
        // In development, allow a default demo user to simplify local testing
        if ((process.env.NODE_ENV || 'development') !== 'production') {
            req.user = {
                userId: process.env.DEV_USER_ID || 'dev_user',
                username: process.env.DEV_USERNAME || 'developer'
            };
            console.warn('[auth] No token provided — using dev user for local testing:', req.user.userId);
            return next();
        }
        return res.status(401).json({ error: 'Access token required' });
    }

    // log incoming auth header and masked token for debugging
    console.warn('[auth] Authorization header received:', authHeader.split(' ')[0], maskToken(token));

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            console.warn('[auth] jwt.verify failed for token:', maskToken(token), 'error:', err && err.message);
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken };
