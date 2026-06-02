const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    // ── Genel ürün istatistikleri ──────────────────────────────────────────
    // SQLite'ta COUNT(*) FILTER desteklenmez → CASE WHEN kullanılır
    const productStats = db.prepare(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) AS low_stock_count,
        SUM(CASE WHEN current_stock = 0              THEN 1 ELSE 0 END) AS zero_stock_count
      FROM products
      WHERE is_active = 1
    `).get();

    // ── Kritik stok ürünleri (en kötü 10) ────────────────────────────────
    const lowStockItems = db.prepare(`
      SELECT id, barcode, product_name, product_code, unit,
             current_stock, min_stock_level, location
      FROM products
      WHERE is_active = 1 AND current_stock <= min_stock_level
      ORDER BY (current_stock - min_stock_level) ASC
      LIMIT 10
    `).all();

    // ── Bugünkü hareket özeti ─────────────────────────────────────────────
    const todayMovements = db.prepare(`
      SELECT
        SUM(CASE WHEN movement_type = 'IN'  THEN 1 ELSE 0 END) AS today_in_count,
        SUM(CASE WHEN movement_type = 'OUT' THEN 1 ELSE 0 END) AS today_out_count,
        COALESCE(SUM(CASE WHEN movement_type = 'IN'  THEN quantity ELSE 0 END), 0) AS today_in_qty,
        COALESCE(SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END), 0) AS today_out_qty
      FROM movements
      WHERE created_at >= date('now')
    `).get();

    // ── Son 10 hareket ────────────────────────────────────────────────────
    const recentMovements = db.prepare(`
      SELECT
        m.id, m.movement_type, m.quantity, m.created_at,
        p.product_name, p.unit,
        u.name AS user_name
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN users   u ON u.id = m.user_id
      ORDER BY m.created_at DESC
      LIMIT 10
    `).all();

    // ── Son 30 günde en çok hareket gören ürünler ─────────────────────────
    const topMovedProducts = db.prepare(`
      SELECT
        p.product_name, p.product_code, p.unit,
        COUNT(*) AS movement_count,
        SUM(CASE WHEN m.movement_type = 'OUT' THEN m.quantity ELSE 0 END) AS total_out
      FROM movements m
      JOIN products p ON p.id = m.product_id
      WHERE m.created_at >= datetime('now', '-30 days')
      GROUP BY p.id, p.product_name, p.product_code, p.unit
      ORDER BY movement_count DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        stats: productStats,
        lowStockItems,
        todayMovements,
        recentMovements,
        topMovedProducts,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Dashboard verileri alınamadı' });
  }
};
