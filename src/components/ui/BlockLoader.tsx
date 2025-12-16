'use client'

interface BlockLoaderProps {
  isLoading: boolean
  message?: string
}

export default function BlockLoader({ isLoading, message = "Loading network data..." }: BlockLoaderProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md mx-4">
        <div className="flex justify-center space-x-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 bg-verana-accent rounded-sm"
              style={{
                animation: `blockPulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {message}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please wait while we fetch the latest data...
          </p>
        </div>

        <div className="mt-6 w-full bg-gray-200 dark:bg-dark-surface rounded-full h-2">
          <div className="bg-verana-accent h-2 rounded-full animate-pulse" style={{
            width: '100%',
            animation: 'progress 2s ease-in-out infinite'
          }} />
        </div>

        <style jsx>{`
          @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          
          @keyframes blockPulse {
            0%, 100% { 
              transform: scale(1) translateY(0);
              opacity: 0.7;
            }
            50% { 
              transform: scale(1.2) translateY(-4px);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
