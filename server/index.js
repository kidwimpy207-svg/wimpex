const http = require('http');
const WebSocket = require('ws');
const app = require('./app');
const config = require('./config');
const { handleConnection } = require('./services/websocket');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', handleConnection);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`🌟 Wimpex server running on http://0.0.0.0:${config.port}`);
  console.log(`Resource Prefix: ${config.apiPrefix}`);
});
