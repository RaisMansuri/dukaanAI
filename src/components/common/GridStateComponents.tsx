import React from 'react';
import { RefreshCw, AlertCircle, SearchX } from 'lucide-react';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 10 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className="animate-pulse border-b border-slate-100 bg-white">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={`skeleton-col-${cIdx}`} className="p-4">
              <div
                className={`h-4 rounded-lg bg-slate-200 ${
                  cIdx === 0
                    ? 'w-36 font-bold'
                    : cIdx === 1
                    ? 'w-20'
                    : cIdx === columns - 1
                    ? 'w-20 ml-auto'
                    : 'w-16 mx-auto'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 8 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`card-skeleton-${i}`} className="h-32 rounded-2xl bg-white p-4 border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-28 bg-slate-200 rounded" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="h-4 w-12 bg-slate-200 rounded" />
            <div className="h-7 w-7 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`list-skel-${i}`} className="h-12 w-full bg-slate-100/90 rounded-xl border border-slate-200/60" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4 rounded-2xl bg-white border border-slate-200">
      <div className="h-6 w-48 bg-slate-200 rounded-lg" />
      <div className="h-4 w-3/4 bg-slate-200 rounded" />
      <div className="h-4 w-1/2 bg-slate-200 rounded" />
      <div className="h-24 bg-slate-100 rounded-xl border border-slate-200" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-80 bg-slate-200 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          <div className="h-10 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`kpi-skel-${i}`} className="h-28 rounded-2xl bg-white p-4 border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 border border-slate-200 space-y-4 shadow-sm">
          <div className="h-5 w-44 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`dash-row-skel-${i}`} className="h-11 bg-slate-100/80 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-slate-200 space-y-4 shadow-sm">
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`dash-alert-skel-${i}`} className="h-14 bg-slate-100/80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DataGridEmptyStateProps {
  columns: number;
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export function DataGridEmptyState({
  columns,
  title = 'No records found',
  description = 'Try adjusting your search query or filter options.',
  actionButton,
}: DataGridEmptyStateProps) {
  return (
    <tr>
      <td colSpan={columns} className="p-12 text-center">
        <div className="mx-auto flex flex-col items-center justify-center space-y-2 max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <SearchX className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
          {actionButton && <div className="pt-2">{actionButton}</div>}
        </div>
      </td>
    </tr>
  );
}

interface DataGridErrorStateProps {
  columns: number;
  error: string;
  onRetry: () => void;
}

export function DataGridErrorState({
  columns,
  error,
  onRetry,
}: DataGridErrorStateProps) {
  return (
    <tr>
      <td colSpan={columns} className="p-12 text-center">
        <div className="mx-auto flex flex-col items-center justify-center space-y-3 max-w-md rounded-2xl bg-red-50/50 p-6 border border-red-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-red-900 text-sm">Failed to Load Grid Data</h3>
            <p className="text-xs text-red-700 font-mono break-all">{error}</p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 active:scale-95 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
