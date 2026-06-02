import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import CameraScanner from '../components/CameraScanner';

export default function StockEntry() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [barcode, setBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState(location.state?.product || null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const barcodeRef = useRef();

  useEffect(() => {
    if (!foundProduct) barcodeRef.current?.focus();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setSearching(true);
    setFoundProduct(null);
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      setFoundProduct(data.data);
      setQty(1);
    } catch (err) {
      toast.error(err.response?.status === 404 ? `Barkod bulunamadı: ${code}` : 'Arama hatası');
    } finally {
      setSearching(false);
      setBarcode('');
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

  const handleSubmit = async () => {
    if (!foundProduct || qty <= 0) { toast.error('Ürün ve adet gerekli'); return; }
    setSubmitting(true);
    try {
      await api.post('/movements/in', {
        product_id: foundProduct.id,
        quantity: parseInt(qty),
        note: note || undefined,
      });
      toast.success(`Stok girişi kaydedildi: +${qty} ${foundProduct.unit}`);
      setFoundProduct(null);
      setNote('');
      setQty(1);
      barcodeRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Giriş başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}

      <h1 className="text-xl font-bold">📥 Stok Girişi</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Barkod Okut</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            ref={barcodeRef}
            type="text"
            className="input flex-1 font-mono"
            placeholder="Barkod okutun veya yazın..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCamera(true)}
            title="Kamera ile tara"
          >
            📷
          </button>
          <button type="submit" className="btn-primary" disabled={searching || !barcode}>
            {searching ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔍'}
            Ara
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          📷 Kamera ile taranan QR kodlar ürün detay sayfasına yönlendirir.
        </p>

        {foundProduct && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl space-y-4">
            <div>
              <div className="font-bold text-gray-900">{foundProduct.product_name}</div>
              <div className="text-sm text-gray-500">Kod: {foundProduct.product_code} | Barkod: {foundProduct.barcode}</div>
              <div className="text-sm mt-1">
                Mevcut Stok:
                <span className="ml-2 badge badge-info">{foundProduct.current_stock} {foundProduct.unit}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="label">Giriş Adedi</label>
                <input
                  type="number"
                  className="input w-28"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="label">Not (opsiyonel)</label>
                <input
                  className="input"
                  placeholder="Tedarikçi, sipariş no..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-success flex-1 justify-center" onClick={handleSubmit} disabled={submitting}>
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                ✅ Stok Girişini Kaydet
              </button>
              <button className="btn-secondary" onClick={() => setFoundProduct(null)}>İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
