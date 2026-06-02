-- Depo Yönetim Sistemi - Veritabanı Şeması
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- KULLANICILAR
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =========================================
-- ÜRÜNLER
-- =========================================
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  barcode         VARCHAR(100) NOT NULL UNIQUE,   -- CODE128 barkod
  product_name    VARCHAR(200) NOT NULL,
  product_code    VARCHAR(100) NOT NULL UNIQUE,
  unit            VARCHAR(30)  NOT NULL DEFAULT 'Adet',  -- Adet, Kutu, Paket, Kg, Lt...
  current_stock   INTEGER      NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock_level INTEGER      NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  location        VARCHAR(100),                   -- Raf / Lokasyon
  description     TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by      INTEGER      REFERENCES users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode      ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_low_stock    ON products(current_stock, min_stock_level) WHERE is_active = TRUE;

-- =========================================
-- STOK HAREKETLERİ
-- =========================================
CREATE TABLE IF NOT EXISTS movements (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER      NOT NULL REFERENCES products(id),
  user_id         INTEGER      NOT NULL REFERENCES users(id),
  movement_type   VARCHAR(10)  NOT NULL CHECK (movement_type IN ('IN', 'OUT')),  -- Giriş / Çıkış
  quantity        INTEGER      NOT NULL CHECK (quantity > 0),
  stock_before    INTEGER      NOT NULL,
  stock_after     INTEGER      NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product  ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_user     ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_type     ON movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_date     ON movements(created_at DESC);

-- =========================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at    ON users;
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- VARSAYILAN YÖNETİCİ (admin / admin123)
-- =========================================
INSERT INTO users (name, username, password, role)
VALUES (
  'Sistem Yöneticisi',
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123 (bcrypt)
  'admin'
) ON CONFLICT (username) DO NOTHING;
