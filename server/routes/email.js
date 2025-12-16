// Email verification routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail, generateToken } = require('../services/email');
const { store, saveUsers } = require('../services/store');

// Send verification email (on signup or request)
router.post('/send-verification', authenticateToken, async (req, res) => {
  try {
    const user = store.users.find((u) => u.userId === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailConfirmed) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate token
    const token = generateToken();
    user.emailVerificationToken = token;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    saveUsers();

    // Send email
    const result = await sendVerificationEmail(user.email, user.username, token);
    if (!result.success) {
      return res.status(500).json({ error: result.message || result.error });
    }

    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    console.error('Send verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify email with token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const user = store.users.find(
      (u) => u.emailVerificationToken === token && new Date() < u.emailVerificationExpiry
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.emailConfirmed = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    saveUsers();

    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const user = store.users.find((u) => u.userId === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailConfirmed) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Rate limit: only resend every 60 seconds
    const lastResend = user.lastVerificationResend ? new Date(user.lastVerificationResend) : null;
    if (lastResend && Date.now() - lastResend < 60000) {
      return res.status(429).json({ error: 'Too many resend attempts, try again later' });
    }

    const token = generateToken();
    user.emailVerificationToken = token;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.lastVerificationResend = new Date();
    saveUsers();

    const result = await sendVerificationEmail(user.email, user.username, token);
    if (!result.success) {
      return res.status(500).json({ error: result.message || result.error });
    }

    res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
