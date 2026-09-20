import apiClient from './apiClient';

/**
 * Authentication API Service
 * Kết nối các endpoint FastAPI /api/v1/auth (signup, signin, me, refresh, signout)
 */
export const authApi = {
  /**
   * Đăng ký tài khoản người dùng mới
   * @param {Object} payload { email, password, full_name, avatar_url }
   */
  signUp: async (payload) => {
    return apiClient.post('/api/v1/auth/signup', {
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name || null,
      avatar_url: payload.avatar_url || null,
    });
  },

  /**
   * Đăng nhập tài khoản bằng email và mật khẩu
   * @param {Object} payload { email, password }
   */
  signIn: async (payload) => {
    return apiClient.post('/api/v1/auth/signin', {
      email: payload.email,
      password: payload.password,
    });
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ JWT token
   */
  getMe: async () => {
    return apiClient.get('/api/v1/auth/me');
  },

  /**
   * Gia hạn phiên làm việc với refresh token
   * @param {string} refreshToken
   */
  refreshToken: async (refreshToken) => {
    return apiClient.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
  },

  /**
   * Đăng xuất và xóa phiên làm việc
   */
  signOut: async () => {
    try {
      await apiClient.post('/api/v1/auth/signout');
    } catch {
      // Bỏ qua lỗi kết nối khi đăng xuất
    } finally {
      localStorage.removeItem('learnova_token');
      localStorage.removeItem('learnova_user');
      localStorage.removeItem('learnova_refresh_token');
    }
  },
};

export default authApi;
