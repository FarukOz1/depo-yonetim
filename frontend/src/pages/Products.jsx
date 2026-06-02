import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import CameraScanner from '../components/CameraScanner';

const UNITS = ['Adet', 'Kutu', 'Paket', 'Kg', 'Lt', 'Metre', 'Rulo', 'Takım'];

const emptyForm = {
  barcode: '', product_name: '', product_code: '', unit: 'Adet',
  current_stock: '', min_stock_level: '', location: '', description: '',
};

/* ── QR Etiket Yazdır Modalı ──────────────────────────────────────────── */
function LabelModal({ product, onClose }) {
  const labelRef = useRef();

  const handlePrint = () => {
    const svgData = labelRef.current.querySelector('svg')?.outerHTML || '';
    const win = window.open('', '_blank', 'width=420,height=520');
    win.document.write(`<!DOCTYPE html><html><head><style>
      body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif}
      .label{text-align:center;padding:20px 24px;border:2px solid #000;display:inline-block;min-width:180px}
      .name{font-size:14px;font-weight:700;margin-bottom:10px;max-width:200px;line-height:1.3}
      .code{font-family:monospace;font-size:12px;margin-top:8px;letter-spacing:1px}
      .sku{font-size:11px;color:#555;margin-top:3px}
    </style></head><body>
      <div class="label">
        <div class="name">${product.product_name}</div>
        ${svgData}
        <div class="code">${product.barcode}</div>
        <div class="sku">${product.product_code}</div>
      </div>
      <script>window.onload=function(){window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Etiket Yazdır</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <div ref={labelRef} className="text-center p-5 border-2 border-gray-800 rounded-lg">
            <p className="font-bold text-sm leading-tight mb-3 max-w-[180px] mx-auto">
              {product.product_name}
            </p>
            <QRCodeSVG value={product.barcode} size={150} />
            <p className="font-mono text-xs mt-2 tracking-widest">{product.barcode}</p>
            <p className="text-xs text-gray-500 mt-1">{product.product_code}</p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handlePrint} className="btn-primary flex-1 justify-center">
            🖨️ Yazdır
          </button>
          <button onClick={onClose} className="btn-secondary">Kapat</button>
        </div>
      </div>
    </div>
  );
}

/* ── Ürün Ekle/Düzenle Modalı ─────────────────────────────────────────── */
function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState(product || emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = !!product?.id;

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.product_name || !form.product_code) {
      toast.error('Ürün adı ve ürün kodu zorunludur');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/products/${product.id}`, form);
        toast.success('Ürün güncellendi');
      } else {
        await api.post('/products', form);
        toast.success('Ürün eklendi');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Barkod (boş bırakılırsa otomatik üretilir)</label>
            <input name="barcode" className="input" value={form.barcode} onChange={handle} placeholder="Otomatik üretilir" />
          </div>
          <div>
            <label className="label">Ürün Kodu *</label>
            <input name="product_code" className="input" value={form.product_code} onChange={handle} placeholder="Ürün kodu" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ürün Adı *</label>
            <input name="product_name" className="input" value={form.product_name} onChange={handle} placeholder="Ürün adı" required />
          </div>
          <div>
            <label className="label">Birim</label>
            <select name="unit" className="input" value={form.unit} onChange={handle}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Mevcut Stok</label>
            <input type="number" name="current_stock" className="input" value={form.current_stock} onChange={handle} min="0" placeholder="0" />
          </div>
          <div>
            <label className="label">Min. Stok Seviyesi</label>
            <input type="number" name="min_stock_level" className="input" value={form.min_stock_level} onChange={handle} min="0" placeholder="0" />
          </div>
          <div>
            <label className="label">Raf / Lokasyon</label>
            <input name="location" className="input" value={form.location} onChange={handle} placeholder="Örn: A1-R2" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Açıklama</label>
            <textarea name="description" className="input resize-none" rows={2} value={form.description} onChange={handle} placeholder="Opsiyonel açıklama" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Ana Bileşen ──────────────────────────────────────────────────────── */
export default function Products() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState(null);
  const [labelProduct, setLabelProduct] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();
  const LIMIT = 20;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (lowStockOnly) params.lowStock = 'true';
      const { data } = await api.get('/products', { params });
      setProducts(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, lowStockOnly]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" ürününü silmek istiyor musunuz?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Ürün silindi');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Silinemedi');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    setImporting(true);
    setImportResult(null);
    try {
      // fetch kullanıyoruz: tarayıcı Content-Type'ı boundary dahil otomatik set eder.
      // Axios instance default header'ları bunu bozabildiği için fetch tercih edildi.
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/products/import/excel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import başarısız');

      setImportResult(data);
      toast.success(`${data.imported} ürün aktarıldı`);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Import başarısız');
    } finally {
      setImporting(false);
      fileRef.current.value = '';
    }
  };

  const handleCameraScan = async (code) => {
    setShowCamera(false);
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      navigate(`/products/${data.data.id}`);
    } catch {
      toast.error(`Barkod bulunamadı: ${code}`);
    }
  };

  return (
    <div className="space-y-5">
      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}
      {labelProduct && (
        <LabelModal product={labelProduct} onClose={() => setLabelProduct(null)} />
      )}
      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchProducts(); }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold flex-1">Ürünler</h1>
        {isAdmin && (
          <>
            <label className="btn-secondary cursor-pointer">
              {importing
                ? <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                : '📥'}
              Excel İçe Aktar
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button className="btn-primary" onClick={() => setModal('new')}>+ Ürün Ekle</button>
          </>
        )}
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg text-sm ${importResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <strong>{importResult.message}</strong>
          {importResult.errors?.length > 0 && (
            <ul className="mt-2 space-y-1 list-disc list-inside text-red-600">
              {importResult.errors.slice(0, 10).map((e, i) => (
                <li key={i}>Satır {e.row}: {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filtreler */}
      <div className="card py-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input
              className="input"
              placeholder="Ürün adı, barkod veya kod ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCamera(true)}
            title="Kamera ile tara"
          >
            📷
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 accent-yellow-500"
            />
            Sadece Kritik Stok
          </label>
          <button type="submit" className="btn-primary">Ara</button>
          <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setLowStockOnly(false); setPage(1); }}>
            Temizle
          </button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Barkod</th>
                <th>Ürün Adı</th>
                <th>Kod</th>
                <th>Birim</th>
                <th>Stok</th>
                <th>Min.</th>
                <th>Lokasyon</th>
                {isAdmin && <th>İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Yükleniyor...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Ürün bulunamadı</td></tr>
              ) : products.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.barcode}</td>
                  <td className="font-medium">{p.product_name}</td>
                  <td className="text-gray-500 text-xs">{p.product_code}</td>
                  <td>{p.unit}</td>
                  <td>
                    <span className={`badge ${
                      p.current_stock === 0 ? 'badge-danger' :
                      p.current_stock <= p.min_stock_level ? 'badge-warning' : 'badge-success'
                    }`}>
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="text-gray-500">{p.min_stock_level}</td>
                  <td className="text-gray-500">{p.location || '—'}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Etiket Yazdır"
                          onClick={() => setLabelProduct(p)}
                        >
                          🏷️
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal(p)}
                        >
                          Düzenle
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(p.id, p.product_name)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{total} ürün, {Math.ceil(total / LIMIT)} sayfa</span>
            <div className="flex gap-2">
              <button
                className="btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Önceki
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium">{page}</span>
              <button
                className="btn-secondary btn-sm"
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => setPage(p => p + 1)}
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
