const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const friendRequests = require('../services/friendRequests');
const { state } = require('../services/store');

// Send friend request
router.post('/send', authenticateToken, (req, res) => {
  const { targetId } = req.body;
  if (!targetId) return res.status(400).json({ error: 'Target user ID required' });

  const result = friendRequests.sendRequest(req.user.userId, targetId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Get pending requests
router.get('/pending', authenticateToken, (req, res) => {
  const requests = friendRequests.getPendingRequests(req.user.userId);
  res.json(requests);
});

// Get sent requests
router.get('/sent', authenticateToken, (req, res) => {
  const requests = friendRequests.getSentRequests(req.user.userId);
  res.json(requests);
});

// Accept friend request
router.post('/accept', authenticateToken, (req, res) => {
  const { fromId } = req.body;
  if (!fromId) return res.status(400).json({ error: 'From user ID required' });

  const result = friendRequests.acceptRequest(req.user.userId, fromId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Decline friend request
router.post('/decline', authenticateToken, (req, res) => {
  const { fromId } = req.body;
  if (!fromId) return res.status(400).json({ error: 'From user ID required' });

  const result = friendRequests.declineRequest(req.user.userId, fromId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
