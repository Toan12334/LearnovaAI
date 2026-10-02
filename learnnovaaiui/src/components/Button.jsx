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
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-xl',
    lg: 'px-6 py-3.5 text-base font-semibold rounded-xl',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 active:scale-[0.98]',
    outline:
      'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50/50 hover:border-indigo-300 shadow-sm active:scale-[0.98]',
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;
