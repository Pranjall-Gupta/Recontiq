import { dualHighlights } from '../data/content'
import FeatureIcon from './FeatureIcon'

export default function DualHighlight() {
  return (
    <section className="bg-white pb-20 md:pb-28">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        {dualHighlights.map((item) => (
          <article key={item.title} className="card-cream flex gap-5 p-8 md:p-10">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
              <FeatureIcon name={item.icon} className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
