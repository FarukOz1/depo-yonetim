const db   = require('../config/db');
const xlsx = require('xlsx');
const fs   = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { search, lowStock, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE p.is_active = 1';

    if (search) {
      const s = `%${search}%`;
      params.push(s, s, s);
      where += ' AND (p.barcode LIKE ? OR p.product_name LIKE ? OR p.product_code LIKE ?)';
    }

    if (lowStock === 'true') {
      where += ' AND p.current_stock <= p.min_stock_level';
    }

    const { count } = db.prepare(
      `SELECT COUNT(*) AS count FROM products p ${where}`
    ).get(...params);

    const rows = db.prepare(
      `SELECT p.*, u.name AS created_by_name
       FROM products p
       LEFT JOIN users u ON u.id = p.created_by
       ${where}
       ORDER BY p.product_name ASC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Ürünler alınamadı' });
  }
};

exports.getByBarcode = async (req, res) => {
  try {
    const product = db.prepare(
      'SELECT * FROM products WHERE barcode = ? AND is_active = 1'
    ).get(req.params.barcode.trim());

    if (!product) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = db.prepare(
      'SELECT * FROM products WHERE id = ? AND is_active = 1'
    ).get(req.params.id);

    if (!product) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
};

exports.create = async (req, res) => {
  let { barcode } = req.body;
  const { product_name, product_code, unit, current_stock, min_stock_level, location, description } = req.body;

  if (!barcode) {
    const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
    barcode = `PRD-${Date.now()}-${rand}`;
  }

  if (!product_name || !product_code) {
    return res.status(400).json({ success: false, message: 'Ürün adı ve ürün kodu zorunludur' });
  }

  try {
    // Sadece aktif ürünlerde duplicate kontrolü yap
    const activeDup = db.prepare(
      'SELECT id FROM products WHERE (barcode = ? OR product_code = ?) AND is_active = 1'
    ).get(barcode.trim(), product_code.trim());

    if (activeDup) return res.status(409).json({ success: false, message: 'Bu barkod veya ürün kodu zaten kayıtlı' });

    // Silinmiş (is_active=0) aynı barkodlu ürün varsa yeniden aktif et
    const deleted = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode.trim());
    let productId;

    if (deleted) {
      db.prepare(`
        UPDATE products
        SET product_name=?, product_code=?, unit=?, current_stock=?,
            min_stock_level=?, location=?, description=?, is_active=1,
            updated_at=datetime('now')
        WHERE id=?
      `).run(
        product_name.trim(), product_code.trim(),
        unit || 'Adet',
        parseInt(current_stock) || 0,
        parseInt(min_stock_level) || 0,
        location || null, description || null, deleted.id
      );
      productId = deleted.id;
    } else {
      const info = db.prepare(`
        INSERT INTO products (barcode, product_name, product_code, unit, current_stock, min_stock_level, location, description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        barcode.trim(), product_name.trim(), product_code.trim(),
        unit || 'Adet',
        parseInt(current_stock) || 0,
        parseInt(min_stock_level) || 0,
        location || null, description || null, req.user.id
      );
      productId = info.lastInsertRowid;
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json({ success: true, data: product, message: 'Ürün başarıyla eklendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Ürün eklenemedi' });
  }
};

exports.update = async (req, res) => {
  const { barcode, product_name, product_code, unit, current_stock, min_stock_level, location, description } = req.body;
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });

    const dup = db.prepare(
      'SELECT id FROM products WHERE (barcode = ? OR product_code = ?) AND id != ? AND is_active = 1'
    ).get(barcode.trim(), product_code.trim(), id);

    if (dup) return res.status(409).json({ success: false, message: 'Bu barkod veya ürün kodu başka bir ürüne ait' });

    db.prepare(`
      UPDATE products
      SET barcode=?, product_name=?, product_code=?, unit=?,
          current_stock=?, min_stock_level=?, location=?, description=?,
          updated_at=datetime('now')
      WHERE id=?
    `).run(
      barcode.trim(), product_name.trim(), product_code.trim(),
      unit || 'Adet',
      parseInt(current_stock) || 0,
      parseInt(min_stock_level) || 0,
      location || null, description || null, id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Ürün güncellendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Güncelleme başarısız' });
  }
};

