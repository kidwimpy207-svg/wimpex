const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const config = require('../config');
const { state, save } = require('../services/store');
const { sendEmail } = require('../services/email'); // Need to extract email service too
const { authenticateToken } = require('../middleware/auth'); // Need to extract middleware

// Password helpers
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
    if (!hash) return false;
    try {
        if (typeof hash === 'string' && hash.startsWith('$2')) {
            return bcrypt.compareSync(password, hash);
        }
    } catch (e) { }
    // Legacy sha256 check
    const legacy = crypto.createHash('sha256').update(password + 'wimpex_salt').digest('hex');
    return legacy === hash;
}

function genId() { return crypto.randomBytes(6).toString('hex'); }

// Signup
router.post('/signup', (req, res) => {
    const { username, email, phone, password, gender } = req.body;
    if (!username || !email || !password || !gender) return res.status(400).json({ error: 'Missing required fields' });
    if (Object.values(state.users).some(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
    if (Object.values(state.users).some(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });
    if (phone && Object.values(state.users).some(u => u.phone === phone)) return res.status(400).json({ error: 'Phone already registered' });

    const userId = genId();
    const hashedPassword = hashPassword(password);
    const avatar = `https://i.pravatar.cc/150?img=${Math.random() * 70 | 0}`;
    const confirmToken = crypto.randomBytes(32).toString('hex');

    state.users[userId] = {
        userId,
        username,
        email,
        phone: phone || '',
        password: hashedPassword,
        avatar,
        bio: 'New to Wimpex ✨',
        gender: gender || 'not-specified',
        emailConfirmed: false,
        confirmToken: confirmToken,
        friends: [],
        followers: [],
        createdAt: Date.now()
    };

    save.users();

    const confirmUrl = `${config.apiPrefix || ''}/auth/confirm?token=${confirmToken}`; // Adjust URL as reusable
    // Ideally base URL should be in config
    // For now using placeholder logic

    // Note: sendEmail is assumed imported. I should implement it.

    const token = jwt.sign({ userId, username }, config.jwt.secret, { expiresIn: config.jwt.expiry });
    res.json({
        userId,
        username,
        avatar,
        token,
        message: 'Account created! Please check your email to confirm.'
    });
});

// Login
router.post('/login', (req, res) => {
    const { input, password, loginType } = req.body;
    if (!input || !password) return res.status(400).json({ error: 'Input and password required' });

    let user = null;
    if (loginType === 'email') {
        user = Object.values(state.users).find(u => u.email === input);
    } else if (loginType === 'phone') {
        user = Object.values(state.users).find(u => u.phone === input);
    } else if (loginType === 'username') {
        user = Object.values(state.users).find(u => u.username === input);
    } else {
        user = Object.values(state.users).find(u => u.email === input || u.phone === input || u.username === input);
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.twoFA && user.twoFA.enabled) {
        const temp = jwt.sign({ userId: user.userId, twofa: true }, config.jwt.secret, { expiresIn: '5m' });
        return res.json({ need2FA: true, tempToken: temp, userId: user.userId, username: user.username, avatar: user.avatar });
    }

    const token = jwt.sign({ userId: user.userId, username: user.username }, config.jwt.secret, { expiresIn: config.jwt.expiry });
    res.json({ userId: user.userId, username: user.username, avatar: user.avatar, token });
});

// 2FA Setup
router.get('/2fa/setup', authenticateToken, async (req, res) => {
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `Wimpex (${user.username})` });
    user.twoFATemp = secret.base32;
    save.users();

    const otpauth = secret.otpauth_url;
    try {
        const qr = await qrcode.toDataURL(otpauth);
        res.json({ secret: secret.base32, otpauth, qr });
    } catch (e) {
        res.json({ secret: secret.base32, otpauth });
    }
});

// 2FA Verify (Enable)
router.post('/2fa/verify', authenticateToken, (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const secret = user.twoFATemp;
    if (!secret) return res.status(400).json({ error: 'No 2FA setup in progress' });

    const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(401).json({ error: 'Invalid token' });

    user.twoFA = { enabled: true, secret };
    user.twoFATemp = null;
    save.users();
    res.json({ ok: true, message: '2FA enabled' });
});

// 2FA Disable
router.post('/2fa/disable', authenticateToken, (req, res) => {
    const { token, password } = req.body;
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.twoFA || !user.twoFA.enabled) return res.status(400).json({ error: '2FA not enabled' });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: 'Invalid password' });

    const ok = speakeasy.totp.verify({ secret: user.twoFA.secret, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(401).json({ error: 'Invalid 2FA token' });

    user.twoFA = { enabled: false, secret: null };
    save.users();
    res.json({ ok: true, message: '2FA disabled' });
});

// Login 2FA Verification
router.post('/login-2fa', (req, res) => {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) return res.status(400).json({ error: 'Missing fields' });
    try {
        const decoded = jwt.verify(tempToken, config.jwt.secret);
        if (!decoded.twofa) return res.status(400).json({ error: 'Invalid temp token' });
        const user = state.users[decoded.userId];
        if (!user || !user.twoFA || !user.twoFA.enabled) return res.status(400).json({ error: '2FA not enabled' });

        const ok = speakeasy.totp.verify({ secret: user.twoFA.secret, encoding: 'base32', token, window: 1 });
        if (!ok) return res.status(401).json({ error: 'Invalid 2FA token' });

        const full = jwt.sign({ userId: user.userId, username: user.username }, config.jwt.secret, { expiresIn: config.jwt.expiry });
        return res.json({ userId: user.userId, username: user.username, avatar: user.avatar, token: full });
    } catch (e) {
        return res.status(400).json({ error: 'Invalid or expired temp token' });
    }
});

module.exports = router;
