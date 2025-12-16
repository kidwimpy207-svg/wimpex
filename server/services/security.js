// Security service: rate limiting, input validation, helmet helpers
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (err) {
  console.warn('⚠️ express-rate-limit not installed; rate limiting disabled');
  // Dummy middleware if not available
  rateLimit = () => (req, res, next) => next();
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many auth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation helpers
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateUsername = (username) => {
  // Alphanumeric + underscore, 3-20 chars
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
};

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  sanitizeInput,
  validateEmail,
  validateUsername,
  validatePassword,
};
