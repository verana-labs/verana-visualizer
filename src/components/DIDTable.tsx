'use client'

import { DID } from '@/types'
import { convertUvnaToVna } from '@/lib/api'
import { useState, useMemo } from 'react'

type SortField = 'did' | 'controller' | 'deposit' | 'created' | 'modified' | 'exp'
type SortDirection = 'asc' | 'desc'

interface DIDTableProps {
  dids: DID[]
  isSearchResult?: boolean
}

export default function DIDTable({ dids, isSearchResult = false }: DIDTableProps) {
  const [selectedDID, setSelectedDID] = useState<DID | null>(null)
  const [sortField, setSortField] = useState<SortField>('did')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateDid = (did: string) => {
    return did.length > 25 ? `${did.substring(0, 25)}...` : did
  }

  const truncateController = (controller: string) => {
    return controller.length > 20 ? `${controller.substring(0, 20)}...` : controller
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-verana-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-verana-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const sortedDIDs = useMemo(() => {
    return [...dids].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'did':
          aValue = a.did.toLowerCase()
          bValue = b.did.toLowerCase()
          break
        case 'controller':
          aValue = a.controller.toLowerCase()
          bValue = b.controller.toLowerCase()
          break
        case 'deposit':
          aValue = parseInt(a.deposit)
          bValue = parseInt(b.deposit)
          break
        case 'created':
          aValue = new Date(a.created).getTime()
          bValue = new Date(b.created).getTime()
          break
        case 'modified':
          aValue = new Date(a.modified).getTime()
          bValue = new Date(b.modified).getTime()
          break
        case 'exp':
          aValue = new Date(a.exp).getTime()
          bValue = new Date(b.exp).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [dids, sortField, sortDirection])

  const isExpired = (expDate: string) => {
    return new Date(expDate) < new Date()
  }

  const isExpiringSoon = (expDate: string) => {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return new Date(expDate) <= thirtyDaysFromNow && new Date(expDate) > new Date()
  }

  if (dids.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center">
            {isSearchResult ? (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isSearchResult ? 'No DIDs Found' : 'No DIDs Available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isSearchResult 
              ? 'No DIDs match your search criteria.' 
              : 'No DIDs are currently available.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          DID Directory ({sortedDIDs.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click on any row to view detailed information
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-surface">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('did')}
              >
                <div className="flex items-center space-x-1">
                  <span>DID</span>
                  {getSortIcon('did')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('controller')}
              >
                <div className="flex items-center space-x-1">
                  <span>Controller</span>
                  {getSortIcon('controller')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('deposit')}
              >
                <div className="flex items-center space-x-1">
                  <span>Deposit (VNA)</span>
                  {getSortIcon('deposit')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('created')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  {getSortIcon('created')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('modified')}
              >
                <div className="flex items-center space-x-1">
                  <span>Modified</span>
                  {getSortIcon('modified')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                onClick={() => handleSort('exp')}
              >
                <div className="flex items-center space-x-1">
                  <span>Expires</span>
                  {getSortIcon('exp')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
            {sortedDIDs.map((did, index) => (
              <tr
                key={`${did.did}-${index}`}
                onClick={() => setSelectedDID(did)}
                className="hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {truncateDid(did.did)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {truncateController(did.controller)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {convertUvnaToVna(did.deposit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(did.created)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(did.modified)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(did.exp)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 w-fit ${
                      isExpired(did.exp)
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : isExpiringSoon(did.exp)
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {isExpired(did.exp) ? 'Expired' : isExpiringSoon(did.exp) ? 'Expiring Soon' : 'Active'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for detailed view */}
      {selectedDID && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                DID Details
              </h3>
              <button
                onClick={() => setSelectedDID(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">DID</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{selectedDID.did}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Controller</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{selectedDID.controller}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Deposit</label>
                    <p className="text-sm text-gray-900 dark:text-white">{convertUvnaToVna(selectedDID.deposit)} VNA</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isExpired(selectedDID.exp)
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : isExpiringSoon(selectedDID.exp)
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {isExpired(selectedDID.exp) ? 'Expired' : isExpiringSoon(selectedDID.exp) ? 'Expiring Soon' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedDID.created)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Modified</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedDID.modified)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Expires</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedDID.exp)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
