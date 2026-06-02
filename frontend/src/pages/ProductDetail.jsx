import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(({ data }) => setProduct(data.data))
      .catch(() => {
        toast.error('Ürün bulunamadı');
        navigate('/products');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const stockClass =
    product.current_stock === 0
      ? 'badge-danger'
      : product.current_stock <= product.min_stock_level
      ? 'badge-warning'
      : 'badge-success';

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          ← Geri
        </button>
        <h1 className="text-xl font-bold flex-1">{product.product_name}</h1>
      </div>

      <div className="card">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Barkod</p>
            <p className="font-mono font-semibold tracking-wider">{product.barcode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Ürün Kodu</p>
            <p className="font-semibold">{product.product_code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Mevcut Stok</p>
            <span className={`badge ${stockClass}`}>
              {product.current_stock} {product.unit}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Min. Stok</p>
            <p className="font-semibold">{product.min_stock_level}</p>
          </div>
          {product.location && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Lokasyon</p>
              <p className="font-semibold">📍 {product.location}</p>
            </div>
          )}
          {product.description && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-0.5">Açıklama</p>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isAdmin && (
          <button
            className="btn-primary justify-center"
            onClick={() => navigate('/stock-entry', { state: { product } })}
          >
            📥 Stok Girişi
          </button>
        )}
        <button
          className={`btn-success justify-center ${!isAdmin ? 'col-span-2' : ''}`}
          onClick={() => navigate('/stock-exit', { state: { product } })}
        >
          📤 Stok Çıkışı
        </button>
      </div>
    </div>
  );
}
