'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CommitActivityChartProps {
  data: {
    week: string
    commits: number
  }[]
  repoName: string
  isLoading?: boolean
}

export default function CommitActivityChart({ data, repoName, isLoading }: CommitActivityChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading chart data...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Commit Activity
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Last 12 weeks of commits
          </p>
        </div>
        <div className="h-60 flex items-center justify-center bg-gray-100 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No commits in last 30 days</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This repository has no recent activity</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Commit Activity
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Last 12 weeks of commits
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="week" 
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            stroke="#4b5563"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            stroke="#4b5563"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6',
              fontSize: '12px'
            }}
            formatter={(value: number) => [value, 'Commits']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="commits" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 5 }}
            name="Commits"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

