import axios from 'axios';
import { API_BASE_URL, IS_DEVELOPMENT } from '../config/apiConfig';

/**
 * Base API Client for LearnovaAI using Axios
 * Connects to FastAPI Backend at API_BASE_URL (Localhost vs Railway Production)
 */
const BASE_URL = API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 phút (đủ thời gian cho lần đầu tải mô hình Embedding FastEmbed & quét Serper)
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor to attach JWT token if present
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('learnova_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to extract data and normalize errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    let message = 'Có lỗi xảy ra khi kết nối máy chủ.';

    // 1. Lỗi Timeout
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      message = 'Yêu cầu vượt quá thời gian chờ (Timeout). Pipeline đang tải mô hình Embedding hoặc đối soát Web Serper. Vui lòng thử lại với đoạn văn bản ngắn hơn hoặc kiểm tra log Backend.';
    }
    // 2. Phản hồi có HTTP Status (4xx, 5xx) từ Backend
    else if (error.response) {
      const data = error.response.data;
      if (typeof data === 'string') {
        message = data;
      } else if (data?.detail) {
        if (Array.isArray(data.detail)) {
          message = data.detail.map((err) => `${err.loc?.slice(-1)[0] || 'Field'}: ${err.msg}`).join(', ');
        } else {
          message = data.detail;
        }
      } else if (data?.message) {
        message = data.message;
      } else {
        message = `HTTP ${error.response.status}: ${error.response.statusText || 'Yêu cầu thất bại'}`;
      }
    }
    // 3. Không nhận được phản hồi (Backend chưa chạy, hoặc lỗi CORS/Network)
    else if (error.request) {
      message = IS_DEVELOPMENT
        ? `Không thể kết nối đến máy chủ Backend tại ${BASE_URL}. Hãy chắc chắn rằng Backend đang chạy trên cổng 8000 (uvicorn src.main:app --port 8000).`
        : `Không thể kết nối đến máy chủ Backend (${BASE_URL}). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút.`;
    }
    // 4. Lỗi khác
    else if (error.message) {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    enhancedError.code = error.code;
    enhancedError.data = error.response?.data;
    enhancedError.original = error;

    console.error(`[Axios API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    return Promise.reject(enhancedError);
  }
);

export const apiClient = {
  instance: axiosInstance,
  baseURL: BASE_URL,

  get(endpoint, config = {}) {
    return axiosInstance.get(endpoint, config);
  },

  post(endpoint, data, config = {}) {
    return axiosInstance.post(endpoint, data, {
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      ...config,
    });
  },

  postFormData(endpoint, formData, config = {}) {
    return axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
      ...config,
    });
  },

  put(endpoint, data, config = {}) {
    return axiosInstance.put(endpoint, data, config);
  },

  delete(endpoint, config = {}) {
    return axiosInstance.delete(endpoint, config);
  },
};

export default apiClient;
