import { topFeatures } from '../data/content'
import Button from './Button'
import FeatureIcon from './FeatureIcon'
import SectionTitle from './SectionTitle'

export default function TopFeatures() {
  return (
    <section id="features" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          title="Smarter GST Reconciliation Starts Here"
          subtitle="Built for modern finance teams, GSTMatch combines powerful AI with intuitive design for effortless GSTR-2B compliance."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {topFeatures.map((f) => (
            <article key={f.title} className="card-cream flex flex-col p-8 md:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm">
                <FeatureIcon name={f.icon} />
              </span>
              <h3 className="mt-6 text-xl font-bold text-slate-900">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
              <div className="mt-8">
                <Button href="/dashboard" size="sm">
                  Get Started
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
