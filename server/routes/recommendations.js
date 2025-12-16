const express = require('express');
const router = express.Router();
const { state } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');

// GET /api/recommendations - simple recommendation engine
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const user = state.users[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const userFriendIds = new Set(user.friends || []);
  const recommendations = Object.values(state.users)
    .filter(u => u.userId !== userId && !userFriendIds.has(u.userId))
    .map(u => ({
      userId: u.userId,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      gender: u.gender,
      mutualFriends: (u.friends || []).filter(fid => userFriendIds.has(fid)).length
    }))
    .sort((a, b) => b.mutualFriends - a.mutualFriends)
    .slice(0, 10);

  res.json(recommendations);
});

module.exports = router;
