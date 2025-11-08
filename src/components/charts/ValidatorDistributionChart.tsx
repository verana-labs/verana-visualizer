'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface ValidatorDistributionChartProps {
  data: {
    name: string
    votingPower: number
    commission: number
  }[]
  isLoading?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function ValidatorDistributionChart({ data, isLoading }: ValidatorDistributionChartProps) {
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

  // Sort by voting power and take top 10
  const topValidators = [...data]
    .sort((a, b) => b.votingPower - a.votingPower)
    .slice(0, 10)
    .map(v => ({
      ...v,
      name: v.name.length > 20 ? v.name.substring(0, 20) + '...' : v.name
    }))

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top Validators by Stake</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total staked tokens delegated to top validators</p>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={topValidators} 
          margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            stroke="#4b5563"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            width={80}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            stroke="#4b5563"
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            label={{ 
              value: 'Staked Tokens (VNA)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: '#9ca3af', fontSize: 12 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Total Stake') {
                return [`${(value / 1000000).toFixed(2)}M VNA`, name]
              }
              return [`${(value * 100).toFixed(2)}%`, name]
            }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
            formatter={(value) => <span className="text-gray-600 dark:text-gray-300">{value}</span>}
          />
          <Bar 
            dataKey="votingPower" 
            name="Total Stake"
            radius={[8, 8, 0, 0]}
          >
            {topValidators.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

