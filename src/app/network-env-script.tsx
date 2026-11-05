import { unstable_noStore } from 'next/cache'
import { EnvScript } from 'next-runtime-env'
import { NETWORK_ENV_NAMES } from '@/lib/env'

type EnvSource = Record<string, string | undefined>

export function publicNetworkEnv(source: EnvSource): Record<string, string> {
  const published: Record<string, string> = {}
  for (const name of NETWORK_ENV_NAMES) {
    const value = source[name]
    if (value !== undefined) published[name] = value
  }
  return published
}

export function NetworkEnvScript() {
  unstable_noStore()
  return <EnvScript env={publicNetworkEnv(process.env)} disableNextScript />
}
