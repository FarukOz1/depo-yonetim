# Depo Hareket Takip Sistemi

Android + Bluetooth Barkod Okuyucu destekli, web tabanlı depo yönetim uygulaması.

## Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite + Tailwind CSS |
| Veritabanı | PostgreSQL |
| Auth | JWT (8 saatlik token) |

---

## Kurulum

### 1. PostgreSQL Veritabanı Oluştur

```sql
CREATE DATABASE depo_yonetim;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# .env dosyasındaki DB_PASSWORD ve JWT_SECRET değerlerini düzenleyin

npm install
npm run migrate        # Tabloları oluşturur + varsayılan admin hesabı ekler
npm run dev            # Geliştirme sunucusu → http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # → http://localhost:5173
```

---

## Varsayılan Kullanıcı

| Alan | Değer |
|------|-------|
| Kullanıcı Adı | `admin` |
| Şifre | `admin123` |
| Rol | Yönetici (admin) |

> **İlk girişten sonra şifrenizi değiştirin.**

---

## Özellikler

### Yönetici (Admin)
- Dashboard: kritik stok uyarıları, günlük hareket özeti
- Ürün ekleme / düzenleme / silme
- **Excel'den toplu ürün aktarımı** (`.xlsx`)
- Stok girişi
- Tüm hareket geçmişi (filtrelenebilir)
- Kullanıcı yönetimi (oluştur / düzenle / pasifleştir)

### Depocu (Operator)
- Barkod okutarak stok çıkışı (Bluetooth okuyucu destekli)
- Stok görüntüleme (arama + kritik stok filtresi)
- Kendi hareket geçmişi

---

## Excel İçe Aktarma Formatı

| Sütun | Zorunlu | Açıklama |
|-------|---------|----------|
| Barkod | ✅ | CODE128 barkod numarası |
| Ürün Adı | ✅ | Ürün tam adı |
| Ürün Kodu | ✅ | Benzersiz ürün kodu |
| Birim | | Varsayılan: Adet |
| Mevcut Stok | | Varsayılan: 0 |
| Min Stok | | Kritik stok seviyesi |
| Lokasyon | | Raf/depo konumu |
| Açıklama | | Serbest metin |

> Aynı barkod tekrar yüklenirse mevcut kayıt **güncellenir** (upsert).

---

## API Uçları

```
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/change-password

GET    /api/products              ?search=&lowStock=&page=&limit=
GET    /api/products/barcode/:barcode
GET    /api/products/:id
POST   /api/products              [admin]
PUT    /api/products/:id          [admin]
DELETE /api/products/:id          [admin]
POST   /api/products/import/excel [admin]

GET    /api/movements             ?type=&dateFrom=&dateTo=&page=
POST   /api/movements/out         (çoklu ürün)
POST   /api/movements/in          [admin]

GET    /api/users                 [admin]
POST   /api/users                 [admin]
PUT    /api/users/:id             [admin]
DELETE /api/users/:id             [admin]

GET    /api/dashboard/stats
```

---

## Barkod Okuyucu Entegrasyonu

Bluetooth barkod okuyucular PC/tablet'e HID klavye olarak bağlanır.  
Barkod okunduktan sonra otomatik **Enter** gönderir — bu sistem bu davranışı kullanır.  
Stok Çıkışı sayfasında barkod alanı her zaman odaklanmış durumdadır; okuyucuyu doğrultup tetikleyin, ürün anında eşleşir.

---

## Proje Yapısı

```
DepoYönetimSistemi/
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/          # authController, productController, movementController, userController, dashboardController
│   │   ├── middleware/            # auth.js (JWT), roleCheck.js
│   │   ├── migrations/           # schema.sql, run.js
│   │   └── routes/               # auth, products, movements, users, dashboard
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/AuthContext.jsx
    │   ├── services/api.js
    │   ├── components/            # Layout, Sidebar, Navbar
    │   └── pages/                 # Login, Dashboard, Products, StockExit, StockEntry, Movements, Users
    ├── vite.config.js
    └── package.json
```
