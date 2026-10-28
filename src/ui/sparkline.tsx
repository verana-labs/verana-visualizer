interface SparklineProps {
  values: readonly number[]
  width?: number
  height?: number
  color?: string
  drawIn?: boolean
}

export function Sparkline({
  values,
  width = 96,
  height = 24,
  color = 'var(--accent)',
  drawIn = false,
}: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * (height - 2) - 1}`)
    .join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        pathLength={drawIn ? 1 : undefined}
        className={drawIn ? 'spark-draw' : undefined}
      />
    </svg>
  )
}
