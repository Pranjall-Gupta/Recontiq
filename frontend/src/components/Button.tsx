import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'dark' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export default function Button({
  children,
  href = '#cta',
  variant = 'dark',
  size = 'md',
  className = '',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition hover:opacity-90'
  const variants = {
    dark: 'bg-slate-900 text-white',
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
  }

  return (
    <a href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-200 text-slate-900">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M3 7h8M8 4l3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  )
}
