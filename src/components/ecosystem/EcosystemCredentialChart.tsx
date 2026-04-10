'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { EcosystemMetricsDataPoint } from '@/types'

interface EcosystemCredentialChartProps {
  data: EcosystemMetricsDataPoint[]
  isLoading: boolean
}

export default function EcosystemCredentialChart({ data, isLoading }: EcosystemCredentialChartProps) {
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
        <p className="text-gray-500 dark:text-gray-400">No credential activity data available</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Credential Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Credentials issued and verified over time
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
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
            allowDecimals={false}
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
            dataKey="issued"
            stroke="#8b5cf6"
            fillOpacity={1}
            fill="url(#colorIssued)"
            name="Issued"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="verified"
            stroke="#f59e0b"
            fillOpacity={1}
            fill="url(#colorVerified)"
            name="Verified"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
