import apiClient from './apiClient';

/**
 * Search API Service
 * Handles web search queries and external source lookups
 */

export const searchApi = {
  /**
   * Search potential web sources for query or snippet
   * @param {string} query
   * @param {Object} [params]
   */
  async searchSources(query, params = {}) {
    return apiClient.post('/api/v1/search/sources', { query, ...params });
  },

  /**
   * Scrape and extract metadata from target URL
   * @param {string} url
   */
  async scrapeMetadata(url) {
    return apiClient.post('/api/v1/search/scrape', { url });
  },
};

export default searchApi;
