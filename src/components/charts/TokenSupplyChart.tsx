'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { convertUvnaToVna } from '@/lib/api'

interface TokenSupplyChartProps {
  data: {
    timestamp: string
    supply: number
    bonded: number
    unbonded: number
  }[]
  isLoading?: boolean
}

export default function TokenSupplyChart({ data, isLoading }: TokenSupplyChartProps) {
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Token Supply Trend</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total supply, bonded, and unbonded tokens over time</p>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorBonded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorUnbonded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
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
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M VNA`, '']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area 
            type="monotone" 
            dataKey="supply" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorSupply)"
            name="Total Supply"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="bonded" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorBonded)"
            name="Bonded"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="unbonded" 
            stroke="#f59e0b" 
            fillOpacity={1} 
            fill="url(#colorUnbonded)"
            name="Unbonded"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

