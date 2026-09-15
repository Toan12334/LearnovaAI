import React from 'react';

export function Card({
  title,
  subtitle,
  children,
  action,
  className = '',
  style = {},
  badge = null,
}) {
  return (
    <div
      className={`app-card ${className}`}
      style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.8))',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border, #e5e4e7)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow, 0 4px 20px rgba(0, 0, 0, 0.05))',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
    >
      {(title || subtitle || action || badge) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle, rgba(229, 228, 231, 0.5))',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {title && (
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.875rem',
                  color: 'var(--text-muted, #6b6375)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
}

export default Card;
