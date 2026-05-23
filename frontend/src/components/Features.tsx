import { features } from '../data/content'
import Button from './Button'
import FeatureIcon from './FeatureIcon'
import SectionTitle from './SectionTitle'

export default function Features() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          title="5 Core AI Features"
          subtitle="The big idea: software that doesn't just match invoices — it thinks, predicts, and acts."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`card-cream flex flex-col p-8 ${i >= 3 ? 'lg:col-span-1' : ''} ${i === 3 ? 'sm:col-start-1 lg:col-start-auto' : ''}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white">
                <FeatureIcon name={f.icon} />
              </span>
              <h3 className="mt-6 text-lg font-bold text-slate-900">{f.title}</h3>
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
