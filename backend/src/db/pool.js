const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL is not configured on the server.');
    err.status = 500;
    err.code = 'MISSING_DATABASE_URL';
    throw err;
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  return pool;
}

module.exports = { getPool };
