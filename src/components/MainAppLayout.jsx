'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  Sun,
  Moon,
  Building2,
  Loader2,
  HardHat,
  Lock,
  User,
  Key
} from 'lucide-react';

export default function MainAppLayout({ children }) {
  const { setup, loggedIn, companyName, loading, login, setupAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Theme state
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auth Forms local state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [compName, setCompName] = useState('Purnima Construction');
  const [authError, setAuthError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setActionLoading(true);
    const res = await login(username, password);
    setActionLoading(false);
    if (!res.success) {
      setAuthError(res.error);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match!");
      return;
    }
    setActionLoading(true);
    const res = await setupAdmin(username, password, compName);
    setActionLoading(false);
    if (!res.success) {
      setAuthError(res.error);
    }
  };

  // Full-screen Loading Spinner
  if (loading) {
    return (
      <div className="auth-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Hisab-Book...</p>
        </div>
      </div>
    );
  }

  // Setup Wizard Screen
  if (!setup) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <HardHat size={28} />
            </div>
            <h2 className="auth-title">Purnima Construction</h2>
            <p className="auth-subtitle">Initialize Hisab-Book Admin Account</p>
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          <form onSubmit={handleSetupSubmit}>
            <div className="form-group">
              <label>Company Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Purnima Construction"
                  required
                />
                <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Admin Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Create username"
                  required
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  required
                />
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Login Screen
  if (!loggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <HardHat size={28} />
            </div>
            <h2 className="auth-title">{companyName}</h2>
            <p className="auth-subtitle">Admin Sign In</p>
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Navigation Setup
  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Attendance', path: '/attendance', icon: <Calendar size={20} /> },
    { label: 'Workers', path: '/workers', icon: <Users size={20} /> },
    { label: 'Payments', path: '/payments', icon: <CreditCard size={20} /> },
    { label: 'Reports', path: '/reports', icon: <BarChart2 size={20} /> },
    { label: 'Settings', path: '/settings', icon: <Settings size={20} /> }
  ];

  const getPageMeta = () => {
    switch (pathname) {
      case '/': return { title: 'Dashboard Summary', subtitle: 'Purnima Construction Overview' };
      case '/attendance': return { title: 'Attendance Tracker', subtitle: 'Manage daily worker logs' };
      case '/workers': return { title: 'Workers Directory', subtitle: 'Add and review project staff' };
      case '/payments': return { title: 'Salary Ledger', subtitle: 'Track wages paid and advance slips' };
      case '/reports': return { title: 'Financial Reports', subtitle: 'Analyze costs and download payroll grids' };
      case '/settings': return { title: 'System Settings', subtitle: 'Modify credentials and active sites' };
      default: return { title: 'Purnima Construction', subtitle: 'Hisab-Book Panel' };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="app-container">
      {/* Sidebar - Desktop Layout */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-icon">
            <HardHat size={22} />
          </div>
          <div>
            <h1 className="brand-title">Purnima</h1>
            <span className="brand-subtitle">Construction</span>
          </div>
        </div>

        <ul className="nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Link href={item.path}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div className="admin-info">
            <div className="admin-avatar">A</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{companyName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Panel</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-title-sec">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="admin-avatar" style={{ cursor: 'pointer' }} onClick={() => router.push('/settings')}>A</div>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Layout */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link href={item.path} key={item.path} className={`mobile-nav-item ${isActive ? 'active' : ''}`}>
              {item.icon}
              <span>{item.label.substring(0, 8)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
