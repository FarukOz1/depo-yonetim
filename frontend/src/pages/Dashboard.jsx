import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, lowStockItems, todayMovements, recentMovements, topMovedProducts } = data || {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Toplam Ürün" value={stats?.total_products} icon="📦" color="bg-blue-50" />
        <StatCard label="Kritik Stok" value={stats?.low_stock_count} icon="⚠️" color="bg-yellow-50" />
        <StatCard label="Sıfır Stok" value={stats?.zero_stock_count} icon="🚨" color="bg-red-50" />
        <StatCard label="Bugün Çıkış" value={todayMovements?.today_out_count} icon="📤" color="bg-green-50" />
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm font-semibold text-gray-700 mb-3">Bugünkü Hareketler</div>
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-bold text-green-600">{todayMovements?.today_in_qty ?? 0}</div>
              <div className="text-xs text-gray-500">Giriş Adeti</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{todayMovements?.today_out_qty ?? 0}</div>
              <div className="text-xs text-gray-500">Çıkış Adeti</div>
            </div>
          </div>
        </div>

        {/* Top moved */}
        <div className="card">
          <div className="text-sm font-semibold text-gray-700 mb-3">Son 30 Günde En Çok Hareket</div>
          <div className="space-y-2">
            {topMovedProducts?.length === 0 && (
              <p className="text-sm text-gray-400">Henüz hareket yok</p>
            )}
            {topMovedProducts?.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[160px]">{p.product_name}</span>
                <span className="text-gray-500 shrink-0">{p.movement_count} hareket</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical stock alert */}
      {lowStockItems?.length > 0 && (
        <div className="card border-l-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚠️</span>
            <h2 className="font-semibold text-gray-800">Kritik Stok Uyarısı ({lowStockItems.length} ürün)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Barkod</th>
                  <th>Mevcut</th>
                  <th>Min.</th>
                  <th>Lokasyon</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.product_name}</td>
                    <td className="font-mono text-xs">{item.barcode}</td>
                    <td>
                      <span className={`badge ${item.current_stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {item.current_stock} {item.unit}
                      </span>
                    </td>
                    <td className="text-gray-500">{item.min_stock_level}</td>
                    <td className="text-gray-500">{item.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Son Hareketler</h2>
        {recentMovements?.length === 0 ? (
          <p className="text-sm text-gray-400">Henüz hareket kaydı yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Tarih/Saat</th>
                  <th>Tip</th>
                  <th>Ürün</th>
                  <th>Adet</th>
                  <th>Personel</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements?.map((m) => (
                  <tr key={m.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(m.created_at), 'dd MMM HH:mm', { locale: tr })}
                    </td>
                    <td>
                      <span className={m.movement_type === 'IN' ? 'badge-success badge' : 'badge-danger badge'}>
                        {m.movement_type === 'IN' ? '📥 Giriş' : '📤 Çıkış'}
                      </span>
                    </td>
                    <td className="font-medium">{m.product_name}</td>
                    <td>{m.quantity} {m.unit}</td>
                    <td className="text-gray-500">{m.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
