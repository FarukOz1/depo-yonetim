import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export default function Movements() {
  const { isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.type) params.type = filters.type;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const { data } = await api.get('/movements', { params });
      setMovements(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Hareketler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMovements(); }, [page]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMovements();
  };

  const resetFilters = () => {
    setFilters({ type: '', dateFrom: '', dateTo: '' });
    setPage(1);
    setTimeout(fetchMovements, 0);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">🔄 Stok Hareketleri</h1>

      <div className="card py-4">
        <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Hareket Tipi</label>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">Tümü</option>
              <option value="IN">Giriş</option>
              <option value="OUT">Çıkış</option>
            </select>
          </div>
          <div>
            <label className="label">Başlangıç Tarihi</label>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Bitiş Tarihi</label>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Filtrele</button>
          <button type="button" className="btn-secondary" onClick={resetFilters}>Sıfırla</button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">{total} kayıt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Tarih / Saat</th>
                <th>Tip</th>
                <th>Barkod</th>
                <th>Ürün Adı</th>
                <th>Adet</th>
                <th>Önce</th>
                <th>Sonra</th>
                <th>Personel</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Yükleniyor...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Kayıt bulunamadı</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs whitespace-nowrap text-gray-500">
                    {format(new Date(m.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                  </td>
                  <td>
                    <span className={`badge ${m.movement_type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                      {m.movement_type === 'IN' ? '📥 Giriş' : '📤 Çıkış'}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{m.barcode}</td>
                  <td className="font-medium">{m.product_name}</td>
                  <td className="font-bold">
                    <span className={m.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}>
                      {m.movement_type === 'IN' ? '+' : '-'}{m.quantity} {m.unit}
                    </span>
                  </td>
                  <td className="text-gray-500">{m.stock_before}</td>
                  <td className="text-gray-500">{m.stock_after}</td>
                  <td className="text-gray-600">{m.user_name}</td>
                  <td className="text-gray-400 text-xs max-w-[120px] truncate">{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-gray-500">{total} kayıt</span>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Önceki</button>
              <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium">{page}</span>
              <button className="btn-secondary btn-sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>Sonraki →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
