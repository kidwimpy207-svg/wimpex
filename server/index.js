// Process-level error logging to capture crashes and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception - shutting down for safety:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason && reason.stack ? reason.stack : reason);
  process.exitCode = 1;
});

const http = require('http');
const WebSocket = require('ws');
let app;
let config;
let handleConnection = null;
try {
  app = require('./app');
  config = require('./config');
  ({ handleConnection } = require('./services/websocket'));
} catch (err) {
  console.error('Failed to initialize server modules:');
  console.error(err && err.stack ? err.stack : err);
  // give a clear non-zero exit so the process manager sees failure
  process.exit(1);
}

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', handleConnection);

// Normalize port and attach server error handler
const port = Number(config.port) || 3000;
server.on('error', (err) => {
  console.error('Server error:', err && err.stack ? err.stack : err);
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🌟 Wimpex server running on http://0.0.0.0:${port}`);
  console.log(`Resource Prefix: ${config.apiPrefix}`);
});