exports.remove = async (req, res) => {
  try {
    const info = db.prepare(
      "UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);

    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    res.json({ success: true, message: 'Ürün silindi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Silme işlemi başarısız' });
  }
};

exports.importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Excel dosyası yüklenmedi' });

  const filePath = req.file.path;
  const errors   = [];
  const successes = [];

  try {
    const workbook  = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows      = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (rows.length === 0) return res.status(400).json({ success: false, message: 'Excel dosyası boş' });

    const upsert = db.prepare(`
      INSERT INTO products (barcode, product_name, product_code, unit, current_stock, min_stock_level, location, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(barcode) DO UPDATE SET
        product_name    = excluded.product_name,
        unit            = excluded.unit,
        current_stock   = excluded.current_stock,
        min_stock_level = excluded.min_stock_level,
        location        = excluded.location,
        description     = excluded.description,
        is_active       = 1,
        updated_at      = datetime('now')
    `);

    const doImport = db.transaction((rows) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        // Başlıkları ASCII'ye normalize et:
        // 1) Büyük Türkçe İ → I (toLowerCase öncesi, aksi hâlde 2 karaktere dönüşür)
        // 2) toLowerCase()
        // 3) Türkçe özel karakterleri ASCII karşılıklarıyla değiştir
        // Böylece "ÜRÜN ADI", "Ürün Adı", "urun adi" hepsi aynı anahtara düşer.
        const nk = (s) => s
          .replace(/İ/g, 'I')
          .toLowerCase()
          .trim()
          .replace(/ı/g, 'i')
          .replace(/ü/g, 'u')
          .replace(/ö/g, 'o')
          .replace(/ş/g, 's')
          .replace(/ç/g, 'c')
          .replace(/ğ/g, 'g');

        const norm = {};
        for (const key of Object.keys(row)) {
          norm[nk(key)] = row[key];
        }

        const barcode       = String(norm['barkod']      || norm['barcode']                         || '').trim();
        const product_name  = String(norm['urun adi']    || norm['urunadi']   || norm['product_name'] || '').trim();
        const product_code  = String(norm['kod']         || norm['urun kodu'] || norm['product_code'] || norm['urunkodu'] || '').trim();
        const unit          = String(norm['birim']       || norm['unit']                             || 'Adet').trim() || 'Adet';
        const current_stock = parseInt(norm['stok']      || norm['mevcut stok'] || norm['current_stock'] || 0) || 0;
        const min_stock     = parseInt(norm['min.']      || norm['min stok']  || norm['min_stock_level'] || norm['kritik stok'] || norm['minimum stok'] || 0) || 0;
        const location      = String(norm['lokasyon']    || norm['location']  || norm['raf']         || '').trim() || null;
        const description   = String(norm['aciklama']    || norm['description']                      || '').trim() || null;

        if (!barcode)      { errors.push({ row: rowNum, reason: 'Barkod boş' }); continue; }
        if (!product_name) { errors.push({ row: rowNum, reason: 'Ürün adı boş' }); continue; }
        if (!product_code) { errors.push({ row: rowNum, reason: 'Ürün kodu boş' }); continue; }

        try {
          upsert.run(barcode, product_name, product_code, unit, current_stock, min_stock, location, description, req.user.id);
          successes.push({ row: rowNum, barcode, product_name });
        } catch (e) {
          errors.push({ row: rowNum, reason: e.message.includes('UNIQUE') ? 'Ürün kodu çakışması' : e.message });
        }
      }
    });

    doImport(rows);

    res.json({
      success: true,
      message: `${successes.length} ürün aktarıldı, ${errors.length} hata`,
      imported: successes.length,
      failed:   errors.length,
      errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Excel işlenemedi: ' + err.message });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
