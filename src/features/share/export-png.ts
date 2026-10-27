interface PngStamp {
  chainId: string
  blockHeight: number
  at: string
  source: string
}

const STAMP_BG = 'rgba(5, 4, 10, 0.72)'
const STAMP_FG = '#e9e7f5'

function utcMinute(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) throw new Error(`PNG stamp: "${iso}" is not a valid timestamp`)
  return `${at.toISOString().slice(0, 10)} ${at.toISOString().slice(11, 16)} UTC`
}

export function stampText(stamp: PngStamp): string {
  return [stamp.chainId, `block ${stamp.blockHeight.toLocaleString('en-US')}`, utcMinute(stamp.at), stamp.source].join(
    ' · '
  )
}

export const pngFileName = (stamp: Pick<PngStamp, 'chainId' | 'blockHeight'>) =>
  `verana-${stamp.chainId}-block-${stamp.blockHeight}.png`

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const type = /^data:([^;]+)/.exec(head)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type })
}

export function exportPng(canvas: HTMLCanvasElement, stamp: PngStamp): Blob {
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('PNG export: the browser gave no 2D canvas context')
  ctx.drawImage(canvas, 0, 0)
  const text = stampText(stamp)
  const size = Math.max(12, Math.round(out.height / 60))
  const pad = Math.round(size * 0.8)
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  const width = ctx.measureText(text).width + pad * 2
  const height = size + pad * 1.4
  const y = out.height - height - pad
  ctx.fillStyle = STAMP_BG
  ctx.fillRect(pad, y, width, height)
  ctx.fillStyle = STAMP_FG
  ctx.fillText(text, pad * 2, y + height / 2)
  return dataUrlToBlob(out.toDataURL('image/png'))
}
