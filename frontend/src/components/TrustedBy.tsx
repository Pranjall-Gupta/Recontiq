import { trustedLogos } from '../data/content'

export default function TrustedBy() {
  return (
    <section className="border-y border-slate-100 bg-white py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
          Trusted by Leading Organisations in India
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
          {trustedLogos.map((name) => (
            <span
              key={name}
              className="text-lg font-bold tracking-tight text-slate-300 transition hover:text-slate-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
