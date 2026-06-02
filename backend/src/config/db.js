const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
const db = new Database(DB_PATH);

// WAL modu: eşzamanlı okuma/yazma için daha iyi performans
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────
// TABLO OLUŞTURMA (yoksa)
// ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'operator'
                        CHECK (role IN ('admin', 'operator')),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode         TEXT    NOT NULL UNIQUE,
    product_name    TEXT    NOT NULL,
    product_code    TEXT    NOT NULL UNIQUE,
    unit            TEXT    NOT NULL DEFAULT 'Adet',
    current_stock   INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 0,
    location        TEXT,
    description     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_by      INTEGER REFERENCES users(id),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS movements (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id    INTEGER NOT NULL REFERENCES products(id),
    user_id       INTEGER NOT NULL REFERENCES users(id),
    movement_type TEXT    NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    quantity      INTEGER NOT NULL,
    stock_before  INTEGER NOT NULL,
    stock_after   INTEGER NOT NULL,
    note          TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_barcode      ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
  CREATE INDEX IF NOT EXISTS idx_movements_product     ON movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_movements_user        ON movements(user_id);
  CREATE INDEX IF NOT EXISTS idx_movements_date        ON movements(created_at);
`);

// ─────────────────────────────────────────────
// SEED: 3 Admin + 1 Depocu
// (INSERT OR IGNORE → tekrar çalıştırmak güvenli)
// ─────────────────────────────────────────────
const seedUsers = [
  { name: 'Sistem Yöneticisi', username: 'admin',  password: 'admin123', role: 'admin' },
  { name: 'Yönetici İki',      username: 'admin2', password: 'admin123', role: 'admin' },
  { name: 'Yönetici Üç',       username: 'admin3', password: 'admin123', role: 'admin' },
  { name: 'Depo Personeli',    username: 'depocu', password: 'depo123',  role: 'operator' },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, username, password, role)
  VALUES (?, ?, ?, ?)
`);

for (const u of seedUsers) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
  if (!exists) {
    insertUser.run(u.name, u.username, bcrypt.hashSync(u.password, 10), u.role);
    console.log(`  Kullanıcı oluşturuldu: ${u.username} (${u.role})`);
  }
}

console.log(`SQLite veritabanı hazır → ${DB_PATH}`);

module.exports = db;
