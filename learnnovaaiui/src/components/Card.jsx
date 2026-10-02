import React from 'react';

export function Card({
  title,
  subtitle,
  children,
  action,
  className = '',
  badge = null,
}) {
  return (
    <div
      className={`bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200/80 ${className}`}
    >
      {(title || subtitle || action || badge) && (
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center flex-wrap gap-2.5">
              {title && (
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
}

export default Card;
