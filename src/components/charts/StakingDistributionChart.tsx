'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface StakingDistributionChartProps {
  data: {
    name: string
    value: number
  }[]
  isLoading?: boolean
}

const COLORS = {
  bonded: '#10b981',
  unbonded: '#f59e0b',
  notBonded: '#6b7280'
}

export default function StakingDistributionChart({ data, isLoading }: StakingDistributionChartProps) {
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

  const getColor = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('bonded') && !lowerName.includes('not')) return COLORS.bonded
    if (lowerName.includes('unbonded')) return COLORS.unbonded
    return COLORS.notBonded
  }

  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)
    return `${entry.name}: ${percent}%`
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Staking Distribution</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Distribution of bonded vs unbonded tokens</p>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColor(entry.name)}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M VNA`, '']}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

