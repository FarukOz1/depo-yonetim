import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', username: '', password: '', role: 'operator', is_active: true };

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState(user ? { ...user, password: '' } : emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = !!user?.id;

  const handle = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username) { toast.error('Ad ve kullanıcı adı zorunludur'); return; }
    if (!isEdit && (!form.password || form.password.length < 6)) {
      toast.error('En az 6 karakterli şifre giriniz'); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/users/${user.id}`, form);
        toast.success('Kullanıcı güncellendi');
      } else {
        await api.post('/users', form);
        toast.success('Kullanıcı oluşturuldu');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Ad Soyad *</label>
            <input name="name" className="input" value={form.name} onChange={handle} required />
          </div>
          <div>
            <label className="label">Kullanıcı Adı *</label>
            <input name="username" className="input" value={form.username} onChange={handle} required />
          </div>
          <div>
            <label className="label">{isEdit ? 'Yeni Şifre (boş bırakırsa değişmez)' : 'Şifre *'}</label>
            <input
              type="password"
              name="password"
              className="input"
              value={form.password}
              onChange={handle}
              placeholder="••••••••"
              {...(!isEdit ? { required: true } : {})}
            />
          </div>
          <div>
            <label className="label">Rol *</label>
            <select name="role" className="input" value={form.role} onChange={handle}>
              <option value="operator">Depocu (Operatör)</option>
              <option value="admin">Yönetici (Admin)</option>
            </select>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handle}
                className="w-4 h-4 accent-blue-600"
              />
              Aktif kullanıcı
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (id === currentUser.id) { toast.error('Kendi hesabınızı silemezsiniz'); return; }
    if (!window.confirm(`"${name}" kullanıcısını devre dışı bırakmak istiyor musunuz?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Kullanıcı devre dışı bırakıldı');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Silinemedi');
    }
  };

  return (
    <div className="space-y-5">
      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsers(); }}
        />
      )}

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold flex-1">👥 Kullanıcılar</h1>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Yeni Kullanıcı</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Kullanıcı Adı</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Kayıt Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Yükleniyor...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">
                    {u.name}
                    {u.id === currentUser.id && (
                      <span className="ml-2 badge badge-info text-xs">Sen</span>
                    )}
                  </td>
                  <td className="font-mono text-sm text-gray-600">@{u.username}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-gray'}`}>
                      {u.role === 'admin' ? '🔑 Yönetici' : '📋 Depocu'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="text-gray-500 text-xs">
                    {format(new Date(u.created_at), 'dd.MM.yyyy', { locale: tr })}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(u)}>Düzenle</button>
                      {u.id !== currentUser.id && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(u.id, u.name)}
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
