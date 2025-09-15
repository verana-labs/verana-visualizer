'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import MobileHeader from '@/components/MobileHeader'
import Footer from '@/components/Footer'

interface LayoutWrapperProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export default function LayoutWrapper({ children, title, subtitle }: LayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        subtitle={subtitle}
        onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Desktop Header */}
        <header className="hidden lg:block bg-white dark:bg-black border-b border-gray-200 dark:border-dark-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-[calc(100vh-200px)]">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
