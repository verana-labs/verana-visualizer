'use client'

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface NetworkActivityChartProps {
  data: {
    timestamp: string
    transactions: number
    blockTime: number
    gasUsed: number
  }[]
  isLoading?: boolean
}

export default function NetworkActivityChart({ data, isLoading }: NetworkActivityChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse">Loading chart data...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Network Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transactions, block time, and gas usage over time</p>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
            tickFormatter={(value) => `${value.toFixed(1)}s`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Block Time') {
                return [`${value.toFixed(2)}s`, name]
              }
              return [value.toLocaleString(), name]
            }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar 
            yAxisId="left"
            dataKey="transactions" 
            fill="#3b82f6"
            name="Transactions"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            yAxisId="left"
            dataKey="gasUsed" 
            fill="#8b5cf6"
            name="Gas Used"
            radius={[4, 4, 0, 0]}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="blockTime" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
            name="Block Time"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

