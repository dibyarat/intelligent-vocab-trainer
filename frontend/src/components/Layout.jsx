import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: '⚡', label: 'Dashboard' },
  { to: '/review',     icon: '🧠', label: 'Review' },
  { to: '/vocab',      icon: '📚', label: 'My Words' },
  { to: '/dictionary', icon: '🔍', label: 'Dictionary' },
  { to: '/ocr',        icon: '📷', label: 'Scan Text' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🧠</span>
          <span className={styles.brandName}>VocabTrainer</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userPanel}>
          <div className={styles.avatar}>
            {(user?.displayName?.[0] || 'U').toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.displayName || 'User'}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Log out">⏻</button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
        <span className={styles.brandName}>🧠 VocabTrainer</span>
      </header>

      {/* ── Overlay ── */}
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
