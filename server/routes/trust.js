const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Get user badges and verification status
router.get('/badges', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  res.json({
    verified: user.verified || false,
    badges: user.badges || [],
    verificationLevel: user.verificationLevel || 'none', // none, basic, verified, celebrity
    verificationChecks: {
      emailVerified: user.emailConfirmed || false,
      phoneVerified: user.phoneVerified || false,
      identityVerified: user.identityVerified || false
    }
  });
});

// Request verification
router.post('/request-verification', authenticateToken, (req, res) => {
  const { category } = req.body; // creator, public_figure, etc
  const user = state.users[req.user.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.verificationRequested = true;
  user.verificationCategory = category;
  user.verificationRequestedAt = Date.now();
  user.verificationStatus = 'pending';
  save.users();
  
  res.json({ ok: true, message: 'Verification request submitted. Our team will review within 7 days.' });
});

// File appeal
router.post('/appeal', authenticateToken, (req, res) => {
  const { actionId, reason } = req.body;
  if (!actionId || !reason) return res.status(400).json({ error: 'actionId and reason required' });
  
  if (!state.appeals) state.appeals = [];
  const appeal = {
    id: crypto.randomBytes(6).toString('hex'),
    userId: req.user.userId,
    actionId,
    reason,
    status: 'open',
    createdAt: Date.now(),
    resolvedAt: null
  };
  
  state.appeals.push(appeal);
  save.appeals?.();
  
  res.json({ ok: true, appeal });
});

// Get appeals
router.get('/appeals', authenticateToken, (req, res) => {
  const userAppeals = (state.appeals || []).filter(a => a.userId === req.user.userId);
  res.json(userAppeals);
});

// Get community guidelines
router.get('/guidelines', (req, res) => {
  res.send(`
    <html>
      <head><title>Community Guidelines</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto;">
        <h1>Community Guidelines</h1>
        <p><strong>Last Updated: December 2025</strong></p>
        
        <h2>🚫 Prohibited Content</h2>
        <ul>
          <li><strong>Harassment & Hate:</strong> No bullying, hate speech, or discrimination</li>
          <li><strong>Illegal Content:</strong> No drugs, weapons, or illegal activities</li>
          <li><strong>Misinformation:</strong> No false health or election claims</li>
          <li><strong>Privacy Violations:</strong> No doxxing or sharing others' personal info</li>
          <li><strong>Spam:</strong> No repetitive unwanted messages or commercial spam</li>
          <li><strong>NSFW:</strong> No explicit sexual or violent content</li>
        </ul>
        
        <h2>⚠️ Enforcement Actions</h2>
        <ul>
          <li><strong>Warning:</strong> First minor violation</li>
          <li><strong>Content Removal:</strong> Violating content is deleted</li>
          <li><strong>Temporary Restriction:</strong> 24 hours to 7 days</li>
          <li><strong>Account Suspension:</strong> 7-90 days</li>
          <li><strong>Permanent Ban:</strong> Severe or repeated violations</li>
        </ul>
        
        <h2>📬 Appeals</h2>
        <p>Disagree with an action? File an appeal within 30 days. Our team will review within 7 days.</p>
        
        <h2>📧 Report Issues</h2>
        <p>Report violations: abuse@wimpex.dev</p>
      </body>
    </html>
  `);
});

// Get transparency report (admin)
router.get('/transparency', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user.isAdmin) return res.status(403).json({ error: 'Admin required' });
  
  const reports = state.reports || [];
  const modQueue = state.moderationQueue || [];
  const appeals = state.appeals || [];
  
  res.json({
    reportsReceived: reports.length,
    reportsByType: {
      harassment: reports.filter(r => r.type === 'harassment').length,
      spam: reports.filter(r => r.type === 'spam').length,
      illegal: reports.filter(r => r.type === 'illegal').length,
      misinformation: reports.filter(r => r.type === 'misinformation').length,
      other: reports.filter(r => !['harassment', 'spam', 'illegal', 'misinformation'].includes(r.type)).length
    },
    actionsOnContent: modQueue.filter(m => m.action).length,
    appalsCases: appeals.length,
    appealsResolved: appeals.filter(a => a.status === 'resolved').length,
    transparencyUrl: '/api/trust/guidelines'
  });
});

module.exports = router;
