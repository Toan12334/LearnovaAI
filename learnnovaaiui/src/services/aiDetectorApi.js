import apiClient from './apiClient';

/**
 * AI Detector API Service
 * Handles PhoBERT AI-generation analysis (toanoppa10012004/phobert-vietnamese-ai-detector).
 */

export const aiDetectorApi = {
  /**
   * Analyze text with the backend PhoBERT AI detector.
   * @param {Object} payload - { text, language }
   * @returns {Promise<Object>} PhoBERT response with document score and heatmap.
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
