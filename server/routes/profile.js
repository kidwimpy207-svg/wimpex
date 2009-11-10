const express = require('express');
const router = express.Router();
const profileService = require('../services/profile');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/profile/me
 * Get current user's complete profile
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const profile = profileService.getPrivateProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/profile/:userId
 * Get public profile of another user
 */
router.get('/:userId', (req, res) => {
  try {
    const profile = profileService.getPublicProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/profile/me
 * Update current user's profile
 */
router.put('/me', authenticateToken, (req, res) => {
  try {
    const updates = {
      username: req.body.username,
      bio: req.body.bio,
      location: req.body.location,
      website: req.body.website,
      avatar: req.body.avatar,
      privateAccount: req.body.privateAccount
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const updatedProfile = profileService.updateProfile(req.user.userId, updates);
    res.json(updatedProfile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/profile/:userId/stats
 * Get profile statistics
 */
router.get('/:userId/stats', (req, res) => {
  try {
    const stats = profileService.getProfileStats(req.params.userId);
    if (!stats) return res.status(404).json({ error: 'User not found' });
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/profile/me/completion
 * Get profile completion score
 */
router.get('/me/completion', authenticateToken, (req, res) => {
  try {
    const score = profileService.getCompletionScore(req.user.userId);
    res.json({ completionScore: score });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/profile/recommendations
 * Get recommended users to follow
 */
router.get('/recommendations', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = profileService.getRecommendedProfiles(req.user.userId, limit);
    res.json(recommendations);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/profile/search
 * Search for profiles
 */
router.get('/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = profileService.searchProfiles(query, limit);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
