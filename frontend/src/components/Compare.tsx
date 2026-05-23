import { afterItems, beforeItems } from '../data/content'
import SectionTitle from './SectionTitle'

function ListItem({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
          positive ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {positive ? '✓' : '×'}
      </span>
      {text}
    </li>
  )
}

export default function Compare() {
  return (
    <section id="compare" className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          title="Why Choose GSTMatch?"
          subtitle="Built for modern businesses in India. GSTMatch combines powerful AI automation with intuitive design for effortless GST compliance."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-10">
            <span className="inline-block rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              Before
            </span>
            <p className="mt-2 text-sm font-medium text-slate-500">Other platforms / manual process</p>
            <ul className="mt-8 space-y-4">
              {beforeItems.map((item) => (
                <ListItem key={item} text={item} />
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 md:p-10">
            <span className="inline-block rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              After
            </span>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-brand-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-[10px] text-white">
                GM
              </span>
              GSTMatch AI
            </p>
            <ul className="mt-8 space-y-4">
              {afterItems.map((item) => (
                <ListItem key={item} text={item} positive />
              ))}
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-slate-600">
          Over <strong className="text-slate-900">₹50,000 crore</strong> in fake claims have already been caught
          using AI tools — manual matching is no longer enough.
        </p>
      </div>
    </section>
  )
}
