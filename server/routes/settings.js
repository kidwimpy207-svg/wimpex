const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// GET /api/settings -> return current user settings
router.get('/', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, confirmToken, twoFATemp, ...safe } = user;
  res.json(safe);
});

// PUT /api/settings -> update current user settings
router.put('/', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { username, email, phone, bio, avatar, location, website, privateAccount } = req.body;

  // Validate username (2-30 chars)
  if (username && username !== user.username) {
    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 2-30 characters' });
    }
    if (Object.values(state.users).some(u => u.username === username && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    user.username = username;
  }

  // Validate email
  if (email && email !== user.email) {
    if (Object.values(state.users).some(u => u.email === email && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    user.email = email;
    user.emailConfirmed = false;
  }

  // Validate phone
  if (phone && phone !== user.phone) {
    if (Object.values(state.users).some(u => u.phone === phone && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Phone already registered' });
    }
    user.phone = phone;
  }

  // Update profile fields
  if (bio !== undefined) user.bio = bio.substring(0, 160);
  if (location !== undefined) user.location = location.substring(0, 50);
  if (website !== undefined) user.website = website.substring(0, 200);
  if (avatar) user.avatar = avatar;
  if (privateAccount !== undefined) user.privateAccount = !!privateAccount;

  // Mark profile as complete
  user.profileComplete = !!(avatar && bio && location);

  save.users();
  const { password, confirmToken, twoFATemp, ...safe } = user;
  res.json(safe);
});

module.exports = router;
