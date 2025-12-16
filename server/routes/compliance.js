const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');

// Get GDPR/CCPA data export
router.get('/export', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const userSnaps = Object.values(state.snaps || {}).filter(s => s.fromId === req.user.userId || s.toId === req.user.userId);
  const userMessages = Object.values(state.messages || {}).filter(m => m.from === req.user.userId || m.to === req.user.userId);
  const userEvents = (state.events || []).filter(e => e.payload?.userId === req.user.userId);
  
  res.json({
    exportedAt: Date.now(),
    user: { ...user, password: undefined },
    snaps: userSnaps,
    messages: userMessages,
    events: userEvents,
    friendsList: user.friends || [],
    blockedList: user.blocked || [],
    mutedList: user.muted || []
  });
});

// Schedule account deletion (grace period: 30 days)
router.post('/delete-account', authenticateToken, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required to delete account' });
  
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Schedule soft deletion
  user.deletionScheduledAt = Date.now();
  user.deletionGracePeriodEnds = Date.now() + (config.dataDeletionGracePeriodDays || 30) * 24 * 60 * 60 * 1000;
  user.username = `deleted_${user.userId}`;
  user.email = `deleted+${user.userId}@example.invalid`;
  save.users();
  
  res.json({ ok: true, gracePeriodEnds: user.deletionGracePeriodEnds, message: 'Account scheduled for deletion in 30 days' });
});

// Cancel account deletion
router.post('/cancel-deletion', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.deletionScheduledAt) return res.status(400).json({ error: 'No deletion scheduled' });
  
  user.deletionScheduledAt = null;
  user.deletionGracePeriodEnds = null;
  save.users();
  res.json({ ok: true });
});

// Get consent status
router.get('/consent-status', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    tosAccepted: user.tosAcceptedAt || null,
    privacyAccepted: user.privacyAcceptedAt || null,
    analyticsConsent: user.analyticsConsent || false,
    marketingConsent: user.marketingConsent || false
  });
});

// Accept/update consent
router.put('/consent', authenticateToken, (req, res) => {
  const { tosAccepted, privacyAccepted, analyticsConsent, marketingConsent } = req.body;
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (tosAccepted) user.tosAcceptedAt = Date.now();
  if (privacyAccepted) user.privacyAcceptedAt = Date.now();
  if (analyticsConsent !== undefined) user.analyticsConsent = analyticsConsent;
  if (marketingConsent !== undefined) user.marketingConsent = marketingConsent;
  
  save.users();
  res.json({ ok: true });
});

// Get data retention policy
router.get('/data-retention', (req, res) => {
  res.json({
    retentionDays: config.dataRetentionDays || 365,
    deletionGracePeriodDays: config.dataDeletionGracePeriodDays || 30,
    automaticDeletion: true
  });
});

// Get Terms of Service
router.get('/tos', (req, res) => {
  res.send(`
    <html>
      <head><title>Terms of Service</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto;">
        <h1>Terms of Service</h1>
        <p><strong>Last Updated: December 2025</strong></p>
        <h2>1. Acceptance of Terms</h2>
        <p>By using Wimpex, you accept these terms and conditions in full.</p>
        <h2>2. User Responsibilities</h2>
        <ul>
          <li>You are responsible for all content you upload and share</li>
          <li>You agree not to post illegal, abusive, or harmful content</li>
          <li>You must not violate others' privacy or intellectual property</li>
        </ul>
        <h2>3. Content Moderation</h2>
        <p>We reserve the right to remove content that violates these terms.</p>
        <h2>4. Limitation of Liability</h2>
        <p>Wimpex is provided "as-is" without warranties of any kind.</p>
        <h2>5. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use implies acceptance.</p>
      </body>
    </html>
  `);
});

// Get Privacy Policy
router.get('/privacy', (req, res) => {
  res.send(`
    <html>
      <head><title>Privacy Policy</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto;">
        <h1>Privacy Policy</h1>
        <p><strong>Last Updated: December 2025</strong></p>
        <h2>1. Information We Collect</h2>
        <ul>
          <li>Profile information (username, email, phone, avatar, bio)</li>
          <li>Content you create (snaps, stories, messages)</li>
          <li>Activity logs (login times, device info)</li>
          <li>Analytics (page views, feature usage)</li>
        </ul>
        <h2>2. How We Use Your Data</h2>
        <p>We use your data to provide, improve, and personalize our service.</p>
        <h2>3. Data Protection</h2>
        <p>Your data is encrypted in transit and at rest. We comply with GDPR and CCPA.</p>
        <h2>4. Your Rights</h2>
        <ul>
          <li>Right to access your data (request export)</li>
          <li>Right to delete your data</li>
          <li>Right to correct inaccurate data</li>
        </ul>
        <h2>5. Contact</h2>
        <p>For privacy concerns, contact: privacy@wimpex.dev</p>
      </body>
    </html>
  `);
});

module.exports = router;
