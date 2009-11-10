const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const streaks = require('../services/streaks');

// POST /api/streaks/renew
// body: { otherId }
router.post('/renew', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const otherId = req.body.otherId;
  if (!otherId) return res.status(400).json({ error: 'otherId required' });
  try {
    const s = streaks.renewStreak(userId, otherId);
    const activation = streaks.checkStreakActivation(userId, otherId);
    res.json({ streak: s, activation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streaks/:otherId
router.get('/:otherId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const otherId = req.params.otherId;
  try {
    const s = streaks.getStreak(userId, otherId);
    const isActive = streaks.isStreakActive(userId, otherId);
    const expiryTime = streaks.getStreakExpiryTime(userId, otherId);
    const timeLeft = streaks.getTimeUntilExpiry(userId, otherId);
    const restoreInfo = streaks.getRestoreCount(userId, otherId);
    res.json({ streak: s, isActive, expiryTime, timeLeft, restoreInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streaks/:otherId/status - Get detailed status including flame health
router.get('/:otherId/status', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const otherId = req.params.otherId;
  try {
    const isActive = streaks.isStreakActive(userId, otherId);
    const timeLeft = streaks.getTimeUntilExpiry(userId, otherId);
    const restoreInfo = streaks.getRestoreCount(userId, otherId);
    
    let flameHealth = 100; // 0-100 scale
    if (timeLeft) {
      const maxTime = 24 * 60 * 60 * 1000;
      flameHealth = Math.max(0, Math.round((timeLeft / maxTime) * 100));
    }
    
    res.json({
      isActive,
      timeLeft,
      flameHealth,
      restoreInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streaks/restore  (use free restore)
router.post('/restore', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const otherId = req.body.otherId;
  if (!otherId) return res.status(400).json({ error: 'otherId required' });
  
  try {
    const restoreInfo = streaks.getRestoreCount(userId, otherId);
    if (!restoreInfo.hasFreeForms) {
      return res.status(402).json({ error: 'No free restores left', restoreInfo });
    }
    
    const s = streaks.useRestore(userId, otherId, false);
    res.json({ success: true, streak: s, restoreInfo: streaks.getRestoreCount(userId, otherId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streaks/restore-premium (purchase premium restore)
router.post('/restore-premium', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const otherId = req.body.otherId;
  if (!otherId) return res.status(400).json({ error: 'otherId required' });
  
  try {
    // TODO: Integrate with Stripe for actual payment
    // For now, stub response
    const s = streaks.useRestore(userId, otherId, true);
    res.json({ success: true, message: 'Premium restore activated', streak: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
