const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, userId, productId, dateFrom, dateTo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    // Operatörler yalnızca kendi hareketlerini görebilir
    if (req.user.role === 'operator') {
      params.push(req.user.id);
      conditions.push('m.user_id = ?');
    } else if (userId) {
      params.push(parseInt(userId));
      conditions.push('m.user_id = ?');
    }

    if (type) {
      params.push(type.toUpperCase());
      conditions.push('m.movement_type = ?');
    }

    if (productId) {
      params.push(parseInt(productId));
      conditions.push('m.product_id = ?');
    }

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push('m.created_at >= ?');
    }

    if (dateTo) {
      // Bitiş tarihi dahil: ertesi güne kadar al
      const d = new Date(dateTo);
      d.setDate(d.getDate() + 1);
      params.push(d.toISOString().split('T')[0]);
      conditions.push('m.created_at < ?');
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const { count } = db.prepare(
      `SELECT COUNT(*) AS count FROM movements m ${where}`
    ).get(...params);

    const rows = db.prepare(`
      SELECT
        m.id, m.movement_type, m.quantity, m.stock_before, m.stock_after,
        m.note, m.created_at,
        p.barcode, p.product_name, p.product_code, p.unit,
        u.name AS user_name, u.username
      FROM movements m
      JOIN products p ON p.id = m.product_id
      JOIN users   u ON u.id = m.user_id
      ${where}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Hareketler alınamadı' });
  }
};

// ─── Stok Çıkışı ──────────────────────────────────────────────────────────────
// better-sqlite3 transactionları senkron çalışır; herhangi bir fırlatılan hata
// otomatik ROLLBACK tetikler.
const _doStockOut = db.transaction((items, userId, note) => {
  const results = [];

  for (const item of items) {
    const { product_id, quantity } = item;

    if (!product_id || !quantity || quantity <= 0) {
      const err = new Error(`Geçersiz ürün veya adet (id: ${product_id})`);
      err.status = 400;
      throw err;
    }

    const product = db.prepare(
      'SELECT id, product_name, barcode, current_stock, unit FROM products WHERE id = ? AND is_active = 1'
    ).get(product_id);

    if (!product) {
      const err = new Error(`Ürün bulunamadı (id: ${product_id})`);
      err.status = 404;
      throw err;
    }

    if (product.current_stock < quantity) {
      const err = new Error(
        `Yetersiz stok: "${product.product_name}" — Mevcut: ${product.current_stock} ${product.unit}`
      );
      err.status = 409;
      throw err;
    }

    const newStock = product.current_stock - quantity;

    db.prepare(
      "UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newStock, product_id);

    const info = db.prepare(`
      INSERT INTO movements (product_id, user_id, movement_type, quantity, stock_before, stock_after, note)
      VALUES (?, ?, 'OUT', ?, ?, ?, ?)
    `).run(product_id, userId, quantity, product.current_stock, newStock, note || null);

    results.push({ id: info.lastInsertRowid, product_name: product.product_name, quantity, newStock });
  }

  return results;
});

exports.stockOut = async (req, res) => {
  const { items, note } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Hareket listesi boş' });
  }

  try {
    const results = _doStockOut(items, req.user.id, note);
    res.status(201).json({ success: true, data: results, message: `${results.length} ürün çıkışı kaydedildi` });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Çıkış işlemi başarısız' });
  }
};

// ─── Stok Girişi ──────────────────────────────────────────────────────────────
const _doStockIn = db.transaction((productId, quantity, userId, note) => {
  const product = db.prepare(
    'SELECT id, product_name, current_stock, unit FROM products WHERE id = ? AND is_active = 1'
  ).get(productId);

  if (!product) {
    const err = new Error('Ürün bulunamadı');
    err.status = 404;
    throw err;
  }

  const newStock = product.current_stock + quantity;

  db.prepare(
    "UPDATE products SET current_stock = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newStock, productId);

  const info = db.prepare(`
    INSERT INTO movements (product_id, user_id, movement_type, quantity, stock_before, stock_after, note)
    VALUES (?, ?, 'IN', ?, ?, ?, ?)
  `).run(productId, userId, quantity, product.current_stock, newStock, note || null);

  return { id: info.lastInsertRowid, product_name: product.product_name, quantity, newStock };
});

exports.stockIn = async (req, res) => {
  const { product_id, quantity, note } = req.body;

  if (!product_id || !quantity || parseInt(quantity) <= 0) {
    return res.status(400).json({ success: false, message: 'Ürün ve geçerli adet giriniz' });
  }

  try {
    const result = _doStockIn(parseInt(product_id), parseInt(quantity), req.user.id, note);
    res.status(201).json({ success: true, data: result, message: 'Stok girişi kaydedildi' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Giriş işlemi başarısız' });
  }
};
