export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  const probe = document.createElement('canvas').getContext('webgl2')
  if (probe === null) return false
  probe.getExtension?.('WEBGL_lose_context')?.loseContext()
  return true
}
