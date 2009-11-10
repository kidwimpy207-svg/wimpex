// Analytics service: event tracking, error reporting, dashboards
let sentry;
try {
  sentry = require('@sentry/node');
  console.log('📊 Sentry error tracking initialized');
} catch (err) {
  console.log('⚠️ Sentry not installed; error tracking disabled');
  sentry = null;
}

const config = require('../config');

// Initialize Sentry (optional)
const initSentry = () => {
  if (!sentry) return;

  if (config.sentry?.dsn) {
    try {
      sentry.init({
        dsn: config.sentry.dsn,
        tracesSampleRate: 1.0,
        environment: config.env,
      });
      console.log('✅ Sentry initialized');
    } catch (err) {
      console.warn('⚠️ Sentry initialization failed:', err.message);
    }
  }
};

// Track event
const trackEvent = (userId, eventName, properties = {}) => {
  const event = {
    userId,
    eventName,
    properties,
    timestamp: new Date(),
    platform: 'web',
  };

  // Log locally
  console.log(`📊 Event: ${eventName}`, properties);

  // Could send to external service (PostHog, Mixpanel, etc.)
  // fetch('https://analytics.wimpex.app/events', { method: 'POST', body: JSON.stringify(event) })

  return event;
};

// Track error
const trackError = (error, context = {}) => {
  console.error('❌ Error tracked:', error.message, context);

  if (sentry) {
    sentry.captureException(error, { tags: context });
  }
};

// Track page view
const trackPageView = (userId, page, properties = {}) => {
  console.log(`📄 Page view: ${page}`, properties);
  return trackEvent(userId, 'page_view', { page, ...properties });
};

// Predefined events
const events = {
  signup: (userId) => trackEvent(userId, 'signup'),
  login: (userId) => trackEvent(userId, 'login'),
  emailVerified: (userId) => trackEvent(userId, 'email_verified'),
  uploadPost: (userId, postId) => trackEvent(userId, 'upload_post', { postId }),
  sharePost: (userId, postId) => trackEvent(userId, 'share_post', { postId }),
  subscribe: (userId, plan) => trackEvent(userId, 'subscribe', { plan }),
  upgradePlan: (userId, oldPlan, newPlan) => trackEvent(userId, 'upgrade_plan', { oldPlan, newPlan }),
};

initSentry();

module.exports = {
  trackEvent,
  trackError,
  trackPageView,
  events,
};
