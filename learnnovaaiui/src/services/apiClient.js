/**
 * Base API Client for LearnovaAI
 * Connects to FastAPI Backend at VITE_API_URL
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers = {
      ...(!options.isFormData && { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    if (options.body && !options.isFormData && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      // Try to parse json response
      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = (data && data.detail) || (data && data.message) || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err);
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  postFormData(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
