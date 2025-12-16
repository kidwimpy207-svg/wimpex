const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Get monetization plans
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['unlimited snaps', 'messaging', 'stories', '10 GB storage']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 4.99,
        billingPeriod: 'month',
        features: ['unlimited snaps', 'messaging', 'stories', '1 TB storage', 'no ads', 'priority support']
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        billingPeriod: 'month',
        features: ['all pro features', 'custom filters', 'advanced analytics', 'creator badge']
      }
    ]
  });
});

// Get user subscription
router.get('/subscription', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  res.json({
    plan: user.subscriptionPlan || 'free',
    status: user.subscriptionStatus || 'active',
    renewsAt: user.subscriptionRenewsAt || null,
    createdAt: user.subscriptionCreatedAt || null
  });
});

// Create subscription (Stripe)
router.post('/subscribe', authenticateToken, (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId required' });
  
  const user = state.users[req.user.userId];
  user.subscriptionPlan = planId;
  user.subscriptionStatus = 'active';
  user.subscriptionCreatedAt = Date.now();
  user.subscriptionRenewsAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  save.users();
  
  res.json({
    ok: true,
    message: `Subscribed to ${planId}`,
    subscription: {
      plan: planId,
      status: 'active',
      renewsAt: user.subscriptionRenewsAt
    }
  });
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (user.subscriptionPlan === 'free') return res.status(400).json({ error: 'Already on free plan' });
  
  user.subscriptionPlan = 'free';
  user.subscriptionStatus = 'cancelled';
  user.subscriptionRenewsAt = null;
  save.users();
  
  res.json({ ok: true, message: 'Subscription cancelled' });
});

// Get revenue/billing history (admin)
router.get('/revenue', authenticateToken, (req, res) => {
  const user = state.users[req.user.userId];
  if (!user.isAdmin) return res.status(403).json({ error: 'Admin required' });
  
  const allSubscriptions = Object.values(state.users || {})
    .filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'free')
    .map(u => ({
      userId: u.userId,
      plan: u.subscriptionPlan,
      status: u.subscriptionStatus,
      createdAt: u.subscriptionCreatedAt,
      renewsAt: u.subscriptionRenewsAt
    }));
  
  const mau = new Set(Object.values(state.users || {}).map(u => u.userId)).size;
  const totalRevenue = allSubscriptions.filter(s => s.status === 'active').length * 5; // rough estimate
  
  res.json({
    totalActiveSubscriptions: allSubscriptions.filter(s => s.status === 'active').length,
    totalRevenue: `$${totalRevenue.toFixed(2)}/month (estimate)`,
    mau,
    subscriptions: allSubscriptions
  });
});

module.exports = router;
