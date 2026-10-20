export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  return document.createElement('canvas').getContext('webgl2') !== null
}
