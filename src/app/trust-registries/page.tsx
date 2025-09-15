'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import SearchForm from '@/components/SearchForm'
import TrustRegistryTable from '@/components/TrustRegistryTable'
import ResultsSection from '@/components/ResultsSection'
import { fetchTrustRegistryList } from '@/lib/api'
import { TrustRegistry } from '@/types'

export default function TrustRegistriesPage() {
  const [trustRegistries, setTrustRegistries] = useState<TrustRegistry[]>([])
  const [filteredRegistries, setFilteredRegistries] = useState<TrustRegistry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadTrustRegistries = async () => {
      try {
        setIsLoading(true)
        const response = await fetchTrustRegistryList(100)
        setTrustRegistries(response.trust_registries)
        setFilteredRegistries(response.trust_registries)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trust registries')
        console.error('Error loading trust registries:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTrustRegistries()
  }, [])

  const handleSearch = (searchTerm: string) => {
    setSearchTerm(searchTerm)
    setIsSearching(true)
    
    if (!searchTerm.trim()) {
      setFilteredRegistries(trustRegistries)
    } else {
      const filtered = trustRegistries.filter(registry => 
        registry.did.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredRegistries(filtered)
    }
    
    setIsSearching(false)
  }

  return (
    <LayoutWrapper 
      title="Trust Registries" 
      subtitle="Explore and manage trust registries"
    >
      <div className="p-6">
        <SearchForm onSearch={handleSearch} isLoading={isSearching} />
        
        {isLoading ? (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-verana-accent animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Loading Trust Registries
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Fetching data from the Verana network...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-verana-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <TrustRegistryTable 
            trustRegistries={filteredRegistries} 
            isSearchResult={!!searchTerm}
          />
        )}
        
        {!isLoading && !error && filteredRegistries.length === 0 && !searchTerm && <ResultsSection />}
      </div>
    </LayoutWrapper>
  )
}
