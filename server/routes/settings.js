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

  const { username, email, phone, bio, avatar } = req.body;

  if (username && username !== user.username) {
    if (Object.values(state.users).some(u => u.username === username && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    user.username = username;
  }

  if (email && email !== user.email) {
    if (Object.values(state.users).some(u => u.email === email && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    user.email = email;
  }

  if (phone && phone !== user.phone) {
    if (Object.values(state.users).some(u => u.phone === phone && u.userId !== user.userId)) {
      return res.status(400).json({ error: 'Phone already registered' });
    }
    user.phone = phone;
  }

  if (bio !== undefined) user.bio = bio;
  if (avatar) user.avatar = avatar;

  save.users();
  const { password, confirmToken, twoFATemp, ...safe } = user;
  res.json(safe);
});

module.exports = router;
