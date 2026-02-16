'use client'

import { useState, useEffect, useRef } from 'react'
import { EcosystemMetrics } from '@/types'

interface EcosystemHeroCardsProps {
  metrics: EcosystemMetrics | null
  isLoading: boolean
}

function useCountAnimation(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) {
      setCurrent(0)
      return
    }

    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return current
}

function AnimatedCard({
  label,
  value,
  color,
  icon,
  isLoading
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
  isLoading: boolean
}) {
  const animatedValue = useCountAnimation(isLoading ? 0 : value)

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg p-5 animate-pulse border border-gray-200 dark:border-dark-border">
        <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-dark-surface rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div
      className="bg-white dark:bg-dark-card rounded-lg p-5 border border-gray-200 dark:border-dark-border hover:border-verana-accent transition-all duration-200 hover:shadow-lg"
      style={{ borderLeftWidth: '3px', borderLeftColor: color }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
        {animatedValue.toLocaleString()}
      </div>
    </div>
  )
}

export default function EcosystemHeroCards({ metrics, isLoading }: EcosystemHeroCardsProps) {
  const cards = [
    {
      label: 'Participants',
      value: metrics?.participants ?? 0,
      color: '#9D2A6D',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Active Trust Registries',
      value: metrics?.active_trust_registries ?? 0,
      color: '#3b82f6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      label: 'Active Schemas',
      value: metrics?.active_schemas ?? 0,
      color: '#10b981',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      label: 'Credentials Issued',
      value: metrics?.issued ?? 0,
      color: '#8b5cf6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Credentials Verified',
      value: metrics?.verified ?? 0,
      color: '#f59e0b',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <AnimatedCard key={card.label} {...card} isLoading={isLoading} />
      ))}
    </div>
  )
}
