type Props = {
  title: string
  subtitle?: string
  className?: string
}

export default function SectionTitle({ title, subtitle, className = '' }: Props) {
  return (
    <div className={`mx-auto max-w-3xl text-center ${className}`}>
      <h2 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-slate-600 sm:text-lg">{subtitle}</p>}
    </div>
  )
}
