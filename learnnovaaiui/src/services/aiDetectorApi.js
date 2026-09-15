import apiClient from './apiClient';

/**
 * AI Detector API Service
 * Handles AI generation probability, perplexity, and burstiness analysis
 */

export const aiDetectorApi = {
  /**
   * Detect AI content in given text
   * @param {Object} payload - { text, language }
   */
  async detectAI(payload) {
    return apiClient.post('/api/v1/ai-detection/analyze', payload);
  },
};

export default aiDetectorApi;
