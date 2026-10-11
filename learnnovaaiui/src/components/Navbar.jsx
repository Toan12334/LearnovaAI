import React from 'react';
import { LogOut, User, LogIn, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth';

export function Navbar({ currentPage, onNavigate, onOpenAuth, onOpenPricing }) {
  const { user, isAuthenticated, signOut } = useAuth();

  const navItems = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'history', label: 'Lịch sử tra cứu' },
    { id: 'report', label: 'Báo cáo mẫu' },
    { id: 'pricing', label: 'Bảng giá' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={() => onNavigate('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            L
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Learnova<span className="text-indigo-600">AI</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Plagiarism & PhoBERT AI Detector
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'pricing') {
                    if (onOpenPricing) onOpenPricing();
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200 border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Section */}
        <div className="flex items-center gap-3">
          
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>PhoBERT Active</span>
          </div>

          {/* Auth Section */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* Words Balance Badge */}
              <button
                type="button"
                onClick={onOpenPricing}
                title="Bấm để nạp thêm gói từ kiểm tra qua VietQR"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/80 text-indigo-800 text-xs font-bold shadow-xs transition-all cursor-pointer group"
              >
                <span className="text-amber-500 font-black text-sm group-hover:scale-110 transition-transform">⚡</span>
                <span>{(user.words_balance ?? 5000).toLocaleString('vi-VN')}</span>
                <span className="text-[10px] font-semibold text-indigo-500 uppercase">từ</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold group-hover:bg-indigo-700 transition-colors">+ Nạp</span>
              </button>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                  {(user.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate font-semibold">
                  {user.full_name || user.email}
                </span>
                {user.role && user.role !== 'user' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-purple-200 text-purple-800">
                    {user.role}
                  </span>
                )}
              </div>

              <button
                onClick={signOut}
                title="Đăng xuất"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Đăng nhập</span>
              </button>

              <button
                onClick={() => onOpenAuth('signup')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đăng ký</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}

export default Navbar;
