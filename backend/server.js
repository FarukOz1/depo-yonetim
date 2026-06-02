require('dotenv').config();

// DB bağlantısı ve tablo init — routes'tan önce tetiklenmeli
require('./src/config/db');

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes      = require('./src/routes/auth');
const productRoutes   = require('./src/routes/products');
const movementRoutes  = require('./src/routes/movements');
const userRoutes      = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();

const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProd ? process.env.FRONTEND_URL : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Production: React build'ini servis et
if (isProd) {
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Sunucu hatası' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Depo Yönetim API çalışıyor → http://localhost:${PORT}`);
});
