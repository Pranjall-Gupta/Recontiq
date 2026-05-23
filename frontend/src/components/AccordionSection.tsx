import { useState } from 'react'
import { accordionItems } from '../data/content'
import Button from './Button'

export default function AccordionSection() {
  const [active, setActive] = useState(0)

  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 md:text-[2.5rem]">
            Unlock the Potential of AI-Driven GST Compliance
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Transform traditional GSTR-2B matching with advanced AI automation, real-time risk analytics, and
            seamless vendor follow-ups.
          </p>

          <ul className="mt-10">
            {accordionItems.map((item, i) => (
              <li key={item.title} className="border-b border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-5 text-left"
                  onClick={() => setActive(i)}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm text-brand-700">
                    ◎
                  </span>
                  <span className={`text-base font-semibold ${active === i ? 'text-slate-900' : 'text-slate-500'}`}>
                    {item.title}
                  </span>
                </button>
                {active === i && (
                  <p className="pb-5 pl-11 text-sm leading-relaxed text-slate-600">{item.body}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button href="#cta" size="lg">
              Get Started For Free
            </Button>
          </div>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-brand-100 to-brand-200 p-6 md:p-8">
          <div className="rounded-2xl bg-white p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-500">Mismatch Trends</p>
            <svg viewBox="0 0 280 100" className="mt-4 w-full" aria-hidden>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 80 L40 60 L80 70 L120 40 L160 50 L200 25 L240 35 L280 15 L280 100 L0 100 Z"
                fill="url(#fill)"
              />
              <path
                d="M0 80 L40 60 L80 70 L120 40 L160 50 L200 25 L240 35 L280 15"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <div className="relative -mt-6 ml-8 rounded-2xl bg-white p-5 shadow-lg">
            <p className="text-xs font-semibold text-slate-500">High-Risk Vendors</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Shell Co. A', 'Ring Node B', 'GSTIN X99'].map((t) => (
                <span key={t} className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold">7.9K</span>
              <span className="text-sm font-semibold text-brand-600">↑ flagged</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
