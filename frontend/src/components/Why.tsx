import Button from './Button'
import FeatureIcon from './FeatureIcon'

const metrics = [
  { num: '10K+', label: 'Invoices auto-matched monthly' },
  { num: '0–100', label: 'Risk score on every mismatch' },
  { num: '₹50K Cr', label: 'Fake claims caught industry-wide' },
  { num: '7,590+', label: 'Happy finance teams' },
]

export default function Why() {
  return (
    <section className="bg-cream/50 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="relative">
          <div className="why-photo min-h-[300px] rounded-[1.5rem] shadow-lg md:min-h-[360px]" role="img" aria-label="Business team" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white">
                <FeatureIcon name="link" />
              </span>
              <h4 className="mt-3 font-bold text-slate-900">Smart Matching</h4>
              <p className="mt-1 text-sm text-slate-600">Embeddings understand vendor names beyond exact text.</p>
            </article>
            <article className="rounded-2xl bg-white p-5 shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white">
                <FeatureIcon name="bot" />
              </span>
              <h4 className="mt-3 font-bold text-slate-900">Agentic Automation</h4>
              <p className="mt-1 text-sm text-slate-600">Emails, follow-ups, and escalations on autopilot.</p>
            </article>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 md:text-[2.5rem]">
            Why Your Business Needs This Platform
          </h2>
          <p className="mt-5 leading-relaxed text-slate-600">
            Stop wasting time on manual GSTR-2B processes. Get automated workflows, real-time ITC insights, and
            scalable compliance control.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 p-6"
              >
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{m.num}</span>
                <p className="mt-2 text-xs font-medium leading-snug text-slate-600">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button href="/dashboard" size="lg">
              Get Started For Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
