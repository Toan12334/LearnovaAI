import React from 'react';
import { LogOut, User, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../features/auth';

export function Navbar({ currentPage, onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, signOut } = useAuth();

  const navItems = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'history', label: 'Lịch sử tra cứu' },
    { id: 'report', label: 'Báo cáo mẫu' },
  ];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 2rem',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--navbar-bg, rgba(22, 23, 29, 0.85))',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
        }}
        onClick={() => onNavigate('home')}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '700',
            fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          }}
        >
          L
        </div>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Learnova<span style={{ color: '#818cf8' }}>AI</span>
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '0.65rem',
              color: 'var(--text-muted, #9ca3af)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Plagiarism & AI Detector
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                background: isActive ? 'var(--accent-bg, rgba(99, 102, 241, 0.15))' : 'transparent',
                color: isActive ? '#818cf8' : 'var(--text, #9ca3af)',
                border: isActive ? '1px solid var(--accent-border, rgba(99, 102, 241, 0.4))' : '1px solid transparent',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right side: Auth buttons & Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Auth section */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* User Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                fontSize: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              >
                {(user.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name || user.email}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={signOut}
              title="Đăng xuất"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => onOpenAuth('signin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'transparent',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 1rem',
                borderRadius: '9px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                boxShadow: '0 4px 12px rgba(79, 124, 255, 0.35)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đăng ký</span>
            </button>
          </div>
        )}

        {/* Backend API status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'inline-block',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
          FastAPI: v1.0
        </div>
      </div>
    </header>
  );
}

export default Navbar;
