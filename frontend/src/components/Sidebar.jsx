import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/products', label: 'Ürünler', icon: '📦' },
  { to: '/stock-exit', label: 'Stok Çıkışı', icon: '📤' },
  { to: '/stock-entry', label: 'Stok Girişi', icon: '📥', adminOnly: true },
  { to: '/movements', label: 'Hareketler', icon: '🔄' },
  { to: '/users', label: 'Kullanıcılar', icon: '👥', adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <span className="text-2xl">📦</span>
        <div>
          <div className="font-bold text-sm leading-tight">Depo Yönetim</div>
          <div className="text-xs text-gray-400">Sistemi</div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">
              {user?.role === 'admin' ? 'Yönetici' : 'Depocu'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
