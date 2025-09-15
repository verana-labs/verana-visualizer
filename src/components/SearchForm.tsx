'use client'

import { useState } from 'react'

interface SearchFormProps {
  onSearch: (searchTerm: string) => void
  isLoading?: boolean
}

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    onSearch(searchTerm.trim())
  }

  const handleClear = () => {
    setSearchTerm('')
    onSearch('')
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter Trust Registry DID (e.g., did:example:184a2fddab1b3d505d477adbf0643446)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-verana-accent focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !searchTerm.trim()}
          className="px-6 py-2 bg-verana-accent text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  )
}
