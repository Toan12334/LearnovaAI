import apiClient from './apiClient';

/**
 * Payment API Service
 * Kết nối các endpoint FastAPI /api/v1/payment (packages, create-order, order-status, simulate-payment)
 */
export const paymentApi = {
  /**
   * Lấy danh sách các gói nạp từ khả dụng
   */
  getPackages: async () => {
    return apiClient.get('/api/v1/payment/packages');
  },

  /**
   * Tạo đơn hàng thanh toán mua gói từ qua PayOS VietQR
   * @param {string} packageId - 'starter' | 'plus' | 'master'
   */
  createOrder: async (packageId) => {
    return apiClient.post('/api/v1/payment/create-order', {
      package_id: packageId,
    });
  },

  /**
   * Kiểm tra trạng thái đơn hàng (Polling)
   * @param {number} orderCode
   */
  getOrderStatus: async (orderCode) => {
    return apiClient.get(`/api/v1/payment/order-status/${orderCode}`);
  },

  /**
   * Thử nghiệm mô phỏng thanh toán thành công (Sandbox/Test)
   * @param {number} orderCode
   */
  simulatePayment: async (orderCode) => {
    return apiClient.post(`/api/v1/payment/simulate-payment/${orderCode}`);
  },
};

export default paymentApi;
