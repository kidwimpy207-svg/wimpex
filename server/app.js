const express = require('express');
const cors = require('cors');
const path = require('path');
let helmet;
try {
  helmet = require('helmet');
} catch (err) {
  console.warn('⚠️ helmet not installed; skipping security headers');
  helmet = (req, res, next) => next();
}
const config = require('./config');
const routes = require('./routes');
const { apiLimiter } = require('./services/security');
const { MEDIA_DIR } = require('./services/store');

const app = express();

// Security middleware
app.use(helmet);
app.use(apiLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use(config.apiPrefix || '/api', routes);

// Static Files
app.use(express.static(path.join(__dirname, '../client')));
app.use('/media', express.static(MEDIA_DIR));

module.exports = app;
