import { insights } from '../data/content'
import SectionTitle from './SectionTitle'

export default function Insights() {
  return (
    <section id="insights" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="GST Insights & Expert Tips" />

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {insights.map((item) => (
            <article key={item.title} className="group">
              <div
                className={`${item.imageClass} min-h-[220px] rounded-2xl transition group-hover:opacity-95`}
                role="img"
                aria-hidden
              />
              <span className="mt-5 inline-block rounded-full bg-cream px-3 py-1 text-xs font-medium text-slate-700">
                {item.tag}
              </span>
              <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
