'use client'

import { useState } from 'react'

export default function SearchForm() {
  const [trustRegistryId, setTrustRegistryId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trustRegistryId.trim()) return

    setIsLoading(true)
    try {
      // TODO: Implement API call to fetch trust registry data
      console.log('Searching for trust registry:', trustRegistryId)
      // This will be implemented in the next steps
    } catch (error) {
      console.error('Error fetching trust registry:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Search Trust Registry
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={trustRegistryId}
            onChange={(e) => setTrustRegistryId(e.target.value)}
            placeholder="Enter Trust Registry ID (e.g., 18)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-verana-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !trustRegistryId.trim()}
          className="px-6 py-2 bg-verana-accent text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  )
}
