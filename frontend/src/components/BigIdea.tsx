import Button from './Button'
import { CheckCircle2 } from 'lucide-react'

const checks = [
  ['Smart Invoice Matching', 'Risk Scoring'],
  ['Fraud Detection', 'ITC Optimization'],
  ['Agentic Automation', 'GSTR-2B Sync'],
]

export default function BigIdea() {
  return (
    <section id="about" className="bg-white py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="relative order-2 lg:order-1">
          <div className="rounded-[2rem] bg-gradient-to-br from-brand-100 via-brand-200 to-brand-300 p-6 md:p-8 grid gap-6">
            <div className="rounded-2xl bg-white p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">ITC Recovery Overview</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">276K</span>
                <span className="text-sm font-medium text-red-500">↓ 81</span>
              </div>
              <div className="mt-6 flex h-40 items-end gap-3">
                {[60, 52, 68, 38].map((h, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-xs font-medium text-slate-500">{[980, 850, 1022, 560][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ml-auto w-full max-w-[88%] rounded-2xl bg-white p-5 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Match Rate</p>
                <div className="mt-2 font-semibold text-slate-700">Automated Sync</div>
              </div>
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="12"
                    strokeDasharray="188 251"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center text-lg font-bold">
                  76%
                  <small className="text-[10px] font-medium text-brand-600">↑ 11%</small>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="text-3xl font-bold leading-tight text-slate-900 md:text-[2.5rem]">
            Track GSTR-2B Matching With Complete Precision
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Monitor invoice mismatches, ITC recovery, risk scores, and vendor follow-ups with fully automated
            accuracy across every filing period.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {checks.flat().map((c) => (
              <li key={c} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
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
