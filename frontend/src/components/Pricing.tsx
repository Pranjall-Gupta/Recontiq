import Button from './Button'
import SectionTitle from './SectionTitle'
import { Check } from 'lucide-react'

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '₹9,999',
      period: 'month',
      sub: 'Ideal for small retail enterprises seeking simple GSTR-2B automation.',
      features: [
        'Up to 1,000 invoices auto-matched/mo',
        'Basic GSTR-2B automated reconciliation',
        'Real-time 0–100 risk scoring index',
        'Manual Excel invoice export support',
        'Standard email and help center support',
      ],
      cta: 'Get Started Now',
      popular: false,
    },
    {
      name: 'Growth',
      price: '₹49,999',
      period: 'month',
      sub: 'Perfect for medium businesses looking to maximize ITC and catch fraud rings.',
      features: [
        'Up to 10,000 invoices auto-matched/mo',
        'All 5 AI Solution Layers integrated',
        'Postgres PGVector semantic matching',
        'Automated notice drafts with local Ollama',
        'Dynamic GSTR-3B liability offset simulator',
        'Dedicated chat & priority email support',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'quote',
      sub: 'Engineered for CA firms and large enterprises requiring on-premise sovereignty.',
      features: [
        'Unlimited monthly matching throughput',
        'On-Premise deployment (Docker containerized)',
        'Custom India-specific ML models tuning',
        'Complete data sovereignty guarantees',
        'Dedicated compliance manager support',
        '24/7 priority enterprise phone SLA',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          title="Transparent, Scalable Pricing"
          subtitle="Choose the plan that fits your business compliance requirements. All plans include direct dashboard access and dynamic GSTR-3B tax simulations."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-[2rem] bg-white p-8 shadow-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                p.popular
                  ? 'border-brand-600 bg-gradient-to-br from-brand-50 to-white'
                  : 'border-transparent'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.sub}</p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  {p.price}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  /{p.period}
                </span>
              </div>

              <ul className="mt-8 space-y-4 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Button
                  href="/dashboard"
                  variant={p.popular ? 'primary' : 'dark'}
                  className="w-full text-center"
                >
                  {p.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
