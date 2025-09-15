'use client'

import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

interface MobileHeaderProps {
  title: string
  subtitle: string
  onMenuClick: () => void
}

export default function MobileHeader({ title, subtitle, onMenuClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white dark:bg-black border-b border-gray-200 dark:border-dark-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <Image
              src="/logo.svg"
              alt="Verana Logo"
              width={24}
              height={24}
              className="w-6 h-6"
              priority
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
