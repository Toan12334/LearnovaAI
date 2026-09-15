import apiClient from './apiClient';

/**
 * Service for Plagiarism Checking & Timestamp Verification
 * Matches FastAPI endpoints under /api/v1/plagiarism and /api/v1/timestamp
 */

export const plagiarismApi = {
  /**
   * Check text for plagiarism
   * @param {Object} payload - { text, language, threshold, checkTimestamp }
   */
  async checkText(payload) {
    return apiClient.post('/api/v1/plagiarism/check-text', payload);
  },

  /**
   * Check uploaded document file (PDF, DOCX, TXT)
   * @param {File} file
   * @param {Object} options
   */
  async checkDocument(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.threshold) formData.append('threshold', options.threshold);
    if (options.language) formData.append('language', options.language);
    return apiClient.postFormData('/api/v1/plagiarism/check-file', formData);
  },

  /**
   * Verify source publishing date and internet archive snapshot
   * @param {string} url - Target URL to verify
   */
  async verifyTimestamp(url) {
    return apiClient.post('/api/v1/timestamp/verify', { url });
  },

  /**
   * Get search/check history
   */
  async getHistory() {
    return apiClient.get('/api/v1/plagiarism/history');
  },

  /**
   * Get detailed report by ID
   */
  async getReportById(reportId) {
    return apiClient.get(`/api/v1/plagiarism/reports/${reportId}`);
  },
};

export default plagiarismApi;
