import { useState, useCallback } from 'react';
import { searchApi } from '../services/searchApi';

/**
 * Custom hook to handle search query state, api calls, and error handling
 */
export function useSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeSearch = useCallback(async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await searchApi.searchSources(searchQuery);
      setResults(data.results || data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tìm kiếm nguồn');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    executeSearch,
    clear,
  };
}

export default useSearch;
