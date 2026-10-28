import type { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-3 py-2 text-xs font-medium hover:bg-[color-mix(in_srgb,var(--accent)_32%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  )
}
