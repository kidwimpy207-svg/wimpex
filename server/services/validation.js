const config = require('../config');

// Input validation rules
const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone) => /^[\d+\-() ]{10,}$/.test(phone),
  username: (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username),
  password: (password) => password && password.length >= 6,
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  bio: (bio) => bio && bio.length <= 200,
  snapCaption: (caption) => caption && caption.length <= 500
};

// Sanitization: remove or escape dangerous content
function sanitizeInput(input, type = 'text', maxLength = 500) {
  if (!input) return '';
  
  let sanitized = String(input).substring(0, maxLength);
  
  // Remove potentially dangerous HTML/JS
  sanitized = sanitized
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Validate and sanitize input
function validateAndSanitize(data, schema) {
  const errors = {};
  const sanitized = {};
  
  Object.keys(schema).forEach(key => {
    const rule = schema[key];
    const value = data[key];
    
    // Check required
    if (rule.required && !value) {
      errors[key] = `${key} is required`;
      return;
    }
    
    if (!value) {
      sanitized[key] = null;
      return;
    }
    
    // Validate
    if (rule.type && validators[rule.type]) {
      if (!validators[rule.type](value)) {
        errors[key] = `${key} is invalid`;
        return;
      }
    }
    
    // Sanitize
    sanitized[key] = sanitizeInput(value, rule.type, rule.maxLength || 500);
  });
  
  return { valid: Object.keys(errors).length === 0, errors, data: sanitized };
}

// Rate limiting helpers
const rateLimitStore = new Map();

function checkRateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
  
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return entry.count <= limit;
}

function getRateLimitStatus(key) {
  return rateLimitStore.get(key) || { count: 0, resetAt: Date.now() };
}

module.exports = {
  validators,
  sanitizeInput,
  validateAndSanitize,
  checkRateLimit,
  getRateLimitStatus
};
