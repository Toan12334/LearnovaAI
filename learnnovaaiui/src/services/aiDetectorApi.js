import apiClient from './apiClient';

/**
 * AI Detector API Service
 * Handles RoBERTa AI-generation analysis.
 */

export const aiDetectorApi = {
  /**
   * Analyze text with the backend RoBERTa detector.
   * @param {Object} payload - { text, language }
   * @returns {Promise<Object>} RoBERTa response with document score and heatmap.
   */
  async detectAI({ text, language = 'auto' }) {
    return apiClient.post(
      '/api/v1/ai-detection/detect',
      { text, language },
      // Large documents may need model warm-up plus batched inference.
      { timeout: 600000 },
    );
  },
};

export default aiDetectorApi;
