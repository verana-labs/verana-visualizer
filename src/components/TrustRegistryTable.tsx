'use client'

import { TrustRegistry } from '@/types'
import { convertUvnaToVna, formatSnakeCaseToTitleCase } from '@/lib/api'
import { useState } from 'react'

interface TrustRegistryTableProps {
  trustRegistries: TrustRegistry[]
}

export default function TrustRegistryTable({ trustRegistries }: TrustRegistryTableProps) {
  const [selectedRegistry, setSelectedRegistry] = useState<TrustRegistry | null>(null)

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
    return did.length > 20 ? `${did.substring(0, 20)}...` : did
  }

  const truncateController = (controller: string) => {
    return controller.length > 20 ? `${controller.substring(0, 20)}...` : controller
  }

  if (trustRegistries.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Trust Registries Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No trust registries are currently available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Trust Registries ({trustRegistries.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click on any row to view detailed information
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                DID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Controller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Deposit (VNA)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
            {trustRegistries.map((registry) => (
              <tr
                key={registry.id}
                onClick={() => setSelectedRegistry(registry)}
                className="hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {registry.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {truncateDid(registry.did)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {truncateController(registry.controller)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {convertUvnaToVna(registry.deposit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  v{registry.active_version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(registry.created)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    registry.archived 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {registry.archived ? 'Archived' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for detailed view */}
      {selectedRegistry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Trust Registry Details - ID: {selectedRegistry.id}
              </h3>
              <button
                onClick={() => setSelectedRegistry(null)}
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
                    <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{selectedRegistry.did}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Controller</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono break-all">{selectedRegistry.controller}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Deposit</label>
                    <p className="text-sm text-gray-900 dark:text-white">{convertUvnaToVna(selectedRegistry.deposit)} VNA</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</label>
                    <p className="text-sm text-gray-900 dark:text-white uppercase">{selectedRegistry.language}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedRegistry.created)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Modified</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedRegistry.modified)}</p>
                  </div>
                </div>
              </div>

              {/* AKA Link */}
              {selectedRegistry.aka && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                  <a
                    href={selectedRegistry.aka}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-verana-accent hover:underline break-all"
                  >
                    {selectedRegistry.aka}
                  </a>
                </div>
              )}

              {/* Versions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Versions ({selectedRegistry.versions.length})</h4>
                <div className="space-y-3">
                  {selectedRegistry.versions.map((version) => (
                    <div key={version.id} className="border border-gray-200 dark:border-dark-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Version {version.version}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          version.version === selectedRegistry.active_version
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {version.version === selectedRegistry.active_version ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Created: {formatDate(version.created)}</p>
                        <p>Active Since: {formatDate(version.active_since)}</p>
                      </div>
                      
                      {/* Documents */}
                      {version.documents.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Documents</h5>
                          <div className="space-y-2">
                            {version.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-surface rounded p-2">
                                <div>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-verana-accent hover:underline"
                                  >
                                    {doc.url}
                                  </a>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Language: {doc.language.toUpperCase()} | Created: {formatDate(doc.created)}
                                  </p>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {doc.digest_sri.substring(0, 16)}...
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
