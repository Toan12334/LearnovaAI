import React from 'react';

export function Navbar({ currentPage, onNavigate }) {
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
    </header>
  );
}

export default Navbar;
