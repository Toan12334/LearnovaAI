import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const uploadService = {
  /**
   * Upload file Word (.docx), PDF (.pdf), hoặc TXT (.txt) để trích xuất nội dung
   * @param {File} file 
   * @returns {Promise<Object>} Metadata & extracted text
   */
  async uploadAndParseFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/api/v1/upload/parse`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default uploadService;
