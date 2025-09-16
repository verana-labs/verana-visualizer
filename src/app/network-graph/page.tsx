'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'

export default function NetworkGraphPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <LayoutWrapper 
      title="Network Graph" 
      subtitle="Visualize network connections and relationships"
    >
      <div className="p-6">
        {isLoading ? (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-verana-accent animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Loading Network Graph
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Preparing network visualization...
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Network Graph Visualization
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Interactive network graph showing connections between nodes, validators, and trust relationships.
              </p>
              <div className="bg-gray-50 dark:bg-dark-surface rounded-lg p-8">
                <div className="text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p className="text-sm">Network graph visualization will be implemented here</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  )
}
