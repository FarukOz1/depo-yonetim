const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });
  }

  try {
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).get(username.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Giriş yapılırken hata oluştu' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, name, username, role, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Geçerli şifre bilgileri giriniz (min. 6 karakter)' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?")
      .run(hashed, req.user.id);

    res.json({ success: true, message: 'Şifre başarıyla güncellendi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
};
