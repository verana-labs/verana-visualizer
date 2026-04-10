'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { EcosystemMetricsDataPoint } from '@/types'

interface EcosystemGrowthChartProps {
  data: EcosystemMetricsDataPoint[]
  isLoading: boolean
}

export default function EcosystemGrowthChart({ data, isLoading }: EcosystemGrowthChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading chart data...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No historical data available</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">SSI Entities Growth</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Trust registries, schemas, and participants over time
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorSchemas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorParticipants" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9D2A6D" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#9D2A6D" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="activeSchemas"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorSchemas)"
            name="Active Schemas"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="activeTrustRegistries"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorTR)"
            name="Trust Registries"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="participants"
            stroke="#9D2A6D"
            fillOpacity={1}
            fill="url(#colorParticipants)"
            name="Participants"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
