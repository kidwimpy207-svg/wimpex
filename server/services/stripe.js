// Stripe service: payments and subscriptions
let stripe;
let stripeModule;
try {
  stripe = require('stripe');
  stripeModule = true;
} catch (err) {
  console.warn('⚠️ Stripe not installed; payments disabled');
  stripe = null;
  stripeModule = false;
}

const config = require('../config');
const { store, saveUsers } = require('./store');

let stripeClient = null;

// Initialize Stripe
const initStripe = () => {
  if (!stripeModule || !stripe) {
    return;
  }

  if (config.stripe?.secretKey) {
    try {
      stripeClient = stripe(config.stripe.secretKey);
      console.log('💳 Stripe service initialized');
    } catch (err) {
      console.warn('⚠️ Stripe service failed:', err.message);
    }
  } else {
    console.log('⚠️ Stripe not configured; payments disabled');
  }
};

// Create a customer in Stripe
const createCustomer = async (user) => {
  if (!stripeClient) return { success: false, message: 'Stripe not configured' };

  try {
    const customer = await stripeClient.customers.create({
      email: user.email,
      metadata: {
        userId: user.userId,
        username: user.username,
      },
    });

    user.stripeCustomerId = customer.id;
    saveUsers();

    return { success: true, customerId: customer.id };
  } catch (err) {
    console.error('✗ Stripe customer creation failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Create a subscription
const createSubscription = async (userId, priceId) => {
  if (!stripeClient) return { success: false, message: 'Stripe not configured' };

  try {
    const user = store.users.find((u) => u.userId === userId);
    if (!user) return { success: false, error: 'User not found' };

    if (!user.stripeCustomerId) {
      const result = await createCustomer(user);
      if (!result.success) return result;
    }

    const subscription = await stripeClient.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      success: true,
      subscription,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  } catch (err) {
    console.error('✗ Subscription creation failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Handle webhook (Stripe events)
const handleWebhookEvent = async (event) => {
  if (!stripeClient) return { success: false };

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object.id);
        break;

      case 'invoice.payment_succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription cancelled:', event.data.object.id);
        break;

      default:
        console.log('Unhandled webhook event:', event.type);
    }
    return { success: true };
  } catch (err) {
    console.error('✗ Webhook handling failed:', err.message);
    return { success: false, error: err.message };
  }
};

initStripe();

module.exports = {
  createCustomer,
  createSubscription,
  handleWebhookEvent,
  stripeClient,
};
