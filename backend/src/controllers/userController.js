const bcrypt = require('bcryptjs');
const db     = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, name, username, role, is_active, created_at FROM users ORDER BY name ASC'
    ).all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kullanıcılar alınamadı' });
  }
};

exports.create = async (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Ad, kullanıcı adı ve en az 6 karakterli şifre zorunludur' });
  }

  if (!['admin', 'operator'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Geçersiz rol' });
  }

  try {
    const dup = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (dup) return res.status(409).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış' });

    const hashed = await bcrypt.hash(password, 10);
    const info = db.prepare(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), username.trim().toLowerCase(), hashed, role);

    const user = db.prepare(
      'SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?'
    ).get(info.lastInsertRowid);

    res.status(201).json({ success: true, data: user, message: 'Kullanıcı oluşturuldu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Kullanıcı oluşturulamadı' });
  }
};

exports.update = async (req, res) => {
  const { name, username, role, is_active, password } = req.body;
  const { id } = req.params;

  if (parseInt(id) === req.user.id && is_active === false) {
    return res.status(400).json({ success: false, message: 'Kendi hesabınızı pasifleştiremezsiniz' });
  }

  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const dup = db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).get(username.trim().toLowerCase(), id);
    if (dup) return res.status(409).json({ success: false, message: 'Bu kullanıcı adı başka birine ait' });

    let hashedPw = existing.password;
    if (password && password.length >= 6) {
      hashedPw = await bcrypt.hash(password, 10);
    }

    db.prepare(`
      UPDATE users
      SET name=?, username=?, role=?, is_active=?, password=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      name.trim(),
      username.trim().toLowerCase(),
      role,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      hashedPw,
      id
    );

    const updated = db.prepare(
      'SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({ success: true, data: updated, message: 'Kullanıcı güncellendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Güncelleme başarısız' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Kendi hesabınızı silemezsiniz' });
  }

  try {
    const info = db.prepare(
      "UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).run(id);

    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Silme işlemi başarısız' });
  }
};
