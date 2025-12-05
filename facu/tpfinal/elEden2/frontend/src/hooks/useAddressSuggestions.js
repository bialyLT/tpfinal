import { useState, useEffect, useRef, useCallback } from 'react';
import { addressService } from '../services';

const DEFAULT_OPTIONS = {
  enabled: true,
  minLength: 3,
  debounceMs: 350,
  limit: 5,
};

const useAddressSuggestions = (query, options = {}) => {
  const { enabled, minLength, debounceMs, limit } = { ...DEFAULT_OPTIONS, ...options };
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState('');
  const requestIdRef = useRef(0);

  const fetchSuggestions = useCallback(async (text) => {
    const requestId = Date.now();
    requestIdRef.current = requestId;
    setIsLoading(true);
    try {
      const data = await addressService.suggest(text, limit);
      if (requestIdRef.current !== requestId) return;
      setSuggestions(data.results || []);
      setAutocompleteError('');
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setSuggestions([]);
      setAutocompleteError(err.response?.data?.error || 'No pudimos obtener sugerencias.');
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setAutocompleteError('');
      setIsLoading(false);
      return;
    }

    const trimmedQuery = (query || '').trim();
    if (trimmedQuery.length < minLength) {
      setSuggestions([]);
      setAutocompleteError('');
      setIsLoading(false);
      return;
    }

    const handler = setTimeout(() => {
      fetchSuggestions(trimmedQuery);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, enabled, minLength, debounceMs, fetchSuggestions]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    autocompleteError,
    clearSuggestions,
  };
};

export default useAddressSuggestions;
