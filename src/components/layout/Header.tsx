'use client'

import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="bg-white dark:bg-black shadow-lg border-b border-gray-200 dark:border-dark-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="Verana Logo"
                width={40}
                height={40}
                className="w-10 h-10"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Verana Visualizer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Decentralized Trust Layer
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Chain</p>
            <p className="font-semibold text-gray-900 dark:text-white">Testnet</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Chain ID</p>
            <p className="font-semibold text-gray-900 dark:text-white">vna-testnet-1</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Supply</p>
            <p className="font-semibold text-gray-900 dark:text-white">Placeholder value</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Block Height</p>
            <p className="font-semibold text-gray-900 dark:text-white">Placeholder value</p>
          </div>
        </div>
      </div>
    </header>
  )
}
