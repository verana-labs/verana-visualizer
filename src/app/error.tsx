'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { Button } from '@/ui/button'

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logger.error('The observatory crashed', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div role="alert" className="max-w-md space-y-3 text-center text-[13px]">
        <h1 className="text-[15px] font-semibold">The observatory stopped working</h1>
        <p className="break-words text-scene-mut">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
