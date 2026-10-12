import apiClient from './apiClient';

/**
 * Service API Quản trị Người Dùng (Admin User Management)
 */
export const adminUsersApi = {
  /**
   * Lấy số liệu thống kê người dùng và tài nguyên
   */
  async getStats() {
    return apiClient.get('/api/v1/admin/users/stats');
  },

  /**
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc
   */
  async getUsers({
    page = 1,
    pageSize = 15,
    search = '',
    role = '',
    status = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (search?.trim()) params.append('search', search.trim());
    if (role && role !== 'all') params.append('role', role);
    if (status && status !== 'all') params.append('status', status);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);

    return apiClient.get(`/api/v1/admin/users?${params.toString()}`);
  },

  /**
   * Lấy chi tiết người dùng kèm tài liệu và giao dịch gần nhất
   */
  async getUserDetail(userId) {
    return apiClient.get(`/api/v1/admin/users/${userId}`);
  },

  /**
   * Cộng hoặc trừ số từ của người dùng
   */
  async adjustBalance(userId, adjustment, reason) {
    return apiClient.patch(`/api/v1/admin/users/${userId}/adjust-balance`, {
      adjustment: Number(adjustment),
      reason,
    });
  },

  /**
   * Cập nhật vai trò người dùng (user / admin)
   */
  async updateRole(userId, role) {
    return apiClient.patch(`/api/v1/admin/users/${userId}/role`, { role });
  },

  /**
   * Khóa hoặc mở khóa tài khoản người dùng
   */
  async updateStatus(userId, status, reason = '') {
    return apiClient.patch(`/api/v1/admin/users/${userId}/status`, { status, reason });
  },

  /**
   * Tạo tài khoản người dùng mới trực tiếp bởi Admin
   */
  async createUser(data) {
    return apiClient.post('/api/v1/admin/users', data);
  },

  /**
   * Xóa vĩnh viễn tài khoản người dùng
   */
  async deleteUser(userId) {
    return apiClient.delete(`/api/v1/admin/users/${userId}`);
  },
};

export default adminUsersApi;
