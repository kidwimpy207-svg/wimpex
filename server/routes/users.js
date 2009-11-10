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

// Shortcut to get current user
router.get('/self', authenticateToken, (req, res) => {
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, confirmToken, twoFATemp, ...userData } = user;
    res.json(userData);
});

// Update user profile (self)
router.put('/:userId', authenticateToken, (req, res) => {
    if (req.user.userId !== req.params.userId && req.params.userId !== 'self') return res.status(403).json({ error: 'Unauthorized' });

    const userId = req.user.userId;
    const user = state.users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { bio, avatar, username, phone, email, location, website, privateAccount } = req.body;

    // Validate username (2-30 chars)
    if (username && username !== user.username) {
        if (username.length < 2 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be 2-30 characters' });
        }
        if (Object.values(state.users).some(u => u.username === username && u.userId !== userId)) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        user.username = username;
    }

    // Validate email
    if (email && email !== user.email) {
        if (Object.values(state.users).some(u => u.email === email && u.userId !== userId)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        user.email = email;
        user.emailConfirmed = false; // require re-verification
    }

    // Validate phone
    if (phone && phone !== user.phone) {
        if (Object.values(state.users).some(u => u.phone === phone && u.userId !== userId)) {
            return res.status(400).json({ error: 'Phone already registered' });
        }
        user.phone = phone;
    }

    // Update profile fields
    if (bio !== undefined) user.bio = bio.substring(0, 160); // max 160 chars
    if (location !== undefined) user.location = location.substring(0, 50); // max 50 chars
    if (website !== undefined) user.website = website.substring(0, 200); // max 200 chars
    if (avatar) user.avatar = avatar;
    if (privateAccount !== undefined) user.privateAccount = !!privateAccount;

    // Set profile completion
    user.profileComplete = !!(avatar && bio && location);

    save.users();
    const { password, confirmToken, twoFATemp, ...userData } = user;
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
