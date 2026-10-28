export function writeOpacity(element: HTMLElement | null | undefined, opacity: number) {
  if (!element) return
  const next = String(Math.round(opacity * 100) / 100)
  if (element.style.opacity !== next) element.style.opacity = next
}
