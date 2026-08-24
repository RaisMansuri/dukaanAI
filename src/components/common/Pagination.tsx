import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  loading = false,
  onPageChange,
}: PaginationProps) {
  if (totalCount === 0) return null;

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  // Generate page numbers array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 rounded-b-2xl">
      <div>
        Showing <span className="font-bold text-slate-900">{startRecord}</span>–
        <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
        <span className="font-bold text-slate-900">{totalCount}</span> records
        {loading && <span className="ml-2 inline-block h-2 w-12 rounded-full bg-emerald-400 animate-pulse align-middle" />}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={loading || page <= 1}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400">
                ...
              </span>
            ) : (
              <button
                type="button"
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                disabled={loading}
                className={`min-w-[30px] rounded-lg py-1 text-center font-bold transition-all disabled:opacity-50 ${
                  page === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={loading || page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
