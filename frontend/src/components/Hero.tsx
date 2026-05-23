import Preview from './Preview'

export default function Hero() {
  return (
    <section className="hero-waves overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-4 text-center sm:px-6 md:pt-36 lg:px-8">
        <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white shadow-xl backdrop-blur-md">
          <span className="flex -space-x-2" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="inline-block h-8 w-8 rounded-full border-2 border-white/20 bg-gradient-to-br from-brand-300 to-brand-500"
              />
            ))}
          </span>
          Join GSTMatch for Early Access
        </div>

        <h1 className="mx-auto max-w-5xl text-[2.5rem] font-[800] leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-6xl md:text-7xl">
          AI-Powered GST Matching That Grows With You
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg font-light leading-relaxed text-slate-100 drop-shadow-md sm:text-xl">
          Scalable reconciliation tools that automatically adapt to your business — seamlessly supporting
          your journey from startup invoices to enterprise GSTR-2B compliance and beyond.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <a
            href="/dashboard"
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-bold text-slate-900 shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            Get Started For Free
            <svg className="h-4 w-4 text-brand-600 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-sm font-medium text-white/80 drop-shadow-sm">No credit card required</p>
        </div>
      </div>

      <Preview embedded />
    </section>
  )
}
