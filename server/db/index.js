const { Pool } = require('pg');
const config = require('../config');

const poolConfig = config.db.connectionString
    ? { connectionString: config.db.connectionString }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
    };

const pool = new Pool(poolConfig);

// Test connection
pool.connect()
    .then(client => {
        console.log('✅ Connected to PostgreSQL database');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        console.warn('⚠️ Server may not function correctly without database connection.');
    });

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
