const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');

exports.handler = async function handler() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DB_URL;
  if (!connectionString) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'NETLIFY_DATABASE_URL not set' }) };
  }

  const pool = new Pool({ connectionString });
  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    const results = [];
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const res = await pool.query(sql);
      results.push({ file, rowCount: res.rowCount });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ migrated: true, results }) };
  } catch (error) {
    console.error('Migration run error', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(error?.message || error) }) };
  } finally {
    await pool.end();
  }
};
