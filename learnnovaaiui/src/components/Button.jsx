import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon = null,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.65 : 1,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const sizeStyles = {
    sm: { padding: '0.35rem 0.75rem', fontSize: '0.85rem' },
    md: { padding: '0.55rem 1.15rem', fontSize: '0.95rem' },
    lg: { padding: '0.75rem 1.6rem', fontSize: '1.05rem' },
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
    },
    secondary: {
      background: '#2e303a',
      color: '#f3f4f6',
      borderColor: '#3e4150',
    },
    outline: {
      background: 'transparent',
      borderColor: 'currentColor',
      color: '#6366f1',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'inherit',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      className={`app-button btn-${variant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.75s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default Button;
