'use client'

export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="p-6 min-h-[320px] flex flex-col justify-between">
        <div className="flex-1">
          {/* Header Skeleton */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-2"></div>
            </div>
          </div>

          {/* Description Skeleton */}
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>

          {/* Commit Breakdown Skeleton */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>

          {/* Last Updated Skeleton */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3"></div>
        </div>

        {/* Button Skeleton */}
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Chart Skeleton */}
      <div className="h-12 bg-gray-100 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"></div>
    </div>
  )
}

