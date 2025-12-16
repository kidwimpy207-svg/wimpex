const { createClient } = require('redis');
const config = require('../config');

const redisUrl = config.redis.password
    ? `redis://${config.redis.password}@${config.redis.host}:${config.redis.port}`
    : `redis://${config.redis.host}:${config.redis.port}`;

const client = createClient({
    url: redisUrl
});

client.on('error', (err) => console.error('❌ Redis Client Error', err));
client.on('connect', () => console.log('✅ Connected to Redis'));

// Connect immediately
client.connect().catch(console.error);

module.exports = client;
