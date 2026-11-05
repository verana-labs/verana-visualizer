import { redirect } from 'next/navigation'
import { permalinkFor } from '@/lib/legacy-redirects'

export default async function PermalinkPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  redirect(permalinkFor(kind, id))
}
