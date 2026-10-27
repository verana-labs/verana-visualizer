import { UVNA_PER_VNA } from '@/domain/economics'
import type { CredentialSchema } from '@/lib/api/schemas'

const plain = (value: number, digits = 4) =>
  (Object.is(value, -0) ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: digits })

export function signed(value: number, digits = 4): string {
  const rounded = Number(value.toFixed(digits))
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${plain(rounded, digits)}` : plain(rounded, digits)
}

export const amount = (value: number, digits = 4) => plain(Number(value.toFixed(digits)), digits)

export const vnaFromUvna = (uvna: number) => `${plain(uvna / UVNA_PER_VNA, 6)} VNA`

export const percent = (rate: number) => `${plain(rate * 100, 4)}%`

export function priced(value: number | string, schema: CredentialSchema | null | undefined): string {
  const n = Number(value)
  if (schema?.pricing_asset_type === 'TU') return `${amount(n)} TU`
  if (schema?.pricing_asset_type === 'COIN' && schema.pricing_asset === 'uvna') return vnaFromUvna(n)
  return `${amount(n)} ${schema?.pricing_asset ?? schema?.pricing_asset_type ?? ''}`.trim()
}
