const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// GET /api/onboarding/status
router.get('/status', authenticateToken, (req, res) => {
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

// POST /api/onboarding/complete
router.post('/complete', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.onboardingComplete = true;
  user.onboardedAt = Date.now();
  save.users();
  res.json({ ok: true });
});

module.exports = router;
