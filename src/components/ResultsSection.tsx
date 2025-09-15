'use client'

export default function ResultsSection() {
  // This will be populated with actual data later
  const hasResults = false

  if (!hasResults) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Results Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Enter a Trust Registry ID above to search for trust registries and their credential schemas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Search Results
      </h2>
      {/* Results will be displayed here */}
    </div>
  )
}
