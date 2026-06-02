require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration başarıyla tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('Migration hatası:', err.message);
    process.exit(1);
  }
}

runMigration();
