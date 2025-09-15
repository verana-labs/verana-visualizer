'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import MobileHeader from '@/components/MobileHeader'
import Footer from '@/components/Footer'
import { fetchHeader, fetchSupply, fetchInflation, fetchMintParams } from '@/lib/api'
import { HeaderResponse, SupplyResponse, InflationResponse, MintParamsResponse } from '@/types'
import { convertUvnaToVna, formatInflationRate } from '@/lib/api'

interface LayoutWrapperProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export default function LayoutWrapper({ children, title, subtitle }: LayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [networkInfo, setNetworkInfo] = useState<{
    chainId: string
    blockHeight: string
    totalSupply: string
    inflationRate: string
    trustDepositSize: string
  } | null>(null)

  useEffect(() => {
    const loadNetworkInfo = async () => {
      try {
        const [header, supply, inflation, mintParams] = await Promise.all([
          fetchHeader(),
          fetchSupply(),
          fetchInflation(),
          fetchMintParams()
        ])

        const totalSupplyVna = convertUvnaToVna(supply.supply[0]?.amount || '0')
        const inflationRate = formatInflationRate(inflation.inflation)
        const trustDepositSize = convertUvnaToVna(mintParams.params.goal_bonded)

        setNetworkInfo({
          chainId: header.result.header.chain_id,
          blockHeight: header.result.header.height,
          totalSupply: totalSupplyVna,
          inflationRate,
          trustDepositSize
        })
      } catch (error) {
        console.error('Failed to load network info:', error)
      }
    }

    loadNetworkInfo()
  }, [])

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
        <header className="hidden lg:block bg-white dark:bg-black border-b border-gray-200 dark:border-dark-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Network Info Bar */}
          {networkInfo && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Chain</span>
                  <span className="font-mono text-gray-900 dark:text-white">{networkInfo.chainId}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Block Height</span>
                  <span className="font-mono text-gray-900 dark:text-white">{parseInt(networkInfo.blockHeight).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Total Supply</span>
                  <span className="font-mono text-gray-900 dark:text-white">{parseFloat(networkInfo.totalSupply).toLocaleString()} VNA</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Inflation Rate</span>
                  <span className="font-mono text-gray-900 dark:text-white">{networkInfo.inflationRate}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Trust Deposit Size</span>
                  <span className="font-mono text-gray-900 dark:text-white">{parseFloat(networkInfo.trustDepositSize).toLocaleString()} VNA</span>
                </div>
              </div>
            </div>
          )}
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
