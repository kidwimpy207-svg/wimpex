const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const config = require('../config');

// Get user profile
router.get('/:userId', authenticateToken, (req, res) => {
    const user = state.users[req.params.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...userData } = user;
    res.json(userData);
});

// Update user profile (self)
router.put('/:userId', authenticateToken, (req, res) => {
    if (req.user.userId !== req.params.userId && req.params.userId !== 'self') return res.status(403).json({ error: 'Unauthorized' });

    const userId = req.user.userId;
    const { bio, avatar, username, phone, email } = req.body;

    if (username && username !== state.users[userId].username) {
        if (Object.values(state.users).some(u => u.username === username && u.userId !== userId)) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        state.users[userId].username = username;
    }

    if (email && email !== state.users[userId].email) {
        if (Object.values(state.users).some(u => u.email === email && u.userId !== userId)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        state.users[userId].email = email;
    }

    if (phone && phone !== state.users[userId].phone) {
        if (Object.values(state.users).some(u => u.phone === phone && u.userId !== userId)) {
            return res.status(400).json({ error: 'Phone already registered' });
        }
        state.users[userId].phone = phone;
    }

    if (bio !== undefined) state.users[userId].bio = bio;
    if (avatar) state.users[userId].avatar = avatar;

    save.users();
    const { password, ...userData } = state.users[userId];
    res.json(userData);
});

// Settings endpoints
// ... (Include other settings endpoints if needed, or group them)

// Onboarding: Status
router.get('/onboarding/status', authenticateToken, (req, res) => {
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        onboardingComplete: user.onboardingComplete || false,
        profileComplete: !!(user.avatar && !user.avatar.includes('pravatar.cc')),
        emailVerified: user.emailConfirmed || false,
        phoneVerified: user.phoneVerified || false,
        hasAddedFriends: (user.friends && user.friends.length > 0) || false,
        hasPostedSnap: (user.snapCount || 0) > 0
    });
});

// Onboarding: Complete
router.post('/onboarding/complete', authenticateToken, (req, res) => {
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.onboardingComplete = true;
    user.onboardedAt = Date.now();
    save.users();
    res.json({ ok: true });
});

module.exports = router;
