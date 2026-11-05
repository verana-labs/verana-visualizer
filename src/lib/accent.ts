const ACCENTS: Record<string, string> = { devnet: '#f59e0b', testnet: '#9F7AEA' }
const DEFAULT_ACCENT = '#9F7AEA'

export function accentFor(chainName: string): string {
  return ACCENTS[chainName.toLowerCase()] ?? DEFAULT_ACCENT
}
