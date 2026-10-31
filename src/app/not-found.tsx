import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center text-[13px]">
        <h1 className="text-[15px] font-semibold">This page is not in the observatory</h1>
        <p className="text-scene-mut">The link may be outdated, or the entity no longer exists.</p>
        <Link href="/" className="inline-block text-xs font-medium underline underline-offset-4">
          Back to the observatory
        </Link>
      </div>
    </main>
  )
}
