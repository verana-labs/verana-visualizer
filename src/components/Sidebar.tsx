'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  isLoaded?: boolean
  isManualToggle?: boolean
}

export default function Sidebar({ isCollapsed, onToggle, isLoaded = true, isManualToggle = false }: SidebarProps) {
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      name: 'Network Graph',
      href: '/network-graph',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      name: 'Trust Registries',
      href: '/trust-registries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      name: 'DID Directory',
      href: '/did-directory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      )
    }
  ]

  return (
    <>
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      <div className={`
        fixed top-0 left-0 z-50 h-full bg-white dark:bg-black border-r border-gray-200 dark:border-dark-border
        ${isManualToggle ? 'transition-all duration-300 ease-in-out' : ''}
        ${isCollapsed ? 'w-16' : 'w-64'}
        lg:translate-x-0
        ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image
                  src="/logo.svg"
                  alt="Verana Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                  priority
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Verana</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visualizer</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = item.href === '/' 
              ? pathname === '/' || pathname === '/dashboard'
              : pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${isCollapsed 
                    ? 'justify-center px-3 py-3' 
                    : 'space-x-3 px-3 py-2'
                  }
                  ${isActive 
                    ? 'bg-verana-accent text-white shadow-lg' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface'
                  }
                `}
              >
                <span className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-dark-border">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <p>Verana Visualizer</p>
              <p>v1.4.2</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
