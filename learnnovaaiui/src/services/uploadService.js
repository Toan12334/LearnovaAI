import apiClient from './apiClient';

export const uploadService = {
  /**
   * Upload file Word (.docx), PDF (.pdf), hoặc TXT (.txt) để trích xuất nội dung.
   * Sử dụng apiClient tập trung để tự động trỏ đúng môi trường (Localhost vs Railway).
   * @param {File} file 
   * @returns {Promise<Object>} Metadata & extracted text
   */
  async uploadAndParseFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.postFormData('/api/v1/upload/parse', formData);
  },
};

export default uploadService;
