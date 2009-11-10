const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const scores = require('../services/scores');

// GET /api/scores/:userId
router.get('/:userId', (req, res) => {
  try {
    const s = scores.getScore(req.params.userId);
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores/add
// body: { userId, points }
router.post('/add', authenticateToken, (req, res) => {
  try {
    const userId = req.body.userId || req.user.userId;
    const points = parseInt(req.body.points) || 0;
    const s = scores.addPoints(userId, points);
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
