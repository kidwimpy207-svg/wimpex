// Password reset routes
const express = require('express');
const router = express.Router();
const { sendPasswordResetEmail, generateToken } = require('../services/email');
const { state, save } = require('../services/store');
const bcrypt = require('bcryptjs');

// Request password reset
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // state.users is an object keyed by userId; find by email
    const usersArr = Object.values(state.users || {});
    const user = usersArr.find((u) => u && u.email === email);
    if (!user) {
      // Don't reveal if email exists (security)
      return res.json({ success: true, message: 'If that email exists we sent a reset link' });
    }

    const token = generateToken();
    user.resetPasswordToken = token;
    user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // store as timestamp (ms)
    if (save && typeof save.users === 'function') save.users();

    await sendPasswordResetEmail(user.email, user.username || user.userId || 'User', token);
    res.json({ success: true, message: 'If that email exists we sent a reset link' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset password with token
router.post('/reset', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        error: 'Password must be 8+ chars with uppercase, lowercase, and number'
      });
    }

    const user = store.users.find(
      (u) => u.resetPasswordToken === token && new Date() < u.resetPasswordExpiry
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    saveUsers();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
