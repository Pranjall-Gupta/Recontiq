type Props = { name: string; className?: string }

export default function FeatureIcon({ name, className = '' }: Props) {
  const cn = `h-5 w-5 ${className}`
  switch (name) {
    case 'link':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="12" r="4" />
          <circle cx="16" cy="12" r="4" />
          <path d="M12 8v8" />
        </svg>
      )
    case 'shield':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'graph':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="M12 7v4M7 17l5-6 5 6" />
        </svg>
      )
    case 'chart':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <rect x="7" y="10" width="3" height="8" />
          <rect x="12" y="6" width="3" height="12" />
          <rect x="17" y="13" width="3" height="5" />
        </svg>
      )
    default:
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
        </svg>
      )
  }
}
