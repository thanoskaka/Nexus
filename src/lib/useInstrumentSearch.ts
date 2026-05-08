import { useState, useEffect, useRef, useCallback } from 'react';
import type { InstrumentSuggestion } from '../components/addAssetModalHelpers';

interface UseInstrumentSearchOptions {
  query: string;
  country: string;
  assetClass: string;
  debounceMs?: number;
}

interface UseInstrumentSearchResult {
  suggestions: InstrumentSuggestion[];
  loading: boolean;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function useInstrumentSearch({
  query,
  country,
  assetClass,
  debounceMs = 300,
}: UseInstrumentSearchOptions): UseInstrumentSearchResult {
  const [suggestions, setSuggestions] = useState<InstrumentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ q, country, assetClass });
      const res = await fetch(`/api/instruments/search?${params}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      const items = (data?.suggestions || []) as InstrumentSuggestion[];
      setSuggestions(items);
      setIsOpen(items.length > 0);
      setHighlightedIndex(-1);
    } catch {
      if (!controller.signal.aborted) {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [country, assetClass]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch, debounceMs]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    suggestions,
    loading,
    highlightedIndex,
    setHighlightedIndex,
    isOpen,
    setIsOpen,
  };
}
