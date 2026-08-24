import { useState, useEffect, useRef } from 'react';
import { PaginatedResult } from '@/types/database';

interface UsePaginationOptions<T, F> {
  fetcher: (params: { page: number; pageSize: number } & F) => Promise<PaginatedResult<T>>;
  initialFilters?: F;
  defaultPageSize?: number;
}

export function usePagination<T, F extends Record<string, any>>({
  fetcher,
  initialFilters = {} as F,
  defaultPageSize = 10,
}: UsePaginationOptions<T, F>) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);
  const [filters, setFilters] = useState<F>(initialFilters);
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  // Sync page number from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPage = parseInt(urlParams.get('page') || '1', 10);
      if (urlPage > 0) setPage(urlPage);
    }
  }, []);

  // Update URL parameters
  const updateUrlPage = (newPage: number) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(newPage));
      url.searchParams.set('pageSize', String(pageSize));
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handlePageChange = (newPage: number) => {
    if (loading) return;
    setPage(newPage);
    updateUrlPage(newPage);
  };

  const updateFilters = (newFilters: Partial<F>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
    updateUrlPage(1);
  };

  const refresh = async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher({ page, pageSize, ...filters });
      if (currentRequestId === requestIdRef.current) {
        setData(res.data);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
      }
    } catch (err: any) {
      if (currentRequestId === requestIdRef.current) {
        console.error('[usePagination Fetch Error]', err);
        setError(err?.message || 'Failed to load records from database');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    refresh();
  }, [page, pageSize, JSON.stringify(filters)]);

  return {
    data,
    page,
    pageSize,
    totalCount,
    totalPages,
    loading,
    initialLoading,
    error,
    filters,
    setPage: handlePageChange,
    updateFilters,
    refresh,
  };
}
