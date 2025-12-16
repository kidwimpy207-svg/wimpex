// Payment routes: Stripe subscriptions and checkout
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createSubscription, handleWebhookEvent } = require('../services/stripe');
const config = require('../config');

// Get subscription plans (public)
router.get('/plans', (req, res) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Up to 10 posts per month', 'Basic analytics', 'Community access'],
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: 999, // $9.99/month in cents
      period: 'month',
      priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
      features: ['Unlimited posts', 'Advanced analytics', 'Priority support', 'Custom branding'],
    },
    {
      id: 'creator_monthly',
      name: 'Creator',
      price: 1999, // $19.99/month in cents
      period: 'month',
      priceId: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
      features: ['All Pro features', 'Monetization tools', 'Advanced insights', 'API access'],
    },
  ];

  res.json(plans);
});

// Create subscription intent
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = {
      pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      creator_monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
    }[planId];

    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const result = await createSubscription(req.user.userId, plan);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ clientSecret: result.clientSecret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe webhook (verify signature)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!config.stripe?.webhookSecret) {
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    const event = require('stripe').Stripe.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );

    const result = await handleWebhookEvent(event);
    res.json({ success: result.success });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
