import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('learnova_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('learnova_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi động kiểm tra token hợp lệ từ server
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('learnova_token');
      if (savedToken) {
        try {
          const profile = await authApi.getMe();
          if (profile && profile.id) {
            setUser(profile);
            localStorage.setItem('learnova_user', JSON.stringify(profile));
          }
        } catch (err) {
          console.warn('[Auth] Phiên làm việc đã hết hạn hoặc không hợp lệ:', err.message);
          // Token không còn hợp lệ, dọn dẹp
          localStorage.removeItem('learnova_token');
          localStorage.removeItem('learnova_user');
          localStorage.removeItem('learnova_refresh_token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email, password) => {
    const res = await authApi.signIn({ email, password });
    if (res && res.access_token) {
      localStorage.setItem('learnova_token', res.access_token);
      setToken(res.access_token);

      if (res.refresh_token) {
        localStorage.setItem('learnova_refresh_token', res.refresh_token);
      }

      if (res.user) {
        setUser(res.user);
        localStorage.setItem('learnova_user', JSON.stringify(res.user));
      }
    }
    return res;
  };

  const signUp = async ({ email, password, full_name, avatar_url }) => {
    const res = await authApi.signUp({ email, password, full_name, avatar_url });
    if (res && res.access_token) {
      localStorage.setItem('learnova_token', res.access_token);
      setToken(res.access_token);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('learnova_user', JSON.stringify(res.user));
      }
    }
    return res;
  };

  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
