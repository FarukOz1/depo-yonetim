import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import CameraScanner from '../components/CameraScanner';

export default function StockExit() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [barcode, setBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState(location.state?.product || null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const barcodeRef = useRef();

  useEffect(() => {
    if (!foundProduct) barcodeRef.current?.focus();
  }, []);

  const handleBarcodeSearch = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    setSearching(true);
    setFoundProduct(null);
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      const product = data.data;

      const existing = cart.find((c) => c.product_id === product.id);
      if (existing) {
        toast(`"${product.product_name}" zaten listede`, { icon: 'ℹ️' });
        setBarcode('');
        barcodeRef.current?.focus();
        return;
      }

      setFoundProduct(product);
      setQty(1);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(`Barkod bulunamadı: ${code}`);
      } else {
        toast.error('Ürün aranırken hata oluştu');
      }
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

  const addToCart = () => {
    if (!foundProduct) return;
    if (qty <= 0) { toast.error('Geçerli bir adet giriniz'); return; }
    if (qty > foundProduct.current_stock) {
      toast.error(`Yetersiz stok! Mevcut: ${foundProduct.current_stock} ${foundProduct.unit}`);
      return;
    }

    setCart([...cart, {
      product_id: foundProduct.id,
      barcode: foundProduct.barcode,
      product_name: foundProduct.product_name,
      product_code: foundProduct.product_code,
      unit: foundProduct.unit,
      current_stock: foundProduct.current_stock,
      quantity: parseInt(qty),
    }]);
    setFoundProduct(null);
    setQty(1);
    toast.success(`"${foundProduct.product_name}" listeye eklendi`);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const updateQty = (idx, newQty) => {
    const item = cart[idx];
    if (newQty <= 0 || newQty > item.current_stock) return;
    const updated = [...cart];
    updated[idx] = { ...item, quantity: parseInt(newQty) };
    setCart(updated);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Liste boş'); return; }
    if (!window.confirm(`${cart.length} ürün için stok çıkışı onaylansın mı?`)) return;

    setSubmitting(true);
    try {
      const items = cart.map(({ product_id, quantity }) => ({ product_id, quantity }));
      const { data } = await api.post('/movements/out', { items, note });
      toast.success(data.message);
      setCart([]);
      setNote('');
      barcodeRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Çıkış işlemi başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}

      <h1 className="text-xl font-bold">📤 Stok Çıkışı</h1>

      {/* Barkod okuma */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Barkod Okut</h2>
        <form onSubmit={handleBarcodeSearch} className="flex gap-3">
          <input
            ref={barcodeRef}
            type="text"
            className="input flex-1 font-mono text-base"
            placeholder="Barkod okutun veya yazın..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoFocus
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
            {searching
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🔍'}
            Ara
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          📷 Kamera ile taranan QR kodlar ürün detay sayfasına yönlendirir.
        </p>

        {foundProduct && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1">
                <div className="font-bold text-gray-900">{foundProduct.product_name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Kod: {foundProduct.product_code} &nbsp;|&nbsp; Barkod: {foundProduct.barcode}
                </div>
                <div className="text-sm mt-1">
                  Mevcut Stok:
                  <span className={`ml-2 badge ${foundProduct.current_stock <= foundProduct.min_stock_level ? 'badge-warning' : 'badge-success'}`}>
                    {foundProduct.current_stock} {foundProduct.unit}
                  </span>
                  {foundProduct.location && (
                    <span className="ml-2 text-gray-500">📍 {foundProduct.location}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="label text-xs">Adet</label>
                  <input
                    type="number"
                    className="input w-24"
                    min="1"
                    max={foundProduct.current_stock}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                    autoFocus
                  />
                </div>
                <div className="mt-5">
                  <button className="btn-success" onClick={addToCart}>
                    + Listeye Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sepet / Liste */}
      {cart.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Çıkış Listesi ({cart.length} ürün)</h2>
            <button className="text-sm text-red-500 hover:underline" onClick={() => setCart([])}>
              Listeyi Temizle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Barkod</th>
                  <th>Ürün Adı</th>
                  <th>Mevcut</th>
                  <th>Çıkış Adedi</th>
                  <th>Kaldır</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={item.product_id}>
                    <td className="text-gray-400">{i + 1}</td>
                    <td className="font-mono text-xs">{item.barcode}</td>
                    <td className="font-medium">{item.product_name}</td>
                    <td><span className="badge badge-gray">{item.current_stock} {item.unit}</span></td>
                    <td>
                      <input
                        type="number"
                        className="input w-20 text-center"
                        min="1"
                        max={item.current_stock}
                        value={item.quantity}
                        onChange={(e) => updateQty(i, e.target.value)}
                      />
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Not (opsiyonel)</label>
              <input
                className="input"
                placeholder="İşlem notu..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button className="btn-success" onClick={handleSubmit} disabled={submitting}>
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                ✅ Çıkışı Onayla ({cart.length} ürün)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
