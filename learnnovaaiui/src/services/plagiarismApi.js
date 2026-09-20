import apiClient from './apiClient';

/**
 * Service for Plagiarism Checking & Timestamp Verification
 * Connects to FastAPI endpoints in /api/v1/plagiarism and /api/v1/timestamp
 */

export const plagiarismApi = {
  /**
   * Check text for plagiarism using the 6-step backend pipeline
   * @param {Object} payload
   * @param {string} payload.text - Text to check (min 15 characters)
   * @param {string} [payload.title] - Document title
   * @param {boolean} [payload.enable_web_search=true] - Enable Serper web search
   * @param {number} [payload.similarity_threshold=0.75] - Similarity threshold (0.0 - 1.0)
   * @param {string} [payload.user_id] - User ID if available
   */
  async checkText({
    text,
    title = 'Văn bản kiểm tra',
    enable_web_search = true,
    similarity_threshold = 0.75,
    user_id = null,
  }) {
    const payload = {
      title,
      text,
      content: text,
      enable_web_search,
      similarity_threshold: Number(similarity_threshold) > 1 
        ? Number(similarity_threshold) / 100 
        : Number(similarity_threshold),
    };
    if (user_id) payload.user_id = user_id;

    return apiClient.post('/api/v1/plagiarism/check', payload);
  },

  /**
   * Check uploaded document file (PDF, DOCX, TXT)
   * @param {File} file - Uploaded File instance
   */
  async checkDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData('/api/v1/plagiarism/check-file', formData);
  },

  /**
   * Verify publication timestamp via Internet Archive Wayback Machine
   * @param {string} url - Target URL to verify
   */
  async verifyTimestamp(url) {
    return apiClient.post('/api/v1/timestamp/verify', { url });
  },

  /**
   * Get check history from Supabase if available
   */
  async getHistory() {
    return apiClient.get('/api/v1/plagiarism/history');
  },

  /**
   * Get detailed report by document ID
   * @param {string} documentId
   */
  async getReportById(documentId) {
    return apiClient.get(`/api/v1/plagiarism/reports/${documentId}`);
  },
};

export default plagiarismApi;
