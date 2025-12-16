const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '/api',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'wimpex_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DATABASE_URL
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'wimpex_secret_key_2025',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'wimpex-uploads',
    cloudfront: process.env.CLOUDFRONT_DOMAIN
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@wimpex.app'
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  }
};
