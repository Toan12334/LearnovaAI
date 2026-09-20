import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import './auth.css';

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email.trim(), password);
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${res?.user?.full_name || res?.user?.email || 'bạn'}.`);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        const res = await signUp({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        });

        if (res.requires_email_confirmation) {
          setSuccessMsg(res.message || 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
        } else {
          setSuccessMsg('Đăng ký tài khoản thành công!');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Thao tác thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      {/* Background ambient lighting orbs */}
      <div className="auth-glow-orb-1" />
      <div className="auth-glow-orb-2" />

      <div
        className="auth-card-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-logo">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="auth-title">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'signin'
              ? 'Đăng nhập vào tài khoản LearnovaAI của bạn'
              : 'Đăng ký tài khoản mới để trải nghiệm đầy đủ tính năng'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('signin')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('signup')}
          >
            Đăng ký
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="auth-alert-error" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div style={{ flex: 1, fontSize: '0.825rem', lineHeight: '1.45' }}>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{errorMsg}</div>
              {errorMsg.toLowerCase().includes('rate limit') && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    color: '#fecaca',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>💡 Cách khắc phục ngay (30s):</div>
                  <div>
                    1. Mở <b>Supabase Dashboard</b> &gt; Chọn dự án &gt; <b>Authentication</b> &gt; <b>Providers</b> &gt; <b>Email</b>.
                  </div>
                  <div>
                    2. Gạt tắt (OFF) mục <b>&quot;Confirm email&quot;</b> và bấm <b>Save</b>. Sau đó bấm Đăng ký lại sẽ thành công ngay lập tức!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="auth-alert-success" role="status">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name field (Only in Sign Up mode) */}
          {mode === 'signup' && (
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-fullname">
                Họ và tên
              </label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="auth-fullname"
                  type="text"
                  className="auth-input"
                  placeholder="Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="auth-email">
              Địa chỉ Email
            </label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                required
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="auth-password">
              Mật khẩu
            </label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password field (Only in Sign Up mode) */}
          {mode === 'signup' && (
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-confirm-password">
                Xác nhận mật khẩu
              </label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Remember Me & Forgot Password (Only in Sign In mode) */}
          {mode === 'signin' && (
            <div className="auth-row-options">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập (15 ngày)</span>
              </label>
              <a
                href="#forgot"
                className="auth-forgot-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.');
                }}
              >
                Quên mật khẩu?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="auth-spinner" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span className="auth-divider-text">Hoặc tiếp tục với</span>
        </div>

        {/* Social Buttons */}
        <div className="auth-social-row">
          <button
            type="button"
            className="auth-social-btn"
            onClick={() => alert('Đăng nhập với Google sẽ sớm được cập nhật.')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            className="auth-social-btn"
            onClick={() => alert('Đăng nhập với Apple sẽ sớm được cập nhật.')}
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.77-11.97-14.21-6.19-9.33-11.1-20.09-14.75-32.28-3.64-12.19-5.46-23.75-5.46-34.69 0-14.27 3.44-26.06 10.33-35.37 6.89-9.31 15.54-14.07 25.96-14.28 4.58 0 9.87 1.25 15.86 3.76 5.99 2.5 9.68 3.81 11.06 3.92 1.94-.33 6.01-1.87 12.21-4.63 6.2-2.76 11.45-3.95 15.76-3.56 12.01.76 21.6 5.43 28.77 14.01-10.45 6.32-15.57 15.01-15.36 26.08.22 8.71 3.55 16.03 10.01 21.96 6.46 5.93 14.15 9.29 23.07 10.09-2.28 6.74-4.89 13.06-7.83 18.96zM119.22 31.84c0-7.39 2.65-14.34 7.95-20.85 5.3-6.51 11.83-10.44 19.59-11.79.43 1.3.65 2.5.65 3.59 0 7.39-2.83 14.54-8.49 21.45-5.66 6.91-12.22 10.87-19.7 11.88-.01-1.42-.0-2.85-.0-4.28z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        {/* Footer switch prompt */}
        <p className="auth-footer-text">
          {mode === 'signin' ? (
            <>
              Chưa có tài khoản?
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleSwitchMode('signup')}
              >
                Đăng ký miễn phí
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleSwitchMode('signin')}
              >
                Đăng nhập ngay
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
