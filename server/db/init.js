const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function initDb() {
    try {
        console.log('⏳ Initializing database...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('✅ Database initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    }
}

initDb();
